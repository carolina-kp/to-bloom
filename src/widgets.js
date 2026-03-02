import { fmtDate } from './db.js'

// ── QUOTES ───────────────────────────────────────────────────────
const QUOTES = [
  ["The unexamined life is not worth living.", "Socrates"],
  ["We are what we repeatedly do. Excellence is not an act, but a habit.", "Aristotle"],
  ["The beginning is the most important part of the work.", "Plato"],
  ["You have power over your mind, not outside events.", "Marcus Aurelius"],
  ["It's not what happens to you, but how you react that matters.", "Epictetus"],
  ["Luck is what happens when preparation meets opportunity.", "Seneca"],
  ["He who has a why to live can bear almost any how.", "Nietzsche"],
  ["The heart has its reasons which reason knows nothing of.", "Pascal"],
  ["Life can only be understood backwards; but it must be lived forwards.", "Kierkegaard"],
  ["In the midst of winter, I found there was within me an invincible summer.", "Camus"],
  ["The limits of my language mean the limits of my world.", "Wittgenstein"],
  ["To be yourself in a world that constantly tries to make you something else is the greatest accomplishment.", "Emerson"],
  ["It does not matter how slowly you go, as long as you do not stop.", "Confucius"],
  ["The journey of a thousand miles begins with one step.", "Lao Tzu"],
  ["Knowledge is power.", "Francis Bacon"],
  ["I think, therefore I am.", "Descartes"],
  ["The greatest thing in the world is to know how to belong to oneself.", "Montaigne"],
  ["Talent hits a target no one else can hit; Genius hits a target no one else can see.", "Schopenhauer"],
  ["Nothing great in the world was accomplished without passion.", "Hegel"],
  ["It is better to be Socrates dissatisfied than a fool satisfied.", "J.S. Mill"],
  ["Act as if what you do makes a difference. It does.", "William James"],
  ["We do not learn from experience — we learn from reflecting on experience.", "John Dewey"],
  ["Go confidently in the direction of your dreams.", "Thoreau"],
  ["All that we are is the result of what we have thought.", "Buddha"],
  ["Education is not the filling of a pail, but the lighting of a fire.", "W.B. Yeats"],
  ["The only way to do great work is to love what you do.", "Steve Jobs"],
  ["If you want to lift yourself up, lift up someone else.", "Booker T. Washington"],
  ["The mind is not a vessel to be filled but a fire to be kindled.", "Plutarch"],
  ["Judge a man by his questions rather than his answers.", "Voltaire"],
  ["The world of reality has its limits; the world of imagination is boundless.", "Rousseau"],
  ["Existence precedes essence.", "Sartre"],
  ["Do not go where the path may lead — go instead where there is no path and leave a trail.", "Emerson"],
  ["The purpose of life is not to be happy. It is to be useful.", "Emerson"],
  ["To know what you know and what you do not know — that is true knowledge.", "Confucius"],
  ["By three methods we may learn wisdom: reflection, imitation, and experience.", "Confucius"],
  ["Real knowledge is to know the extent of one's ignorance.", "Confucius"],
  ["Difficulties strengthen the mind as labour does the body.", "Seneca"],
  ["If you want peace, prepare yourself.", "Seneca"],
  ["We suffer more in imagination than in reality.", "Seneca"],
  ["The impediment to action advances action. What stands in the way becomes the way.", "Marcus Aurelius"],
  ["Waste no more time arguing what a good person should be. Be one.", "Marcus Aurelius"],
  ["Very little is needed to make a happy life; it is within yourself.", "Marcus Aurelius"],
  ["He who learns but does not think is lost. He who thinks but does not learn is in danger.", "Confucius"],
  ["An unexamined life is not worth living.", "Socrates"],
  ["Wonder is the beginning of wisdom.", "Socrates"],
  ["The secret of change is to focus all energy on building the new, not fighting the old.", "Socrates"],
  ["Every artist was first an amateur.", "Emerson"],
  ["What you get by achieving your goals is not as important as what you become by achieving them.", "Thoreau"],
  ["Not all those who wander are lost.", "Tolkien"],
  ["A little knowledge is a dangerous thing. So is a lot.", "Albert Einstein"],
  ["Imagination is more important than knowledge.", "Albert Einstein"],
  ["Logic will get you from A to B. Imagination will take you everywhere.", "Albert Einstein"],
  ["In theory, theory and practice are the same. In practice, they are not.", "Yogi Berra"],
  ["Entities should not be multiplied beyond necessity.", "William of Ockham"],
  ["If I have seen further than others, it is by standing on the shoulders of giants.", "Isaac Newton"],
  ["To exist is to change; to change is to mature; to mature is to go on creating oneself endlessly.", "Henri Bergson"],
  ["The most courageous act is still to think for yourself.", "Coco Chanel"],
  ["Do not fear mistakes. There are none.", "Miles Davis"],
  ["A person who never made a mistake never tried anything new.", "Albert Einstein"],
  ["First, solve the problem. Then, write the code.", "John Johnson"],
  ["The mind that is anxious about the future is miserable.", "Seneca"],
  ["Begin at once to live, and count each day as a separate life.", "Seneca"],
  ["No man is free who is not master of himself.", "Epictetus"],
  ["Make the best use of what is in your power, and take the rest as it happens.", "Epictetus"],
  ["Progress is impossible without change.", "George Bernard Shaw"],
]

export function initQuote() {
  const day   = Math.floor(Date.now() / 86400000)
  const [text, author] = QUOTES[day % QUOTES.length]
  document.getElementById('quote-content').innerHTML =
    `<div class="quote-text">"${text}"</div><div class="quote-author">— ${author}</div>`
}

// ── WEATHER (Open-Meteo, free, no key) ──────────────────────────
const WMO = {
  0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',
  45:'Fog',48:'Depositing rime fog',
  51:'Light drizzle',53:'Moderate drizzle',55:'Dense drizzle',
  61:'Slight rain',63:'Moderate rain',65:'Heavy rain',
  71:'Slight snow',73:'Moderate snow',75:'Heavy snow',
  80:'Slight showers',81:'Moderate showers',82:'Violent showers',
  95:'Thunderstorm',99:'Thunderstorm with hail',
}
const WMO_ICON = {
  0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',
  51:'🌦',53:'🌧',55:'🌧',61:'🌧',63:'🌧',65:'🌧',
  71:'❄️',73:'❄️',75:'❄️',80:'🌦',81:'🌧',82:'⛈',
  95:'⛈',99:'⛈',
}

export async function initWeather() {
  const el = document.getElementById('weather-content')
  if (!navigator.geolocation) {
    el.innerHTML = '<div class="widget-loading">geolocation not available</div>'; return
  }
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      const { latitude: lat, longitude: lon } = pos.coords
      const [meteo, geo] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&timezone=auto`).then(r=>r.json()),
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`).then(r=>r.json()),
      ])
      const w    = meteo.current_weather
      const code = w.weathercode
      const icon = WMO_ICON[code] || '🌡'
      const desc = WMO[code]      || 'Unknown'
      const city = geo.address?.city || geo.address?.town || geo.address?.village || 'your location'
      el.innerHTML = `
        <div class="weather-main">
          <span class="weather-icon">${icon}</span>
          <div>
            <div class="weather-temp">${Math.round(w.temperature)}°C</div>
            <div class="weather-desc">${desc}</div>
          </div>
        </div>
        <div class="weather-loc">📍 ${city}</div>`
    } catch {
      el.innerHTML = '<div class="widget-loading">weather unavailable</div>'
    }
  }, () => { el.innerHTML = '<div class="widget-loading">location access denied</div>' })
}

// ── POMODORO ─────────────────────────────────────────────────────
let pomoState = {
  work: 25, short: 5, long: 15,
  current: 'work',   // 'work' | 'short' | 'long'
  remaining: 25 * 60,
  running: false,
  sessions: 0,
  interval: null,
}

const POMO_LABELS = { work:'Focus', short:'Short break', long:'Long break' }

export function initPomodoro() {
  renderPomo()
}

function renderPomo() {
  const el     = document.getElementById('pomodoro-content')
  const total  = pomoState[pomoState.current] * 60
  const rem    = pomoState.remaining
  const pct    = 1 - rem / total
  const r      = 48, cx = 60, cy = 60
  const circ   = 2 * Math.PI * r
  const dash   = circ * pct

  const mm = String(Math.floor(rem / 60)).padStart(2,'0')
  const ss = String(rem % 60).padStart(2,'0')

  const trackColor = pomoState.current === 'work'
    ? 'var(--pink)' : pomoState.current === 'short' ? 'var(--mint)' : 'var(--sky)'
  const ringColor  = pomoState.current === 'work'
    ? 'var(--pink-deep)' : pomoState.current === 'short' ? 'var(--mint-deep)' : 'var(--sky-deep)'

  el.innerHTML = `
    <div class="pomo-ring-wrap">
      <svg width="120" height="120" class="pomo-svg" viewBox="0 0 120 120">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${trackColor}" stroke-width="10"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ringColor}" stroke-width="10"
          stroke-dasharray="${circ}" stroke-dashoffset="${circ - dash}"
          stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
        <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-family="Playfair Display,serif"
          font-size="18" font-weight="600" fill="var(--text)">${mm}:${ss}</text>
        <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="9" fill="var(--text-light)"
          font-family="DM Sans,sans-serif">${POMO_LABELS[pomoState.current]}</text>
      </svg>
      <div class="pomo-btns">
        <button class="pomo-btn go" id="pomo-play">${pomoState.running ? '⏸ pause' : '▶ start'}</button>
        <button class="pomo-btn" id="pomo-reset">↺ reset</button>
      </div>
      <div class="pomo-sessions">🍅 ${pomoState.sessions} sessions completed</div>
    </div>`

  document.getElementById('pomo-play').addEventListener('click', togglePomo)
  document.getElementById('pomo-reset').addEventListener('click', resetPomo)
}

function togglePomo() {
  if (pomoState.running) {
    clearInterval(pomoState.interval)
    pomoState.running = false
  } else {
    pomoState.running = true
    pomoState.interval = setInterval(() => {
      pomoState.remaining--
      if (pomoState.remaining <= 0) {
        clearInterval(pomoState.interval)
        pomoState.running = false
        playPing()
        // Advance session
        if (pomoState.current === 'work') {
          pomoState.sessions++
          pomoState.current   = (pomoState.sessions % 4 === 0) ? 'long' : 'short'
          pomoState.remaining = pomoState[pomoState.current] * 60
        } else {
          pomoState.current   = 'work'
          pomoState.remaining = pomoState.work * 60
        }
      }
      renderPomo()
    }, 1000)
  }
  renderPomo()
}

function resetPomo() {
  clearInterval(pomoState.interval)
  pomoState.running   = false
  pomoState.current   = 'work'
  pomoState.remaining = pomoState.work * 60
  renderPomo()
}

export function updatePomoSettings(work, short, long_) {
  clearInterval(pomoState.interval)
  pomoState.work    = work
  pomoState.short   = short
  pomoState.long    = long_
  pomoState.running = false
  pomoState.current = 'work'
  pomoState.remaining = work * 60
  renderPomo()
}

export function getPomoSettings() {
  return { work: pomoState.work, short: pomoState.short, long: pomoState.long }
}

function playPing() {
  try {
    const ctx  = new AudioContext()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4)
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start()
    osc.stop(ctx.currentTime + 0.8)
  } catch {}
}

// ── WEEKLY PROGRESS ──────────────────────────────────────────────
export function renderProgress(tasks) {
  const el = document.getElementById('progress-content')
  if (!el) return

  const today = new Date()
  const days  = ['M','T','W','T','F','S','S']
  // get Mon of this week
  const dow   = today.getDay() === 0 ? 6 : today.getDay() - 1
  const mon   = new Date(today); mon.setDate(today.getDate() - dow); mon.setHours(0,0,0,0)

  const counts = Array.from({ length:7 }, (_, i) => {
    const d  = new Date(mon); d.setDate(mon.getDate() + i)
    const ds = fmtDate(d)
    return tasks.filter(t => t.done && t.due === ds).length
  })

  const max = Math.max(...counts, 1)
  // Streak: consecutive days ending today with ≥1 done
  let streak = 0
  for (let i = dow; i >= 0; i--) {
    if (counts[i] > 0) streak++
    else break
  }
  // Also check previous days
  if (counts[dow] > 0) {
    // already counted, check days before this week
    const prevDone = []
    for (let j = 1; j <= 30; j++) {
      const d  = new Date(today); d.setDate(today.getDate() - dow - j)
      const ds = fmtDate(d)
      const done = tasks.filter(t => t.done && t.due === ds).length
      if (done > 0) streak++
      else break
    }
  }

  const todayIdx = dow
  const barsHtml = counts.map((c, i) => {
    const h = Math.max(4, Math.round((c / max) * 52))
    return `<div class="progress-bar-wrap">
      <div class="progress-bar ${i===todayIdx?'today-bar':''}" style="height:${h}px" title="${c} done"></div>
      <div class="progress-bar-label">${days[i]}</div>
    </div>`
  }).join('')

  el.innerHTML = `
    <div class="progress-streak">
      streak: <strong>${streak} day${streak !== 1 ? 's' : ''} 🔥</strong>
    </div>
    <div class="progress-bars">${barsHtml}</div>`
}
