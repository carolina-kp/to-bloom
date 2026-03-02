// Generates PWA icons for bloom. app
// Run: node generate-icons.mjs

import { writeFileSync } from 'fs'
import { deflateSync } from 'zlib'

// CRC32 lookup table
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const byte of buf) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])))
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
}

function makePNG(w, h, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB color type (no alpha needed)

  const rows = []
  for (let y = 0; y < h; y++) {
    rows.push(0) // filter byte: None
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixelFn(x, y, w, h)
      rows.push(r, g, b)
    }
  }

  const compressed = deflateSync(Buffer.from(rows), { level: 6 })

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// bloom. color palette
// --cream: #fdf8f2 = (253, 248, 242)
// --pink:  #f5c6c6 = (245, 198, 198)
// --pink-deep: #e8a0a0 = (232, 160, 160)
// --lavender: #d8c6e8 = (216, 198, 232)

function bloomPixel(x, y, w, h) {
  const cx = w / 2
  const cy = h / 2
  const maxR = w / 2

  // Soft radial gradient: cream center → pink edge
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxR
  const t = Math.min(1, dist * 1.05)

  // Cream (253, 248, 242) → pink-deep (232, 160, 160)
  const r = Math.round(253 + (232 - 253) * t * t)
  const g = Math.round(248 + (160 - 248) * t * t)
  const b = Math.round(242 + (160 - 242) * t * t)

  // Six-petal flower overlay
  const petalDist = w * 0.30
  const petalR = w * 0.22
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    const px = cx + Math.cos(angle) * petalDist * 0.55
    const py = cy + Math.sin(angle) * petalDist * 0.55
    const d = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
    if (d < petalR) {
      // Petal blend
      const blend = Math.max(0, 1 - d / petalR)
      const pr = Math.round(r + (245 - r) * blend * 0.6)
      const pg = Math.round(g + (198 - g) * blend * 0.6)
      const pb = Math.round(b + (198 - b) * blend * 0.6)
      return [pr, pg, pb]
    }
  }

  // Center dot
  const centerD = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxR
  if (centerD < 0.18) {
    const blend = Math.max(0, 1 - centerD / 0.18)
    return [
      Math.round(r + (232 - r) * blend),
      Math.round(g + (160 - g) * blend),
      Math.round(b + (160 - b) * blend),
    ]
  }

  return [r, g, b]
}

// Generate icons
console.log('Generating bloom. PWA icons...')

writeFileSync('public/icon-192.png', makePNG(192, 192, bloomPixel))
console.log('  ✓ public/icon-192.png')

writeFileSync('public/icon-512.png', makePNG(512, 512, bloomPixel))
console.log('  ✓ public/icon-512.png')

writeFileSync('public/apple-touch-icon.png', makePNG(180, 180, bloomPixel))
console.log('  ✓ public/apple-touch-icon.png')

// Favicon: 16×16 PNG wrapped in a minimal ICO container
const fav16 = makePNG(16, 16, bloomPixel)
const icoHeader = Buffer.alloc(6)
icoHeader.writeUInt16LE(0, 0)  // reserved
icoHeader.writeUInt16LE(1, 2)  // type: 1 = icon
icoHeader.writeUInt16LE(1, 4)  // image count: 1

const icoEntry = Buffer.alloc(16)
icoEntry[0] = 16    // width
icoEntry[1] = 16    // height
icoEntry[2] = 0     // color count (0 = > 256)
icoEntry[3] = 0     // reserved
icoEntry.writeUInt16LE(1, 4)              // color planes
icoEntry.writeUInt16LE(32, 6)             // bits per pixel
icoEntry.writeUInt32LE(fav16.length, 8)   // size of image data
icoEntry.writeUInt32LE(22, 12)            // offset of image data (6 + 16)

writeFileSync('public/favicon.ico', Buffer.concat([icoHeader, icoEntry, fav16]))
console.log('  ✓ public/favicon.ico')

console.log('\nAll icons generated!')
