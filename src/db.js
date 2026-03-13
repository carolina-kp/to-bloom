import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── User ID (set by auth.js) ─────────────────────────────────────
let _uid = null
export function setUid(id) { _uid = id }
export function getUid()   { return _uid }

// ── Generic helpers ──────────────────────────────────────────────
const from = (t) => supabase.from(t)

async function all(table, order = 'created_at') {
  const { data, error } = await from(table).select('*').eq('user_id', _uid).order(order)
  if (error) throw error
  return data || []
}

async function ins(table, obj) {
  const { error } = await from(table).insert({ ...obj, user_id: _uid })
  if (error) throw error
}

async function upd(table, id, patch) {
  const { error } = await from(table).update(patch).eq('id', id).eq('user_id', _uid)
  if (error) throw error
}

async function del(table, id) {
  const { error } = await from(table).delete().eq('id', id).eq('user_id', _uid)
  if (error) throw error
}

// ── TASKS ────────────────────────────────────────────────────────
export const db = {
  tasks: {
    list: ()                  => all('tasks'),
    add:  (obj)               => ins('tasks', obj),
    update: (id, patch)       => upd('tasks', id, patch),
    delete: (id)              => del('tasks', id),
  },

  courses: {
    list: ()                  => all('courses'),
    add:  (obj)               => ins('courses', obj),
    delete: (id)              => del('courses', id),
  },

  timetable: {
    list: ()                  => all('timetable_slots'),
    add:  (obj)               => ins('timetable_slots', obj),
    delete: (id)              => del('timetable_slots', id),
  },

  grades: {
    list: ()                  => all('grade_entries'),
    add:  (obj)               => ins('grade_entries', obj),
    delete: (id)              => del('grade_entries', id),
  },

  budget: {
    entries: {
      list:   (month)         => from('budget_entries').select('*').eq('user_id', _uid).eq('month', month).order('date', { ascending: false }).then(r => { if(r.error) throw r.error; return r.data||[] }),
      add:    (obj)           => ins('budget_entries', obj),
      delete: (id)            => del('budget_entries', id),
    },
    goals: {
      list:   ()              => all('budget_goals'),
      add:    (obj)           => ins('budget_goals', obj),
      update: (id, patch)     => upd('budget_goals', id, patch),
      delete: (id)            => del('budget_goals', id),
    },
  },

  resources: {
    list: ()                  => all('resources'),
    add:  (obj)               => ins('resources', obj),
    update: (id, patch)       => upd('resources', id, patch),
    delete: (id)              => del('resources', id),
  },

  goals: {
    list: ()                  => all('goals'),
    add:  (obj)               => ins('goals', obj),
    update: (id, patch)       => upd('goals', id, patch),
    delete: (id)              => del('goals', id),
  },

  wellness: {
    list:   ()                => all('wellness_logs', 'date'),
    upsert: (obj)             => from('wellness_logs').upsert({ ...obj, user_id: _uid }, { onConflict: 'user_id,date' }).then(r => { if(r.error) throw r.error }),
    today:  ()                => from('wellness_logs').select('*').eq('user_id', _uid).eq('date', fmtDate(new Date())).single().then(r => r.data),
  },
}

// ── Realtime ─────────────────────────────────────────────────────
export function subscribeAll(onChange) {
  return supabase.channel('bloom-realtime')
    .on('postgres_changes', { event:'*', schema:'public', table:'tasks' },          onChange)
    .on('postgres_changes', { event:'*', schema:'public', table:'courses' },        onChange)
    .on('postgres_changes', { event:'*', schema:'public', table:'timetable_slots' },onChange)
    .on('postgres_changes', { event:'*', schema:'public', table:'grade_entries' },  onChange)
    .on('postgres_changes', { event:'*', schema:'public', table:'budget_entries' }, onChange)
    .on('postgres_changes', { event:'*', schema:'public', table:'budget_goals' },   onChange)
    .on('postgres_changes', { event:'*', schema:'public', table:'resources' },      onChange)
    .on('postgres_changes', { event:'*', schema:'public', table:'goals' },          onChange)
    .on('postgres_changes', { event:'*', schema:'public', table:'wellness_logs' },  onChange)
    .subscribe()
}

// ── Shared utils ─────────────────────────────────────────────────
export function genId() { return crypto.randomUUID() }
export function fmtDate(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth()+1).padStart(2,'0') + '-' +
    String(d.getDate()).padStart(2,'0')
}
export function parseDate(s) {
  if (!s) return null
  const [y,m,d] = s.split('-').map(Number)
  return new Date(y, m-1, d)
}
