import { db, subscribeAll } from './db.js'
import { initAuth, signOut, currentUser, isGuest } from './auth.js'
import { initQuote, initWeather, initPomodoro, renderProgress, updatePomoSettings, getPomoSettings } from './widgets.js'
import {
  S, notify, setSyncing, openModal, closeModal,
  initHome, renderHome, renderCourseList,
  initTimetable, renderTimetable,
  initGrades, renderGrades,
  initBudget, renderBudget, loadBudgetMonth,
  initResources, renderResources,
  initGoals, renderGoals,
  initWellness, renderWellness,
  initProfile, renderProfile,
} from './pages.js'

// ── Navigation ────────────────────────────────────────────────────
const PAGES = ['home','timetable','grades','budget','resources','goals','wellness','profile']

function showPage(name) {
  if (!PAGES.includes(name)) name = 'home'
  PAGES.forEach(p => {
    document.getElementById('page-' + p)?.classList.toggle('active', p === name)
  })
  document.querySelectorAll('.nav-link, .drawer-link').forEach(a => {
    a.classList.toggle('active', a.dataset.page === name)
  })
  if (name === 'profile') renderProfile(currentUser, isGuest)
  closeDrawer()
}

function routeFromHash() {
  const hash = location.hash.replace('#','') || 'home'
  showPage(hash)
}

// ── Mobile drawer ────────────────────────────────────────────────
function openDrawer() {
  document.getElementById('drawer').classList.add('open')
  document.getElementById('drawer-backdrop').classList.add('show')
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open')
  document.getElementById('drawer-backdrop').classList.remove('show')
}

// ── Data loading ─────────────────────────────────────────────────
async function loadAll() {
  setSyncing(true)
  try {
    const [tasks, courses, timetable, grades, budgetGoals, resources, goals, wellness] =
      await Promise.all([
        db.tasks.list(),
        db.courses.list(),
        db.timetable.list(),
        db.grades.list(),
        db.budget.goals.list(),
        db.resources.list(),
        db.goals.list(),
        db.wellness.list(),
      ])
    S.tasks        = tasks
    S.courses      = courses
    S.timetable    = timetable
    S.grades       = grades
    S.budgetGoals  = budgetGoals
    S.resources    = resources
    S.goals        = goals
    S.wellness     = wellness
    await loadBudgetMonth()
    renderAll()
  } catch (e) {
    console.error('loadAll error', e)
    notify('error loading data')
  } finally {
    setSyncing(false)
  }
}

function renderAll() {
  renderHome()
  renderCourseList()
  renderTimetable()
  renderGrades()
  renderBudget()
  renderResources()
  renderGoals()
  renderWellness()
  renderProgress(S.tasks)
}

// ── Realtime ─────────────────────────────────────────────────────
function setupRealtime() {
  subscribeAll(async () => {
    await loadAll()
  })
}

// ── Offline / online ─────────────────────────────────────────────
function setupNetworkStatus() {
  const badge = document.getElementById('offline-badge')
  function update() {
    badge.classList.toggle('show', !navigator.onLine)
  }
  window.addEventListener('online',  update)
  window.addEventListener('offline', update)
  update()
}

// ── PWA install ──────────────────────────────────────────────────
let _deferredInstall = null
function setupInstall() {
  const banner  = document.getElementById('install-banner')
  const btn     = document.getElementById('install-btn')
  const dismiss = document.getElementById('install-dismiss')

  if (localStorage.getItem('install-dismissed')) {
    banner.style.display = 'none'
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    _deferredInstall = e
    if (!localStorage.getItem('install-dismissed')) banner.style.display = 'flex'
  })

  btn?.addEventListener('click', async () => {
    if (!_deferredInstall) return
    _deferredInstall.prompt()
    const { outcome } = await _deferredInstall.userChoice
    if (outcome === 'accepted') banner.style.display = 'none'
    _deferredInstall = null
  })

  dismiss?.addEventListener('click', () => {
    banner.style.display = 'none'
    localStorage.setItem('install-dismissed', '1')
  })
}

// ── Sign-out ──────────────────────────────────────────────────────
function setupSignOut() {
  document.getElementById('drawer-signout')?.addEventListener('click', async () => {
    await signOut()
    location.reload()
  })
}

// ── Share modal ──────────────────────────────────────────────────
function setupShare() {
  document.getElementById('share-btn')?.addEventListener('click', () => {
    document.getElementById('share-link-text').textContent = location.href
    openModal('share-modal')
  })
  document.getElementById('copy-link-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(location.href).then(() => notify('link copied!'))
  })
}

// ── Modal close buttons ──────────────────────────────────────────
function setupModalCloseButtons() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close))
  })
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id)
    })
  })
}

// ── Pomodoro settings modal ──────────────────────────────────────
function setupPomoSettings() {
  document.getElementById('pomo-settings-btn')?.addEventListener('click', () => {
    const s = getPomoSettings()
    document.getElementById('pomo-work-input').value  = s.work
    document.getElementById('pomo-short-input').value = s.short
    document.getElementById('pomo-long-input').value  = s.long
    openModal('pomo-modal')
  })
  document.getElementById('save-pomo-btn')?.addEventListener('click', () => {
    const work  = parseInt(document.getElementById('pomo-work-input').value)  || 25
    const short = parseInt(document.getElementById('pomo-short-input').value) || 5
    const long_ = parseInt(document.getElementById('pomo-long-input').value)  || 15
    updatePomoSettings(work, short, long_)
    closeModal('pomo-modal')
  })
}

// ── Date display ─────────────────────────────────────────────────
function updateDateDisplay() {
  const el = document.getElementById('home-date')
  if (!el) return
  const now = new Date()
  el.textContent = now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
}

// ── Entry point ──────────────────────────────────────────────────
async function main() {
  setupNetworkStatus()
  setupInstall()
  setupModalCloseButtons()
  setupShare()
  setupPomoSettings()
  setupSignOut()

  // Navigation
  window.addEventListener('hashchange', routeFromHash)
  document.querySelectorAll('.nav-link, .drawer-link').forEach(a => {
    a.addEventListener('click', () => {
      closeDrawer()
    })
  })

  // Hamburger / drawer
  document.getElementById('hamburger')?.addEventListener('click', openDrawer)
  document.getElementById('drawer-close')?.addEventListener('click', closeDrawer)
  document.getElementById('drawer-backdrop')?.addEventListener('click', closeDrawer)

  // Auth
  await initAuth(
    async (uid, guest) => {
      // Update UI labels
      const label = document.getElementById('nav-user-label')
      const drawerUser = document.getElementById('drawer-user')
      if (label) label.textContent = guest ? 'guest' : ''
      if (drawerUser) drawerUser.textContent = guest ? 'guest mode' : (currentUser?.email || '')

      // Init pages (attach event listeners once)
      initHome()
      initTimetable()
      initGrades()
      initBudget()
      initResources()
      initGoals()
      initWellness()
      initProfile()

      // Load data
      await loadAll()

      // Realtime (only for authenticated users)
      if (!guest) setupRealtime()

      // Widgets
      initQuote()
      initWeather()
      initPomodoro()

      // Date
      updateDateDisplay()
      setInterval(updateDateDisplay, 60000)

      // Route
      routeFromHash()
    },
    () => {
      // Signed out
      location.reload()
    }
  )
}

main()
