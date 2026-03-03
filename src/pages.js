import { db, genId, fmtDate, parseDate } from './db.js'

// ── Shared state (set by main.js) ────────────────────────────────
export const S = {
  tasks: [], courses: [], timetable: [], grades: [],
  budgetEntries: [], budgetGoals: [], resources: [], goals: [], wellness: [],
  weekOffset: 0, calMonth: new Date(), monthViewDate: new Date(),
  selectedCourse: 'all', taskView: 'day',
  budgetMonth: new Date(), selectedColor: '#f5c6c6',
  resCourse: 'all', resType: 'all', resRead: 'all',
  wellCalMonth: new Date(),
}

// ── Toast ─────────────────────────────────────────────────────────
let _notifTimer
export function notify(msg) {
  const el = document.getElementById('notif')
  document.getElementById('notif-text').textContent = msg
  el.classList.add('show')
  clearTimeout(_notifTimer)
  _notifTimer = setTimeout(() => el.classList.remove('show'), 2600)
}

// ── Sync indicator ───────────────────────────────────────────────
export function setSyncing(v) {
  document.getElementById('sync-bar').classList.toggle('visible', v)
  const dot = document.getElementById('sync-dot')
  if (dot) dot.className = 'sync-dot' + (v ? ' syncing' : '')
}

// ── Modal helpers ────────────────────────────────────────────────
export function openModal(id) {
  document.getElementById(id)?.classList.add('open')
}
export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open')
}

const COLORS = ['#f5c6c6','#c6daf5','#c6e8d8','#d8c6e8','#f5dcc6','#f5edc6','#e8c6d8','#c6e8e8']

function colorSwatches(containerId, selectedColor, onSelect) {
  const el = document.getElementById(containerId)
  if (!el) return
  el.innerHTML = COLORS.map(c =>
    `<div class="color-swatch${c===selectedColor?' selected':''}" style="background:${c}" data-c="${c}"></div>`
  ).join('')
  el.querySelectorAll('.color-swatch').forEach(s =>
    s.addEventListener('click', () => {
      el.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('selected'))
      s.classList.add('selected')
      onSelect(s.dataset.c)
    })
  )
}

// ── HOME ─────────────────────────────────────────────────────────
export function initHome() {
  // Clock
  function updateClock() {
    const now = new Date()
    const el = document.getElementById('home-date')
    if (el) el.textContent =
      now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' }) + ' · ' +
      now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
  }
  updateClock(); setInterval(updateClock, 30000)

  // Task input
  document.getElementById('task-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask()
  })
  document.getElementById('add-btn').addEventListener('click', addTask)

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      S.taskView = btn.dataset.view
      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'))
      document.getElementById('view-' + S.taskView).classList.add('active')
      renderTaskView()
    })
  )

  // Week nav
  document.getElementById('week-prev').addEventListener('click',  () => { S.weekOffset--; renderWeekView() })
  document.getElementById('week-next').addEventListener('click',  () => { S.weekOffset++; renderWeekView() })
  document.getElementById('week-today').addEventListener('click', () => { S.weekOffset = 0; renderWeekView() })

  // Month nav
  document.getElementById('month-prev').addEventListener('click', () => { S.monthViewDate.setMonth(S.monthViewDate.getMonth()-1); renderMonthView() })
  document.getElementById('month-next').addEventListener('click', () => { S.monthViewDate.setMonth(S.monthViewDate.getMonth()+1); renderMonthView() })

  // Calendar nav
  document.getElementById('cal-prev').addEventListener('click', () => { S.calMonth.setMonth(S.calMonth.getMonth()-1); renderMiniCal() })
  document.getElementById('cal-next').addEventListener('click', () => { S.calMonth.setMonth(S.calMonth.getMonth()+1); renderMiniCal() })

  // Course modal
  document.getElementById('add-course-btn').addEventListener('click', () => {
    S.selectedColor = COLORS[0]
    colorSwatches('course-color-swatches', S.selectedColor, c => { S.selectedColor = c })
    document.getElementById('course-name-input').value = ''
    openModal('course-modal')
  })
  document.getElementById('save-course-btn').addEventListener('click', addCourse)

  // Widget toggle
  document.getElementById('widget-toggle').addEventListener('click', () => {
    const grid = document.getElementById('widget-grid')
    const chev = document.getElementById('widget-chevron')
    grid.classList.toggle('open')
    chev.classList.toggle('up')
  })

  // Share
  document.getElementById('share-btn').addEventListener('click', () => {
    document.getElementById('share-link-text').textContent = window.location.href
    openModal('share-modal')
  })
  document.getElementById('copy-link-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {})
    notify('Link copied! 📋')
    closeModal('share-modal')
  })

  // due date default
  const dueFld = document.getElementById('task-due')
  if (dueFld && !dueFld.value) dueFld.value = fmtDate(new Date())

  // Install banner
  let deferredPrompt
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredPrompt = e
    document.getElementById('install-banner').classList.add('show')
  })
  document.getElementById('install-btn').addEventListener('click', async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    document.getElementById('install-banner').classList.remove('show')
  })
  document.getElementById('install-dismiss').addEventListener('click', () => {
    document.getElementById('install-banner').classList.remove('show')
  })
}

export function renderHome() {
  renderStats()
  renderCourseList()
  renderMiniCal()
  renderTaskView()
  renderGoalsWidget()
}

async function addTask() {
  const input = document.getElementById('task-input')
  const text  = input.value.trim()
  if (!text) return
  const btn = document.getElementById('add-btn')
  btn.disabled = true
  setSyncing(true)
  try {
    const obj = {
      id:       genId(),
      text,
      course:   document.getElementById('task-course').value || null,
      priority: document.getElementById('task-priority').value,
      due:      document.getElementById('task-due').value || fmtDate(new Date()),
      done:     false,
    }
    await db.tasks.add(obj)
    S.tasks.push(obj)
    input.value = ''
    document.getElementById('task-due').value = fmtDate(new Date())
    renderHome()
    notify('Task added 🌸')
  } catch(e) { notify('Error: ' + e.message) }
  setSyncing(false)
  btn.disabled = false
}

export async function toggleDone(id) {
  const t = S.tasks.find(t => t.id === id)
  if (!t) return
  setSyncing(true)
  await db.tasks.update(id, { done: !t.done })
  t.done = !t.done
  setSyncing(false)
  renderHome()
}

export async function deleteTask(id) {
  setSyncing(true)
  await db.tasks.delete(id)
  S.tasks = S.tasks.filter(t => t.id !== id)
  setSyncing(false)
  renderHome()
  notify('Task removed')
}

async function addCourse() {
  const name = document.getElementById('course-name-input').value.trim()
  if (!name) return
  setSyncing(true)
  const obj = { id: genId(), name, color: S.selectedColor }
  try {
    await db.courses.add(obj)
    S.courses.push(obj)
    closeModal('course-modal')
    renderHome()
    notify('Course added 🎓')
  } catch(e) { notify('Error: ' + e.message) }
  setSyncing(false)
}

export function renderCourseList() {
  const counts = {}
  S.tasks.forEach(t => { if (!t.done) counts[t.course] = (counts[t.course]||0)+1 })
  const all = S.tasks.filter(t => !t.done).length
  document.getElementById('course-list').innerHTML =
    `<div class="course-item${S.selectedCourse==='all'?' active-course':''}" data-cid="all">
      <div class="course-dot" style="background:#bbb"></div>
      <span class="course-name">all tasks</span><span class="course-count">${all}</span>
    </div>` +
    S.courses.map(c =>
      `<div class="course-item${S.selectedCourse===c.id?' active-course':''}" data-cid="${c.id}">
        <div class="course-dot" style="background:${c.color}"></div>
        <span class="course-name">${c.name}</span>
        <span class="course-count">${counts[c.id]||0}</span>
      </div>`
    ).join('')

  document.querySelectorAll('.course-item').forEach(el =>
    el.addEventListener('click', () => {
      S.selectedCourse = el.dataset.cid
      renderHome()
    })
  )
  // Populate task-course select
  const sel = document.getElementById('task-course')
  if (sel) sel.innerHTML = '<option value="">no course</option>' +
    S.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
}

function renderStats() {
  const today = fmtDate(new Date())
  const ws    = getWeekStart(new Date(), S.weekOffset)
  const we    = new Date(ws); we.setDate(we.getDate()+6)
  document.getElementById('stat-urgent').textContent = S.tasks.filter(t => t.priority==='urgent' && !t.done).length
  document.getElementById('stat-todo').textContent   = S.tasks.filter(t => !t.done).length
  document.getElementById('stat-done').textContent   = S.tasks.filter(t => t.done && t.due===today).length
  document.getElementById('stat-week').textContent   = S.tasks.filter(t => t.due && t.due>=fmtDate(ws) && t.due<=fmtDate(we)).length
}

function renderTaskView() {
  renderStats()
  if (S.taskView === 'day')   renderDayView()
  if (S.taskView === 'week')  renderWeekView()
  if (S.taskView === 'month') renderMonthView()
}

function filtered(list) {
  return S.selectedCourse === 'all' ? list : list.filter(t => t.course === S.selectedCourse)
}

function taskHTML(t, mini = false) {
  const course  = S.courses.find(c => c.id === t.course)
  const today   = fmtDate(new Date())
  const overdue = t.due && t.due < today && !t.done
  if (mini) {
    return `<div class="week-task-mini${t.done?' done':''}" style="background:${course?.color||'#eee'}"
      data-id="${t.id}" title="${t.text}">${t.text}</div>`
  }
  return `
    <div class="task-item ${t.priority}${t.done?' done':''}">
      <div class="task-check${t.done?' checked':''}" data-check="${t.id}">${t.done?'✓':''}</div>
      <div class="task-body">
        <div class="task-text">${t.text}</div>
        <div class="task-meta">
          ${course?`<span class="course-tag" style="background:${course.color}">${course.name}</span>`:''}
          <span class="priority-tag">${t.priority==='urgent'?'🔴 urgent':t.priority==='low'?'🟢 low':'🔵 normal'}</span>
          ${t.due?`<span class="due-tag${overdue?' overdue':''}">📅 ${overdue?'overdue: ':''}${formatDue(t.due)}</span>`:''}
        </div>
      </div>
      <div class="task-actions">
        <button class="action-btn del" data-del="${t.id}">✕</button>
      </div>
    </div>`
}

function bindTaskEvents(container) {
  container.querySelectorAll('[data-check]').forEach(el =>
    el.addEventListener('click', () => toggleDone(el.dataset.check)))
  container.querySelectorAll('[data-del]').forEach(el =>
    el.addEventListener('click', () => deleteTask(el.dataset.del)))
  container.querySelectorAll('[data-id]').forEach(el =>
    el.addEventListener('click', () => toggleDone(el.dataset.id)))
}

function renderDayView() {
  const today   = fmtDate(new Date())
  const all     = filtered(S.tasks.filter(t => t.due === today))
  all.sort((a,b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return ({urgent:0,normal:1,low:2}[a.priority]) - ({urgent:0,normal:1,low:2}[b.priority])
  })
  const upcoming = S.tasks.filter(t => t.due && t.due > today && !t.done &&
    (S.selectedCourse==='all' || t.course===S.selectedCourse))
    .sort((a,b) => a.due.localeCompare(b.due)).slice(0,5)

  const cont = document.getElementById('view-day')
  if (!all.length && !upcoming.length) {
    cont.innerHTML = `<div class="card empty-state"><div class="icon">🌷</div><p>no tasks for today — enjoy!</p></div>`
    return
  }
  const todo = all.filter(t => !t.done), done = all.filter(t => t.done)
  cont.innerHTML = `<div class="card">
    <div class="day-header" style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)">
      <span style="font-family:Playfair Display,serif;font-size:1.1rem;font-weight:600">Today</span>
      <span style="font-size:.8rem;color:var(--text-lighter)">${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</span>
      <span style="margin-left:auto;font-size:.75rem;background:var(--cream);padding:2px 10px;border-radius:8px;color:var(--text-light)">${all.length} tasks</span>
    </div>
    <div class="task-list">
      ${todo.map(t=>taskHTML(t)).join('')}
      ${done.length?`<div class="section-label">completed ✓</div>`:''}
      ${done.map(t=>taskHTML(t)).join('')}
    </div>
  </div>` +
  (upcoming.length ? `<div class="card" style="margin-top:10px">
    <div class="card-title" style="font-size:.88rem">coming up 📅</div>
    <div class="task-list">${upcoming.map(t=>taskHTML(t)).join('')}</div>
  </div>` : '')
  bindTaskEvents(cont)
}

function getWeekStart(now, offset=0) {
  const d = new Date(now)
  const day = d.getDay()
  d.setDate(d.getDate() + (day===0?-6:1-day) + offset*7)
  d.setHours(0,0,0,0)
  return d
}

function renderWeekView() {
  const start = getWeekStart(new Date(), S.weekOffset)
  const end   = new Date(start); end.setDate(end.getDate()+6)
  document.getElementById('week-range-label').textContent =
    start.toLocaleDateString('en-GB',{day:'numeric',month:'short'}) + ' – ' +
    end.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
  const today = fmtDate(new Date())
  const days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const grid  = document.getElementById('week-grid')
  grid.innerHTML = Array.from({length:7}, (_,i) => {
    const d  = new Date(start); d.setDate(start.getDate()+i)
    const ds = fmtDate(d)
    let dt = filtered(S.tasks.filter(t => t.due===ds))
    dt.sort((a,b) => ({urgent:0,normal:1,low:2}[a.priority])-({urgent:0,normal:1,low:2}[b.priority]))
    return `<div class="week-col${ds===today?' today-col':''}">
      <div class="week-col-header">
        <div class="week-day-name">${days[i]}</div>
        <div class="week-day-num">${d.getDate()}</div>
      </div>
      ${dt.length ? dt.map(t=>taskHTML(t,true)).join('')
        : `<div style="font-size:.68rem;color:var(--text-lighter);text-align:center;margin-top:8px">free 🌿</div>`}
    </div>`
  }).join('')
  bindTaskEvents(grid)
}

function renderMonthView() {
  const y = S.monthViewDate.getFullYear(), m = S.monthViewDate.getMonth()
  document.getElementById('month-label').textContent =
    S.monthViewDate.toLocaleDateString('en-GB',{month:'long',year:'numeric'})
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  document.getElementById('month-day-names').innerHTML = days.map(d=>`<div class="month-day-name">${d}</div>`).join('')
  const firstDay = new Date(y,m,1), lastDay = new Date(y,m+1,0)
  const offset   = firstDay.getDay()===0 ? 6 : firstDay.getDay()-1
  const today    = fmtDate(new Date())
  let cells = ''
  for (let i=offset-1; i>=0; i--)     cells += mCell(new Date(y,m,-i), true)
  for (let d=1; d<=lastDay.getDate(); d++) cells += mCell(new Date(y,m,d), false)
  const rem = (offset+lastDay.getDate())%7
  for (let d=1; d<=(rem?7-rem:0); d++) cells += mCell(new Date(y,m+1,d), true)
  const grid = document.getElementById('month-grid')
  grid.innerHTML = cells
  grid.querySelectorAll('[data-day]').forEach(el =>
    el.addEventListener('click', () => jumpToDay(el.dataset.day))
  )
}

function mCell(d, other) {
  const ds = fmtDate(d), today = fmtDate(new Date())
  let dt = filtered(S.tasks.filter(t => t.due===ds))
  const vis = dt.slice(0,2), more = dt.length-2
  return `<div class="month-cell${ds===today?' today-cell':''}${other?' other-month':''}" data-day="${ds}">
    <div class="month-cell-num">${d.getDate()}</div>
    ${vis.map(t=>{const c=S.courses.find(x=>x.id===t.course);return`<div class="month-task-dot${t.done?' done':''}" style="background:${c?.color||'#eee'}">${t.text}</div>`}).join('')}
    ${more>0?`<div class="month-more">+${more} more</div>`:''}
  </div>`
}

function jumpToDay(ds) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  document.querySelector('.tab-btn[data-view="day"]')?.classList.add('active')
  S.taskView = 'day'
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'))
  document.getElementById('view-day').classList.add('active')
  notify('📅 ' + formatDue(ds))
  renderDayView()
}

function renderMiniCal() {
  const y = S.calMonth.getFullYear(), m = S.calMonth.getMonth()
  document.getElementById('cal-month-label').textContent =
    S.calMonth.toLocaleDateString('en-GB',{month:'short',year:'numeric'})
  const firstDay = new Date(y,m,1), lastDay = new Date(y,m+1,0)
  const offset   = firstDay.getDay()===0 ? 6 : firstDay.getDay()-1
  const today    = fmtDate(new Date())
  const days     = ['M','T','W','T','F','S','S']
  let html = days.map(d=>`<div class="cal-day-name">${d}</div>`).join('')
  for (let i=offset-1; i>=0; i--) {
    const d = new Date(y,m,-i); html += `<div class="cal-day other-month">${d.getDate()}</div>`
  }
  for (let d=1; d<=lastDay.getDate(); d++) {
    const dd = new Date(y,m,d), ds = fmtDate(dd)
    const hasTasks = S.tasks.some(t => t.due===ds && !t.done)
    html += `<div class="cal-day${ds===today?' today':''}${hasTasks?' has-tasks':''}" data-day="${ds}">${d}</div>`
  }
  const mini = document.getElementById('mini-cal')
  mini.innerHTML = html
  mini.querySelectorAll('[data-day]').forEach(el =>
    el.addEventListener('click', () => jumpToDay(el.dataset.day))
  )
}

function formatDue(s) {
  const today    = fmtDate(new Date())
  const tomorrow = fmtDate(new Date(Date.now()+86400000))
  if (s === today)    return 'today'
  if (s === tomorrow) return 'tomorrow'
  const d = parseDate(s)
  return d ? d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : s
}

function renderGoalsWidget() {
  const widget = document.getElementById('goals-widget')
  if (!S.goals.length) { widget.style.display = 'none'; return }
  widget.style.display = 'block'
  const top3 = S.goals.slice(0,3)
  document.getElementById('goals-widget-list').innerHTML = top3.map(g => {
    const pct = Math.round((g.current_value / g.target_value) * 100)
    return `<div class="goal-widget-item">
      <svg class="goal-widget-ring" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--cream)" stroke-width="5"/>
        <circle cx="18" cy="18" r="14" fill="none" stroke="${g.color}" stroke-width="5"
          stroke-dasharray="${2*Math.PI*14}" stroke-dashoffset="${2*Math.PI*14*(1-pct/100)}"
          stroke-linecap="round" transform="rotate(-90 18 18)"/>
      </svg>
      <div class="goal-widget-info">
        <div class="goal-widget-title">${g.title}</div>
        <div class="goal-widget-pct">${pct}% complete</div>
      </div>
    </div>`
  }).join('')
}

// ── TIMETABLE ─────────────────────────────────────────────────────
export function initTimetable() {
  let slotColor = COLORS[0]
  document.getElementById('add-slot-btn').addEventListener('click', () => {
    slotColor = COLORS[0]
    colorSwatches('slot-color-swatches', slotColor, c => { slotColor = c })
    document.getElementById('slot-subject').value = ''
    document.getElementById('slot-room').value    = ''
    openModal('slot-modal')
  })
  document.getElementById('save-slot-btn').addEventListener('click', async () => {
    const subject = document.getElementById('slot-subject').value.trim()
    if (!subject) { notify('Please enter a subject name'); return }
    setSyncing(true)
    const obj = {
      id: genId(),
      day: +document.getElementById('slot-day').value,
      start_time: document.getElementById('slot-start').value,
      end_time:   document.getElementById('slot-end').value,
      subject, room: document.getElementById('slot-room').value, color: slotColor,
    }
    try {
      await db.timetable.add(obj)
      S.timetable.push(obj)
      closeModal('slot-modal')
      renderTimetable()
      notify('Class added 📅')
    } catch(e) { notify('Error: ' + e.message) }
    setSyncing(false)
  })

  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-text').value  = ''
    document.getElementById('import-preview').textContent = ''
    openModal('import-modal')
  })
  document.getElementById('import-text').addEventListener('input', previewImport)
  document.getElementById('do-import-btn').addEventListener('click', doImport)
}

export function renderTimetable() {
  const days    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
  const START_H = 7, END_H = 22, SLOT_H = 40 // px per hour

  const container = document.getElementById('timetable-container')
  container.innerHTML = `<div class="timetable-wrap"><div class="timetable-grid" id="tt-grid"></div></div>`
  const grid = document.getElementById('tt-grid')

  // Header row
  let html = '<div></div>' + days.map(d => `<div class="tt-col-head">${d}</div>`).join('')

  // Time column + day columns
  const hours = END_H - START_H
  let timeCells = ''
  for (let h = START_H; h <= END_H; h++) {
    timeCells += `<div class="tt-time-label">${String(h).padStart(2,'0')}:00</div>`
  }
  html += `<div class="tt-time-col">${timeCells}</div>`

  for (let d = 0; d < 7; d++) {
    const slots = S.timetable.filter(s => s.day === d)
    let dayHtml = ''
    // Hour grid lines
    for (let h = 0; h < hours; h++) {
      dayHtml += `<div class="tt-hour-line"></div>`
    }
    // Slots
    slots.forEach(s => {
      const [sh, sm] = s.start_time.split(':').map(Number)
      const [eh, em] = s.end_time.split(':').map(Number)
      const top    = ((sh - START_H) + sm/60) * SLOT_H
      const height = Math.max(30, ((eh-sh) + (em-sm)/60) * SLOT_H - 3)
      dayHtml += `<div class="tt-slot" style="top:${top}px;height:${height}px;background:${s.color}" data-slotid="${s.id}">
        <div class="tt-slot-subject">${s.subject}</div>
        <div class="tt-slot-time">${s.start_time}–${s.end_time}</div>
        ${s.room?`<div class="tt-slot-room">📍 ${s.room}</div>`:''}
        <button class="tt-delete-slot" data-del="${s.id}">✕</button>
      </div>`
    })
    html += `<div class="tt-day-col" style="height:${hours*SLOT_H}px">${dayHtml}</div>`
  }
  grid.innerHTML = html

  grid.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', async e => {
      e.stopPropagation()
      const id = btn.dataset.del
      setSyncing(true)
      await db.timetable.delete(id)
      S.timetable = S.timetable.filter(s => s.id !== id)
      setSyncing(false)
      renderTimetable()
      notify('Class removed')
    })
  )
}

// Import parser
function parseImportText(text) {
  const lines  = text.split('\n').map(l => l.trim()).filter(Boolean)
  const dayMap = { mon:0,tue:1,wed:2,thu:3,fri:4,sat:5,sun:6,
    monday:0,tuesday:1,wednesday:2,thursday:3,friday:4,saturday:5,sunday:6 }
  const results = []
  lines.forEach(line => {
    // Pattern: "Monday 09:00-10:30 Subject Room" or "Mon 9:00 Subject"
    const m = line.match(/^(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s+(\d{1,2})[:\.]?(\d{0,2})\s*[-–to]+\s*(\d{1,2})[:\.]?(\d{0,2})\s+(.+)/i)
    if (m) {
      const day    = dayMap[m[1].toLowerCase().slice(0,3)]
      const start  = `${String(m[2]).padStart(2,'0')}:${(m[3]||'00').padStart(2,'0')}`
      const end    = `${String(m[4]).padStart(2,'0')}:${(m[5]||'00').padStart(2,'0')}`
      const rest   = m[6].trim().split(/\s{2,}|\t/)
      const subject = rest[0]
      const room    = rest[1] || ''
      results.push({ day, start_time: start, end_time: end, subject, room, color: COLORS[results.length % COLORS.length] })
    }
  })
  return results
}

function previewImport() {
  const text    = document.getElementById('import-text').value
  const parsed  = parseImportText(text)
  const preview = document.getElementById('import-preview')
  if (!parsed.length) { preview.textContent = 'no classes detected yet — keep typing…'; return }
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  preview.textContent = `✅ detected ${parsed.length} class${parsed.length!==1?'es':''}: ` +
    parsed.map(p => `${days[p.day]} ${p.start_time} ${p.subject}`).join(', ')
}

async function doImport() {
  const text   = document.getElementById('import-text').value
  const parsed = parseImportText(text)
  if (!parsed.length) { notify('No classes detected'); return }
  setSyncing(true)
  try {
    for (const p of parsed) {
      const obj = { id: genId(), ...p }
      await db.timetable.add(obj)
      S.timetable.push(obj)
    }
    closeModal('import-modal')
    renderTimetable()
    notify(`Imported ${parsed.length} classes 📅`)
  } catch(e) { notify('Import error: ' + e.message) }
  setSyncing(false)
}

// ── GRADES ────────────────────────────────────────────────────────
export function initGrades() {
  document.getElementById('add-grade-btn').addEventListener('click', () => {
    document.getElementById('grade-course').value     = ''
    document.getElementById('grade-assessment').value = ''
    document.getElementById('grade-score').value      = ''
    document.getElementById('grade-weight').value     = ''
    document.getElementById('grade-date').value       = ''
    openModal('grade-modal')
  })
  document.getElementById('save-grade-btn').addEventListener('click', async () => {
    const course = document.getElementById('grade-course').value.trim()
    const assess = document.getElementById('grade-assessment').value.trim()
    const score  = parseFloat(document.getElementById('grade-score').value)
    const weight = parseFloat(document.getElementById('grade-weight').value)
    if (!course || !assess || isNaN(score) || isNaN(weight)) { notify('Please fill in all fields'); return }
    setSyncing(true)
    const obj = { id: genId(), course_name: course, assessment: assess,
      grade: score, weight, exam_date: document.getElementById('grade-date').value || null }
    try {
      await db.grades.add(obj)
      S.grades.push(obj)
      closeModal('grade-modal')
      renderGrades()
      notify('Grade saved 📝')
    } catch(e) { notify('Error: ' + e.message) }
    setSyncing(false)
  })
}

export function renderGrades() {
  const container = document.getElementById('grades-container')
  // Group by course
  const courses = {}
  S.grades.forEach(g => {
    if (!courses[g.course_name]) courses[g.course_name] = []
    courses[g.course_name].push(g)
  })

  const today = new Date()

  // Summary cards
  const summaryHTML = Object.entries(courses).map(([name, entries]) => {
    const weightedSum = entries.reduce((s,e) => s + e.grade * e.weight, 0)
    const totalWeight = entries.reduce((s,e) => s + e.weight, 0)
    const avg   = totalWeight > 0 ? weightedSum / totalWeight : 0
    const gpa   = gradeToGPA(avg)
    const color = avg >= 70 ? 'var(--mint-deep)' : avg >= 50 ? 'var(--peach-deep)' : 'var(--pink-deep)'
    return `<div class="grade-course-card" style="border-top-color:${color}">
      <div class="gca-name" title="${name}">${name}</div>
      <div class="gca-avg">${avg.toFixed(1)}%</div>
      <div class="gca-gpa">${gpa.letter} · ${gpa.label}</div>
      <div class="gca-bar"><div class="gca-bar-fill" style="width:${avg}%;background:${color}"></div></div>
    </div>`
  }).join('')

  // Entries list
  const listHTML = S.grades.length === 0
    ? `<div class="empty-state card"><div class="icon">📝</div><p>no grades yet — add your first!</p></div>`
    : S.grades.map(g => {
        const countdownHTML = g.exam_date ? (() => {
          const days = Math.ceil((parseDate(g.exam_date) - today) / 86400000)
          if (days < 0) return ''
          const cls = days <= 3 ? 'urgent' : days <= 7 ? 'soon' : 'ok'
          return `<span class="grade-countdown ${cls}">📅 ${days}d</span>`
        })() : ''
        const cls = g.grade >= 70 ? 'high' : g.grade >= 50 ? 'mid' : 'low-s'
        return `<div class="grade-row">
          <div class="grade-info">
            <div class="grade-name">${g.assessment} ${countdownHTML}</div>
            <div class="grade-meta">${g.course_name} · weight: ${g.weight}%${g.exam_date?' · '+formatDue(g.exam_date):''}</div>
          </div>
          <div class="grade-score ${cls}">${g.grade}%</div>
          <button class="action-btn del" data-del-grade="${g.id}">✕</button>
        </div>`
      }).join('')

  // Tools
  const toolsHTML = `
    <div class="grades-tools">
      <div class="tool-card">
        <div class="tool-title">🧮 what do I need?</div>
        <p style="font-size:.8rem;color:var(--text-light);margin-bottom:12px">Calculate the score you need on remaining work</p>
        <div class="tool-row">
          <div class="tool-field"><div class="tool-label">Course</div>
            <select class="tool-input" id="need-course">
              <option value="">-- select --</option>
              ${Object.keys(courses).map(n=>`<option value="${n}">${n}</option>`).join('')}
            </select></div>
          <div class="tool-field"><div class="tool-label">Target grade (%)</div>
            <input type="number" class="tool-input" id="need-target" placeholder="70" min="0" max="100"></div>
          <div class="tool-field"><div class="tool-label">Remaining weight (%)</div>
            <input type="number" class="tool-input" id="need-weight" placeholder="30" min="0" max="100"></div>
        </div>
        <button class="btn-primary" id="calc-need-btn" style="margin-top:10px;width:100%">calculate</button>
        <div class="tool-result" id="need-result" style="display:none"></div>
      </div>
      <div class="tool-card">
        <div class="tool-title">🎓 GPA guide</div>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:.82rem">
          ${[['A+ / A','90–100','4.0'],['A-','85–89','3.7'],['B+','80–84','3.3'],
             ['B','75–79','3.0'],['B-','70–74','2.7'],['C+','65–69','2.3'],
             ['C','60–64','2.0'],['D','50–59','1.0'],['F','< 50','0.0'],
          ].map(([l,r,g])=>`<div style="display:flex;gap:8px">
            <span style="min-width:36px;font-weight:600">${l}</span>
            <span style="flex:1;color:var(--text-light)">${r}%</span>
            <span style="color:var(--text-light)">GPA ${g}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>`

  container.innerHTML = `
    <div class="grades-summary">${summaryHTML || '<p style="color:var(--text-light);font-size:.88rem">Add grades to see course summaries</p>'}</div>
    <div class="grades-list">${listHTML}</div>
    ${toolsHTML}`

  // Delete
  container.querySelectorAll('[data-del-grade]').forEach(btn =>
    btn.addEventListener('click', async () => {
      setSyncing(true)
      await db.grades.delete(btn.dataset.delGrade)
      S.grades = S.grades.filter(g => g.id !== btn.dataset.delGrade)
      setSyncing(false)
      renderGrades()
      notify('Grade removed')
    })
  )

  // What do I need?
  document.getElementById('calc-need-btn').addEventListener('click', () => {
    const courseName = document.getElementById('need-course').value
    const target     = parseFloat(document.getElementById('need-target').value)
    const remaining  = parseFloat(document.getElementById('need-weight').value)
    const result     = document.getElementById('need-result')
    if (!courseName || isNaN(target) || isNaN(remaining)) { result.style.display='block'; result.textContent='Please fill in all fields'; return }
    if (remaining <= 0) { result.style.display='block'; result.textContent='Remaining weight must be > 0'; return }
    const entries     = courses[courseName] || []
    const weightedSum = entries.reduce((s,e) => s + e.grade * e.weight, 0)
    const needed      = (target * 100 - weightedSum) / remaining
    result.style.display = 'block'
    if (needed <= 0)   result.innerHTML = `🎉 You've already achieved ${target}% — well done!`
    else if (needed > 100) result.innerHTML = `😬 You'd need <strong>${needed.toFixed(1)}%</strong> which is above 100% — consider speaking to your tutor`
    else result.innerHTML = `📌 You need <strong>${needed.toFixed(1)}%</strong> on the remaining ${remaining}% to achieve ${target}% overall`
  })
}

function gradeToGPA(pct) {
  if (pct >= 90) return { letter:'A+', label:'First', gpa:4.0 }
  if (pct >= 85) return { letter:'A',  label:'First', gpa:4.0 }
  if (pct >= 80) return { letter:'A-', label:'First', gpa:3.7 }
  if (pct >= 75) return { letter:'B+', label:'2:1',   gpa:3.3 }
  if (pct >= 70) return { letter:'B',  label:'2:1',   gpa:3.0 }
  if (pct >= 65) return { letter:'B-', label:'2:2',   gpa:2.7 }
  if (pct >= 60) return { letter:'C+', label:'2:2',   gpa:2.3 }
  if (pct >= 50) return { letter:'C',  label:'Third',  gpa:2.0 }
  return { letter:'F', label:'Fail', gpa:0.0 }
}

// ── BUDGET ────────────────────────────────────────────────────────
const EXPENSE_CATS = ['Housing','Food','Transport','Entertainment','Clothing','Health','Education','Subscriptions','Other']
const INCOME_CATS  = ['Student loan','Part-time job','Scholarship','Family','Other']
const CAT_COLORS   = ['#f5c6c6','#c6daf5','#c6e8d8','#d8c6e8','#f5dcc6','#f5edc6','#e8c6d8','#c6e8e8','#fce4cf']

let budgetType = 'expense'

export function initBudget() {
  document.getElementById('budget-prev').addEventListener('click', () => {
    S.budgetMonth.setMonth(S.budgetMonth.getMonth()-1)
    renderBudget()
  })
  document.getElementById('budget-next').addEventListener('click', () => {
    S.budgetMonth.setMonth(S.budgetMonth.getMonth()+1)
    renderBudget()
  })
  document.getElementById('add-entry-btn').addEventListener('click', () => {
    budgetType = 'expense'
    syncBudgetModal()
    document.getElementById('budget-desc').value   = ''
    document.getElementById('budget-amount').value = ''
    document.getElementById('budget-date').value   = fmtDate(new Date())
    openModal('budget-modal')
  })
  document.getElementById('add-bgoal-btn').addEventListener('click', () => {
    document.getElementById('bgoal-name').value    = ''
    document.getElementById('bgoal-target').value  = ''
    document.getElementById('bgoal-current').value = ''
    document.getElementById('bgoal-deadline').value= ''
    openModal('bgoal-modal')
  })
  document.getElementById('btype-expense').addEventListener('click', () => { budgetType='expense'; syncBudgetModal() })
  document.getElementById('btype-income').addEventListener('click',  () => { budgetType='income';  syncBudgetModal() })
  document.getElementById('save-budget-btn').addEventListener('click', saveBudgetEntry)
  document.getElementById('save-bgoal-btn').addEventListener('click',  saveBudgetGoal)
}

function syncBudgetModal() {
  document.getElementById('btype-expense').classList.toggle('active', budgetType==='expense')
  document.getElementById('btype-income').classList.toggle('active',  budgetType==='income')
  const cats = budgetType === 'expense' ? EXPENSE_CATS : INCOME_CATS
  document.getElementById('budget-category').innerHTML = cats.map(c=>`<option value="${c}">${c}</option>`).join('')
}

async function saveBudgetEntry() {
  const desc   = document.getElementById('budget-desc').value.trim()
  const amount = parseFloat(document.getElementById('budget-amount').value)
  const date   = document.getElementById('budget-date').value
  if (!desc || isNaN(amount) || !date) { notify('Please fill in all fields'); return }
  const month  = date.slice(0,7)
  setSyncing(true)
  const obj = { id: genId(), type: budgetType, category: document.getElementById('budget-category').value,
    description: desc, amount, date, month }
  try {
    await db.budget.entries.add(obj)
    S.budgetEntries.push(obj)
    closeModal('budget-modal')
    await loadBudgetMonth()
    renderBudget()
    notify('Entry added 💰')
  } catch(e) { notify('Error: ' + e.message) }
  setSyncing(false)
}

async function saveBudgetGoal() {
  const name    = document.getElementById('bgoal-name').value.trim()
  const target  = parseFloat(document.getElementById('bgoal-target').value)
  const current = parseFloat(document.getElementById('bgoal-current').value||'0')
  if (!name || isNaN(target)) { notify('Please fill in name and target'); return }
  setSyncing(true)
  const obj = { id: genId(), name, target_amount: target, current_amount: current,
    deadline: document.getElementById('bgoal-deadline').value || null }
  try {
    await db.budget.goals.add(obj)
    S.budgetGoals.push(obj)
    closeModal('bgoal-modal')
    renderBudget()
    notify('Savings goal saved 🎯')
  } catch(e) { notify('Error: ' + e.message) }
  setSyncing(false)
}

export async function loadBudgetMonth() {
  const month = fmtDate(S.budgetMonth).slice(0,7)
  S.budgetEntries = await db.budget.entries.list(month)
}

export function renderBudget() {
  const month   = fmtDate(S.budgetMonth).slice(0,7)
  document.getElementById('budget-month-label').textContent =
    S.budgetMonth.toLocaleDateString('en-GB',{month:'long',year:'numeric'})

  const entries  = S.budgetEntries.filter(e => e.month === month)
  const income   = entries.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0)
  const expenses = entries.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0)
  const balance  = income - expenses

  // Overview
  const overviewHTML = `
    <div class="budget-overview">
      <div class="budget-stat"><div class="budget-stat-label">Income</div><div class="budget-stat-val income">£${income.toFixed(2)}</div></div>
      <div class="budget-stat"><div class="budget-stat-label">Expenses</div><div class="budget-stat-val expense">£${expenses.toFixed(2)}</div></div>
      <div class="budget-stat"><div class="budget-stat-label">Balance</div><div class="budget-stat-val balance ${balance>=0?'positive':'negative'}">£${balance.toFixed(2)}</div></div>
    </div>`

  // Donut chart for expenses
  const expCats = {}
  entries.filter(e=>e.type==='expense').forEach(e => {
    expCats[e.category] = (expCats[e.category]||0) + e.amount
  })
  const donutData = Object.entries(expCats).map(([label,value],i) => ({ label, value, color: CAT_COLORS[i%CAT_COLORS.length] }))
  const donutHTML = donutData.length ? `
    <div class="card" style="display:flex;flex-direction:column;align-items:center">
      <div class="card-title">expenses</div>
      <div class="donut-wrap">
        ${buildDonut(donutData, 90, 90, 65)}
        <div class="donut-legend">${donutData.map(d=>`
          <div class="legend-item">
            <div class="legend-dot" style="background:${d.color}"></div>
            <span class="legend-label">${d.label}</span>
            <span class="legend-val">£${d.value.toFixed(2)}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>` : ''

  // Entries list
  const listHTML = entries.length === 0
    ? `<div class="empty-state card"><div class="icon">💰</div><p>no entries for ${S.budgetMonth.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</p></div>`
    : `<div class="budget-entries-list">${entries.map(e=>`
        <div class="budget-entry">
          <div class="budget-entry-type ${e.type}">${e.type==='income'?'↑':'↓'}</div>
          <div class="budget-entry-info">
            <div class="budget-entry-desc">${e.description}</div>
            <div class="budget-entry-meta">${e.category} · ${formatDue(e.date)}</div>
          </div>
          <div class="budget-entry-amount ${e.type}">${e.type==='income'?'+':'−'}£${e.amount.toFixed(2)}</div>
          <button class="action-btn del" data-del-budget="${e.id}">✕</button>
        </div>`).join('')}
      </div>`

  // Savings goals
  const goalsHTML = S.budgetGoals.length ? `
    <div class="budget-goals">
      <div class="card-title" style="margin-bottom:10px">savings goals</div>
      ${S.budgetGoals.map(g => {
        const pct = Math.min(100, Math.round((g.current_amount/g.target_amount)*100))
        return `<div class="bgoal-card">
          <div class="bgoal-head">
            <span class="bgoal-name">${g.name}</span>
            <button class="action-btn del" data-del-bgoal="${g.id}">✕</button>
          </div>
          <div class="bgoal-prog"><div class="bgoal-fill" style="width:${pct}%"></div></div>
          <div class="bgoal-meta">
            <span>£${g.current_amount.toFixed(2)} / £${g.target_amount.toFixed(2)}</span>
            <span>${pct}%${g.deadline?' · by '+formatDue(g.deadline):''}</span>
          </div>
        </div>`
      }).join('')}
    </div>` : ''

  const container = document.getElementById('budget-container')
  container.innerHTML = overviewHTML + `
    <div class="budget-content">
      <div>${listHTML}</div>
      <div>${donutHTML}${goalsHTML}</div>
    </div>`

  container.querySelectorAll('[data-del-budget]').forEach(btn =>
    btn.addEventListener('click', async () => {
      setSyncing(true)
      await db.budget.entries.delete(btn.dataset.delBudget)
      S.budgetEntries = S.budgetEntries.filter(e => e.id !== btn.dataset.delBudget)
      setSyncing(false)
      renderBudget()
    })
  )
  container.querySelectorAll('[data-del-bgoal]').forEach(btn =>
    btn.addEventListener('click', async () => {
      setSyncing(true)
      await db.budget.goals.delete(btn.dataset.delBgoal)
      S.budgetGoals = S.budgetGoals.filter(g => g.id !== btn.dataset.delBgoal)
      setSyncing(false)
      renderBudget()
    })
  )
}

function buildDonut(data, cx, cy, r) {
  const total = data.reduce((s,d) => s+d.value, 0)
  if (!total) return `<svg width="${cx*2}" height="${cy*2}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--cream)" stroke-width="24"/></svg>`
  let angle = -Math.PI/2, paths = ''
  data.forEach(d => {
    const a  = (d.value/total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle)
    const y1 = cy + r * Math.sin(angle)
    angle += a
    const x2  = cx + r * Math.cos(angle)
    const y2  = cy + r * Math.sin(angle)
    const la  = a > Math.PI ? 1 : 0
    paths += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${la} 1 ${x2} ${y2}" fill="none" stroke="${d.color}" stroke-width="24" stroke-linecap="butt"/>`
  })
  return `<svg class="donut-svg" width="${cx*2}" height="${cy*2}" viewBox="0 0 ${cx*2} ${cy*2}">${paths}</svg>`
}

// ── RESOURCES ────────────────────────────────────────────────────
export function initResources() {
  document.getElementById('add-resource-btn').addEventListener('click', () => {
    document.getElementById('res-title').value  = ''
    document.getElementById('res-url').value    = ''
    document.getElementById('res-course').value = ''
    document.getElementById('res-notes').value  = ''
    openModal('resource-modal')
  })
  document.getElementById('save-resource-btn').addEventListener('click', async () => {
    const title = document.getElementById('res-title').value.trim()
    if (!title) { notify('Please enter a title'); return }
    setSyncing(true)
    const obj = {
      id: genId(), title,
      url:         document.getElementById('res-url').value.trim() || null,
      type:        document.getElementById('res-type').value,
      course_name: document.getElementById('res-course').value.trim() || null,
      notes:       document.getElementById('res-notes').value.trim() || null,
      read:        false,
    }
    try {
      await db.resources.add(obj)
      S.resources.push(obj)
      closeModal('resource-modal')
      renderResources()
      notify('Resource added 📚')
    } catch(e) { notify('Error: ' + e.message) }
    setSyncing(false)
  })
}

export function renderResources() {
  const typeIcons = { link:'🔗', book:'📖', paper:'📄', video:'🎬', other:'📦' }

  // Filters
  const courses   = [...new Set(S.resources.map(r=>r.course_name).filter(Boolean))]
  const filtersEl = document.getElementById('resource-filters')
  filtersEl.innerHTML = `<div class="res-filters">
    ${['all','link','book','paper','video','other'].map(t=>`<div class="filter-chip${S.resType===t?' active-chip':''}" data-restype="${t}">${t==='all'?'all types':`${typeIcons[t]||''} ${t}`}</div>`).join('')}
    <div style="width:1px;background:var(--border);margin:0 4px;align-self:stretch"></div>
    <div class="filter-chip${S.resCourse==='all'?' active-chip':''}" data-rescourse="all">all courses</div>
    ${courses.map(c=>`<div class="filter-chip${S.resCourse===c?' active-chip':''}" data-rescourse="${c}">${c}</div>`).join('')}
    <div style="width:1px;background:var(--border);margin:0 4px;align-self:stretch"></div>
    <div class="filter-chip${S.resRead==='unread'?' active-chip':''}" data-resread="unread">unread</div>
    <div class="filter-chip${S.resRead==='read'?' active-chip':''}" data-resread="read">read</div>
    <div class="filter-chip${S.resRead==='all'?' active-chip':''}" data-resread="all">all</div>
  </div>`

  filtersEl.querySelectorAll('[data-restype]').forEach(el =>
    el.addEventListener('click', () => { S.resType = el.dataset.restype; renderResources() }))
  filtersEl.querySelectorAll('[data-rescourse]').forEach(el =>
    el.addEventListener('click', () => { S.resCourse = el.dataset.rescourse; renderResources() }))
  filtersEl.querySelectorAll('[data-resread]').forEach(el =>
    el.addEventListener('click', () => { S.resRead = el.dataset.resread; renderResources() }))

  // Filter resources
  let items = S.resources
  if (S.resType   !== 'all')    items = items.filter(r => r.type === S.resType)
  if (S.resCourse !== 'all')    items = items.filter(r => r.course_name === S.resCourse)
  if (S.resRead   === 'read')   items = items.filter(r => r.read)
  if (S.resRead   === 'unread') items = items.filter(r => !r.read)

  const container = document.getElementById('resources-container')
  if (!items.length) {
    container.innerHTML = `<div class="empty-state card"><div class="icon">📚</div><p>no resources found</p></div>`
    return
  }

  container.innerHTML = `<div class="resources-grid">${items.map(r => {
    const icon   = typeIcons[r.type] || '📦'
    const favUrl = r.url ? `https://www.google.com/s2/favicons?sz=32&domain=${new URL(r.url).hostname}` : null
    const favHtml = favUrl
      ? `<img class="res-fav" src="${favUrl}" alt="" onerror="this.style.display='none'">`
      : `<div class="res-fav-placeholder">${icon}</div>`
    const courseColor = S.courses.find(c => c.name === r.course_name)?.color || 'var(--cream)'
    return `<div class="resource-card${r.read?' read-card':''}">
      <div class="res-head">
        ${favHtml}
        <div class="res-title">${r.title}</div>
      </div>
      <div class="res-meta">
        <span class="res-type-badge">${icon} ${r.type}</span>
        ${r.course_name?`<span class="res-course-tag" style="background:${courseColor}">${r.course_name}</span>`:''}
      </div>
      ${r.notes?`<div class="res-notes">${r.notes}</div>`:''}
      <div class="res-actions">
        <button class="res-read-btn${r.read?' read':''}" data-toggle-read="${r.id}">${r.read?'✓ read':'mark as read'}</button>
        ${r.url?`<a class="res-open-btn" href="${r.url}" target="_blank" rel="noopener">open →</a>`:''}
        <button class="action-btn del" data-del-res="${r.id}">✕</button>
      </div>
    </div>`
  }).join('')}</div>`

  container.querySelectorAll('[data-toggle-read]').forEach(btn =>
    btn.addEventListener('click', async () => {
      const res = S.resources.find(r => r.id === btn.dataset.toggleRead)
      if (!res) return
      setSyncing(true)
      await db.resources.update(res.id, { read: !res.read })
      res.read = !res.read
      setSyncing(false)
      renderResources()
    })
  )
  container.querySelectorAll('[data-del-res]').forEach(btn =>
    btn.addEventListener('click', async () => {
      setSyncing(true)
      await db.resources.delete(btn.dataset.delRes)
      S.resources = S.resources.filter(r => r.id !== btn.dataset.delRes)
      setSyncing(false)
      renderResources()
      notify('Resource removed')
    })
  )
}

// ── GOALS ────────────────────────────────────────────────────────
export function initGoals() {
  let goalColor = COLORS[0]
  document.getElementById('add-goal-btn').addEventListener('click', () => {
    goalColor = COLORS[0]
    colorSwatches('goal-color-swatches', goalColor, c => { goalColor = c })
    ;['goal-title','goal-desc','goal-unit','goal-deadline'].forEach(id => {
      const el = document.getElementById(id); if(el) el.value = ''
    })
    document.getElementById('goal-current').value = '0'
    document.getElementById('goal-target').value  = '100'
    document.getElementById('goal-modal-title').textContent = 'add goal 🎯'
    openModal('goal-modal')
  })
  document.getElementById('save-goal-btn').addEventListener('click', async () => {
    const title   = document.getElementById('goal-title').value.trim()
    const current = parseFloat(document.getElementById('goal-current').value)
    const target  = parseFloat(document.getElementById('goal-target').value)
    if (!title || isNaN(current) || isNaN(target)) { notify('Please fill in title, current, and target'); return }
    setSyncing(true)
    const obj = {
      id: genId(), title,
      description:   document.getElementById('goal-desc').value.trim() || null,
      current_value: current, target_value: target,
      unit:          document.getElementById('goal-unit').value.trim() || '%',
      deadline:      document.getElementById('goal-deadline').value || null,
      color:         goalColor,
    }
    try {
      await db.goals.add(obj)
      S.goals.push(obj)
      closeModal('goal-modal')
      renderGoals()
      renderGoalsWidget()
      notify('Goal added 🎯')
    } catch(e) { notify('Error: ' + e.message) }
    setSyncing(false)
  })
}

export function renderGoals() {
  const container = document.getElementById('goals-container')
  if (!S.goals.length) {
    container.innerHTML = `<div class="empty-state card"><div class="icon">🎯</div><p>no goals yet — add your first!</p></div>`
    return
  }
  container.innerHTML = `<div class="goals-grid">${S.goals.map(g => {
    const pct   = Math.min(100, Math.round((g.current_value / g.target_value) * 100))
    const circ  = 2 * Math.PI * 40
    const fill  = circ * (pct / 100)
    const dead  = g.deadline ? (() => {
      const d = Math.ceil((parseDate(g.deadline) - new Date()) / 86400000)
      return d >= 0 ? `${d} days left` : 'deadline passed'
    })() : ''
    return `<div class="goal-card">
      <div class="goal-ring-wrap">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--cream)" stroke-width="10"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="${g.color}" stroke-width="10"
            stroke-dasharray="${circ}" stroke-dashoffset="${circ - fill}"
            stroke-linecap="round" transform="rotate(-90 50 50)"/>
        </svg>
        <div class="goal-ring-pct">${pct}%</div>
      </div>
      <div class="goal-title">${g.title}</div>
      ${g.description?`<div class="goal-meta">${g.description}</div>`:''}
      <div class="goal-deadline">${dead}</div>
      <div class="goal-actions">
        <input type="number" class="goal-progress-input" data-gid="${g.id}" value="${g.current_value}" min="0" max="${g.target_value}">
        <button class="goal-update-btn" data-gupdate="${g.id}">✓</button>
        <button class="goal-break-btn" data-gbreak="${g.id}" title="break into tasks">🔀</button>
        <button class="action-btn del" data-del-goal="${g.id}">✕</button>
      </div>
    </div>`
  }).join('')}</div>`

  container.querySelectorAll('[data-gupdate]').forEach(btn =>
    btn.addEventListener('click', async () => {
      const id    = btn.dataset.gupdate
      const input = container.querySelector(`[data-gid="${id}"]`)
      const val   = parseFloat(input?.value)
      if (isNaN(val)) return
      setSyncing(true)
      await db.goals.update(id, { current_value: val })
      const g = S.goals.find(g => g.id === id)
      if (g) g.current_value = val
      setSyncing(false)
      renderGoals()
      renderGoalsWidget()
      notify('Progress updated 🎯')
    })
  )
  container.querySelectorAll('[data-gbreak]').forEach(btn =>
    btn.addEventListener('click', async () => {
      const g = S.goals.find(g => g.id === btn.dataset.gbreak)
      if (!g) return
      // Create 3 sub-tasks
      const steps = [
        `${g.title}: plan & research`,
        `${g.title}: main work`,
        `${g.title}: review & finish`,
      ]
      setSyncing(true)
      for (const text of steps) {
        const t = { id: genId(), text, course: null, priority: 'normal',
          due: g.deadline || fmtDate(new Date()), done: false }
        await db.tasks.add(t)
        S.tasks.push(t)
      }
      setSyncing(false)
      notify('Tasks created from goal 🌸')
    })
  )
  container.querySelectorAll('[data-del-goal]').forEach(btn =>
    btn.addEventListener('click', async () => {
      setSyncing(true)
      await db.goals.delete(btn.dataset.delGoal)
      S.goals = S.goals.filter(g => g.id !== btn.dataset.delGoal)
      setSyncing(false)
      renderGoals()
      renderGoalsWidget()
      notify('Goal removed')
    })
  )
}

// ── WELLNESS ─────────────────────────────────────────────────────
let waterInterval = null
const MOODS = ['😔','😕','😐','🙂','😊']

export function initWellness() {
  document.getElementById('water-notif-btn').addEventListener('click', requestWaterReminders)
}

export function renderWellness() {
  const container = document.getElementById('wellness-container')
  const todayStr  = fmtDate(new Date())
  const todayLog  = S.wellness.find(l => l.date === todayStr)

  // Streak
  let streak = 0
  const today = new Date()
  for (let i=0; i<90; i++) {
    const d  = new Date(today); d.setDate(today.getDate()-i)
    const ds = fmtDate(d)
    if (S.wellness.some(l => l.date === ds)) streak++
    else if (i > 0) break
  }

  // SVG line chart (last 14 days)
  const recent = []
  for (let i=13; i>=0; i--) {
    const d  = new Date(today); d.setDate(today.getDate()-i)
    const ds = fmtDate(d)
    const log= S.wellness.find(l=>l.date===ds) || null
    recent.push({ date: ds, log })
  }
  const chartHTML = buildLineChart(recent)

  container.innerHTML = `
    <div class="wellness-grid">
      <!-- Today's check-in -->
      <div class="wellness-card">
        <div class="wellness-card-title">today's check-in 🌸</div>
        <div class="form-label">how are you feeling?</div>
        <div class="mood-picker">${MOODS.map((emoji,i)=>
          `<button class="mood-btn${todayLog?.mood===i+1?' selected':''}" data-mood="${i+1}">${emoji}</button>`
        ).join('')}</div>

        <div class="sleep-row">
          <span class="sleep-label">😴 sleep</span>
          <input type="number" class="sleep-input" id="sleep-input" min="0" max="24" step="0.5"
            placeholder="hours" value="${todayLog?.sleep_hours||''}">
          <span style="font-size:.8rem;color:var(--text-light)">hrs</span>
        </div>

        <div class="form-label">💧 water glasses today</div>
        <div class="water-row" id="water-row">
          ${Array.from({length:8},(_,i)=>`<span class="water-glass${(todayLog?.water_glasses||0)>i?' filled':''}" data-glass="${i+1}">💧</span>`).join('')}
        </div>

        <textarea class="well-notes" id="well-notes" placeholder="notes (optional)">${todayLog?.notes||''}</textarea>
        <button class="btn-primary save-log-btn" id="save-log-btn">save today's log ✓</button>
      </div>

      <!-- Streak + chart -->
      <div class="wellness-card">
        <div class="wellness-card-title">your streak 🔥</div>
        <div class="streak-display">
          <div class="streak-num">${streak}</div>
          <div class="streak-label">consecutive days logged</div>
        </div>
        <div class="wellness-card-title" style="margin-top:16px">last 14 days 📈</div>
        ${chartHTML}
        <div class="chart-legend">
          <div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--pink-deep)"></div>mood</div>
          <div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--sky-deep)"></div>sleep</div>
        </div>
      </div>
    </div>
    <div class="wellness-card well-cal-card">
      <div class="wellness-card-title">log history 📅</div>
      ${buildWellCalendar()}
    </div>`

  // Mood
  let selectedMood = todayLog?.mood || null
  container.querySelectorAll('.mood-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      container.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
      selectedMood = +btn.dataset.mood
    })
  )

  // Water
  let waterCount = todayLog?.water_glasses || 0
  container.querySelectorAll('.water-glass').forEach(el =>
    el.addEventListener('click', () => {
      waterCount = +el.dataset.glass
      container.querySelectorAll('.water-glass').forEach((g,i) =>
        g.classList.toggle('filled', i < waterCount)
      )
    })
  )

  // Save
  document.getElementById('save-log-btn').addEventListener('click', async () => {
    const sleep = parseFloat(document.getElementById('sleep-input').value)||null
    const notes = document.getElementById('well-notes').value.trim()||null
    const obj   = { id: genId(), date: todayStr, mood: selectedMood, sleep_hours: sleep, water_glasses: waterCount, notes }
    setSyncing(true)
    try {
      await db.wellness.upsert(obj)
      const idx = S.wellness.findIndex(l => l.date === todayStr)
      if (idx >= 0) S.wellness[idx] = { ...S.wellness[idx], ...obj }
      else S.wellness.push(obj)
      renderWellness()
      notify('Log saved 🌿')
    } catch(e) { notify('Error: ' + e.message) }
    setSyncing(false)
  })

  // Calendar navigation
  document.getElementById('well-cal-prev').addEventListener('click', () => {
    S.wellCalMonth = new Date(S.wellCalMonth.getFullYear(), S.wellCalMonth.getMonth() - 1, 1)
    renderWellness()
  })
  document.getElementById('well-cal-next').addEventListener('click', () => {
    S.wellCalMonth = new Date(S.wellCalMonth.getFullYear(), S.wellCalMonth.getMonth() + 1, 1)
    renderWellness()
  })

  // Calendar cell clicks — open log detail
  container.querySelectorAll('.well-cal-cell.has-log').forEach(el =>
    el.addEventListener('click', () => showWellLog(el.dataset.wdate))
  )
}

function buildWellCalendar() {
  const y      = S.wellCalMonth.getFullYear()
  const m      = S.wellCalMonth.getMonth()
  const label  = S.wellCalMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const today  = fmtDate(new Date())
  const names  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const first  = new Date(y, m, 1)
  const last   = new Date(y, m + 1, 0)
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1

  let cells = ''
  for (let i = offset - 1; i >= 0; i--) cells += wcCell(new Date(y, m, -i), true, today)
  for (let d = 1; d <= last.getDate(); d++) cells += wcCell(new Date(y, m, d), false, today)
  const rem = (offset + last.getDate()) % 7
  for (let d = 1; d <= (rem ? 7 - rem : 0); d++) cells += wcCell(new Date(y, m + 1, d), true, today)

  return `
    <div class="well-cal-header">
      <button class="cal-nav" id="well-cal-prev">‹</button>
      <span class="well-cal-label">${label}</span>
      <button class="cal-nav" id="well-cal-next">›</button>
    </div>
    <div class="well-cal-day-names">${names.map(n => `<div class="well-cal-day-name">${n}</div>`).join('')}</div>
    <div class="well-cal-grid">${cells}</div>
    <p class="well-cal-hint">tap a highlighted day to view that log</p>`
}

function wcCell(d, other, today) {
  const ds   = fmtDate(d)
  const log  = S.wellness.find(l => l.date === ds)
  const mood = log?.mood ? MOODS[log.mood - 1] : ''
  return `<div class="well-cal-cell${other ? ' other-month' : ''}${ds === today ? ' today' : ''}${log ? ' has-log' : ''}" data-wdate="${ds}">
    <div class="well-cal-num">${d.getDate()}</div>
    ${mood ? `<div class="well-cal-mood">${mood}</div>` : log ? '<div class="well-cal-dot"></div>' : ''}
  </div>`
}

function showWellLog(dateStr) {
  const log = S.wellness.find(l => l.date === dateStr)
  if (!log) return
  const d     = parseDate(dateStr)
  const label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  document.getElementById('well-log-modal-title').textContent = label
  const mood  = log.mood        != null ? `<div class="well-log-row"><span class="well-log-label">feeling</span><span class="well-log-val">${MOODS[log.mood - 1]}</span></div>` : ''
  const sleep = log.sleep_hours != null ? `<div class="well-log-row"><span class="well-log-label">😴 sleep</span><span class="well-log-val">${log.sleep_hours} hrs</span></div>` : ''
  const water = log.water_glasses ? `<div class="well-log-row"><span class="well-log-label">💧 water</span><span class="well-log-val">${log.water_glasses} glasses</span></div>` : ''
  const notes = log.notes ? `<div class="well-log-row well-log-notes-row"><span class="well-log-label">notes</span><div class="well-log-note-text">${log.notes}</div></div>` : ''
  document.getElementById('well-log-modal-body').innerHTML = `<div class="well-log-detail">${mood}${sleep}${water}${notes}</div>`
  openModal('well-log-modal')
}

function buildLineChart(days) {
  const W = 280, H = 100, PAD = 20
  const moodPts  = days.filter(d=>d.log?.mood != null)
  const sleepPts = days.filter(d=>d.log?.sleep_hours != null)
  const xStep    = (W - PAD*2) / (days.length - 1)
  const xOf = i => PAD + i * xStep
  const moodY  = v => H - PAD - ((v-1)/4) * (H-PAD*2)
  const sleepY = v => H - PAD - (Math.min(v,10)/10) * (H-PAD*2)

  const moodPath  = moodPts.length > 1
    ? 'M ' + moodPts.map(d=>`${xOf(days.indexOf(d))} ${moodY(d.log.mood)}`).join(' L ') : ''
  const sleepPath = sleepPts.length > 1
    ? 'M ' + sleepPts.map(d=>`${xOf(days.indexOf(d))} ${sleepY(d.log.sleep_hours)}`).join(' L ') : ''

  return `<div class="line-chart-wrap">
    <svg class="chart-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <line x1="${PAD}" y1="${H-PAD}" x2="${W-PAD}" y2="${H-PAD}" class="chart-axis"/>
      <line x1="${PAD}" y1="${PAD}"   x2="${PAD}"   y2="${H-PAD}" class="chart-axis"/>
      ${moodPath  ? `<path d="${moodPath}"  class="chart-line-mood"/>` : ''}
      ${sleepPath ? `<path d="${sleepPath}" class="chart-line-sleep"/>` : ''}
      ${moodPts.map(d=>`<circle cx="${xOf(days.indexOf(d))}" cy="${moodY(d.log.mood)}" r="3" class="chart-dot-mood"/>`).join('')}
      ${sleepPts.map(d=>`<circle cx="${xOf(days.indexOf(d))}" cy="${sleepY(d.log.sleep_hours)}" r="3" class="chart-dot-sleep"/>`).join('')}
    </svg>
  </div>`
}

async function requestWaterReminders() {
  if (!('Notification' in window)) { notify('Notifications not supported in this browser'); return }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') { notify('Notification permission denied'); return }
  if (waterInterval) clearInterval(waterInterval)
  waterInterval = setInterval(() => {
    new Notification('💧 Drink water!', {
      body: 'Stay hydrated for better focus and energy.',
      icon: '/apple-touch-icon.png',
    })
  }, 60 * 60 * 1000) // every hour
  notify('💧 Water reminders set — every hour!')
}

// ── PROFILE ──────────────────────────────────────────────────────
export function initProfile() {
  document.getElementById('save-pw-btn').addEventListener('click', async () => {
    const { changePassword } = await import('./auth.js')
    const pw  = document.getElementById('new-pw').value
    const pw2 = document.getElementById('confirm-pw').value
    const err = document.getElementById('pw-error')
    err.textContent = ''
    if (pw !== pw2)   { err.textContent = 'passwords do not match'; return }
    if (pw.length < 6){ err.textContent = 'password must be at least 6 characters'; return }
    try {
      await changePassword(pw)
      closeModal('change-pw-modal')
      notify('Password updated ✓')
    } catch(e) { err.textContent = e.message }
  })
}

export function renderProfile(user, isGuest) {
  const container = document.getElementById('profile-container')
  container.innerHTML = `
    <div class="card profile-card">
      <div class="profile-row">
        <span class="profile-label">account</span>
        <span class="profile-val">
          ${isGuest
            ? `<span class="profile-badge guest">guest</span> (data local to this browser)`
            : `<span class="profile-badge user">signed in</span> ${user?.email||''}`}
        </span>
      </div>
      ${!isGuest ? `
      <div class="profile-row">
        <span class="profile-label">password</span>
        <button class="btn-secondary" id="change-pw-open" style="font-size:.8rem;padding:5px 12px">change password</button>
      </div>` : ''}
      <div class="profile-row">
        <span class="profile-label">data</span>
        <span class="profile-val" style="font-size:.82rem;color:var(--text-light)">
          ${S.tasks.length} tasks · ${S.courses.length} courses · ${S.goals.length} goals
        </span>
      </div>
      <div class="profile-row">
        <span class="profile-label">sync</span>
        <span class="profile-val" style="font-size:.82rem;color:var(--text-light)">
          ${isGuest ? 'guest data syncs to Supabase with your guest ID — sign up to access from other devices' : 'real-time sync across all devices ✓'}
        </span>
      </div>
    </div>
    ${!isGuest ? '' : `
    <div class="card profile-card" style="margin-top:14px">
      <div class="card-title">upgrade to full account</div>
      <p style="font-size:.85rem;color:var(--text-light);margin-bottom:14px">Create an account to sync across devices and keep your data safe.</p>
      <button class="btn-primary" id="signup-from-profile">create account →</button>
    </div>`}`

  document.getElementById('change-pw-open')?.addEventListener('click', () => {
    document.getElementById('new-pw').value     = ''
    document.getElementById('confirm-pw').value = ''
    document.getElementById('pw-error').textContent = ''
    openModal('change-pw-modal')
  })
  document.getElementById('signup-from-profile')?.addEventListener('click', () => {
    // Show auth overlay on signup tab
    document.getElementById('auth-overlay').classList.remove('hidden')
    document.getElementById('auth-login-view').style.display  = 'none'
    document.getElementById('auth-signup-view').style.display = 'block'
  })
}
