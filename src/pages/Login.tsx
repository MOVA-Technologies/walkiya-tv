import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const nav = useNavigate()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return setMsg('Supabase is not configured.')
    setBusy(true); setMsg('')
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg('Wrong email or password.'); else nav('/admin')
    } else {
      if (password.length < 8) { setBusy(false); return setMsg('Password must be at least 8 characters.') }
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      setMsg(error ? error.message : 'Account created. Check your email to confirm, then sign in.')
    }
    setBusy(false)
  }
  const input = 'w-full rounded border border-slate-300 px-3 py-2 outline-none focus:border-navy-700'
  return <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
    <form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white p-6 shadow">
      <Link to="/en" className="block text-center font-serif text-3xl font-black text-navy-900">WALKIYA <span className="text-breaking">TV</span></Link>
      <p className="mb-5 mt-1 text-center text-sm text-slate-500">{mode === 'in' ? 'Staff sign in' : 'Create staff account'}</p>
      <div className="space-y-3">
        {mode === 'up' && <input className={input} placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />}
        <input className={input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className={input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
      </div>
      {msg && <p className="mt-3 text-sm text-breaking">{msg}</p>}
      <button disabled={busy} className="mt-4 w-full rounded bg-navy-800 py-2 font-semibold text-white disabled:opacity-60">{busy ? '...' : mode === 'in' ? 'Sign in' : 'Sign up'}</button>
      <button type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg('') }} className="mt-3 w-full text-sm text-navy-700 underline">
        {mode === 'in' ? 'Need an account? Sign up' : 'Have an account? Sign in'}</button>
    </form>
  </div>
}
