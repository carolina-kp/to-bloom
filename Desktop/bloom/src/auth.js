import { supabase, setUid } from './db.js'

const GUEST_KEY = 'bloom_guest_id'

// ── State ────────────────────────────────────────────────────────
export let currentUser  = null   // Supabase User | null
export let isGuest      = false
export let userId       = null   // the string used as user_id in DB rows

// ── Init ─────────────────────────────────────────────────────────
// Calls onReady(userId, isGuest) once auth state is known.
// Calls onSignOut() when user signs out.
export async function initAuth(onReady, onSignOut) {
  // Check existing session first
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.user) {
    _setUser(session.user, false)
    onReady(userId, false)
  } else {
    // Check for saved guest id
    const gid = localStorage.getItem(GUEST_KEY)
    if (gid) {
      _setGuest(gid)
      onReady(userId, true)
    } else {
      // Show auth overlay — wait for user action
      showAuthOverlay(onReady)
    }
  }

  // Listen for future auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      _setUser(session.user, false)
    } else if (!isGuest) {
      currentUser = null
      userId      = null
      setUid(null)
      onSignOut && onSignOut()
    }
  })
}

// ── Public actions ───────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  _setUser(data.user, false)
  return data.user
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  // Auto sign in after sign up (no email confirmation required in free tier by default)
  if (data.session) {
    _setUser(data.user, false)
  }
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
  isGuest     = false
  currentUser = null
  userId      = null
  setUid(null)
  localStorage.removeItem(GUEST_KEY)
}

export function continueAsGuest() {
  let gid = localStorage.getItem(GUEST_KEY)
  if (!gid) {
    gid = 'guest-' + crypto.randomUUID()
    localStorage.setItem(GUEST_KEY, gid)
  }
  _setGuest(gid)
}

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// ── Auth overlay UI ──────────────────────────────────────────────
function showAuthOverlay(onReady) {
  const overlay = document.getElementById('auth-overlay')
  overlay.classList.remove('hidden')

  const loginView  = document.getElementById('auth-login-view')
  const signupView = document.getElementById('auth-signup-view')
  const errEl      = document.getElementById('auth-error')
  const errEl2     = document.getElementById('auth-error-2')

  function hide(err = '') {
    overlay.classList.add('hidden')
    if (err) return
  }

  // Toggle views
  document.getElementById('goto-signup').addEventListener('click', () => {
    loginView.style.display  = 'none'
    signupView.style.display = 'block'
    errEl2.textContent = ''
  })
  document.getElementById('goto-login').addEventListener('click', () => {
    signupView.style.display = 'none'
    loginView.style.display  = 'block'
    errEl.textContent = ''
  })

  // Sign in
  document.getElementById('login-btn').addEventListener('click', async () => {
    errEl.textContent = ''
    const email = document.getElementById('login-email').value.trim()
    const pass  = document.getElementById('login-password').value
    if (!email || !pass) { errEl.textContent = 'please fill in all fields'; return }
    try {
      document.getElementById('login-btn').textContent = 'signing in…'
      await signIn(email, pass)
      hide()
      onReady(userId, false)
    } catch(e) {
      errEl.textContent = e.message || 'sign in failed'
      document.getElementById('login-btn').textContent = 'sign in'
    }
  })

  // Enter key on login
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('login-btn').click()
  })

  // Sign up
  document.getElementById('signup-btn').addEventListener('click', async () => {
    errEl2.textContent = ''
    const email   = document.getElementById('signup-email').value.trim()
    const pass    = document.getElementById('signup-pass').value
    const confirm = document.getElementById('signup-confirm').value
    if (!email || !pass) { errEl2.textContent = 'please fill in all fields'; return }
    if (pass !== confirm) { errEl2.textContent = 'passwords do not match'; return }
    if (pass.length < 6)  { errEl2.textContent = 'password must be at least 6 characters'; return }
    try {
      document.getElementById('signup-btn').textContent = 'creating…'
      const result = await signUp(email, pass)
      if (result.session) {
        hide()
        onReady(userId, false)
      } else {
        // Email confirmation required
        errEl2.textContent = '✅ check your email to confirm your account'
        errEl2.style.color = 'var(--mint-deep)'
        document.getElementById('signup-btn').textContent = 'create account'
      }
    } catch(e) {
      errEl2.textContent = e.message || 'sign up failed'
      document.getElementById('signup-btn').textContent = 'create account'
    }
  })

  // Guest buttons (both)
  function doGuest() {
    continueAsGuest()
    hide()
    onReady(userId, true)
  }
  document.getElementById('guest-btn').addEventListener('click', doGuest)
  document.getElementById('guest-btn-2').addEventListener('click', doGuest)
}

// ── Private helpers ──────────────────────────────────────────────
function _setUser(user, guest) {
  currentUser = user
  isGuest     = guest
  userId      = user.id
  setUid(user.id)
}

function _setGuest(gid) {
  currentUser = null
  isGuest     = true
  userId      = gid
  setUid(gid)
}
