import React, { useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { registerUser, loginUser, getProfile } from '../lib/api'
import authStore from '../store/auth'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'

export default function Auth() {
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [domain, setDomain] = useState('AI/ML')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setToken = authStore(s=>s.setToken)
  const setUser = authStore(s=>s.setUser)

  async function onSubmit() {
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (!email || !password || !name) throw new Error('Missing fields')
        await registerUser({ name, email, password, domain })
        toast.success('Registration successful')
        setMode('login')
      } else {
        if (!email || !password) throw new Error('Missing credentials')
        const { data } = await loginUser({ email, password })
        setToken(data.access_token)
        const prof = await getProfile()
        setUser(prof.data)
        navigate('/dashboard')
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e?.message || 'Failed')
    } finally { setLoading(false) }
  }
  return (
    <div className="min-h-[70vh] grid place-items-center p-6">
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-xl">{mode === 'login' ? 'Welcome back' : 'Create account'}</div>
          <button className="text-sm text-brand-blue" onClick={()=>setMode(mode==='login'?'signup':'login')}>
            {mode==='login' ? 'Sign up' : 'Log in'}
          </button>
        </div>
        <div className="space-y-3">
          {mode==='signup' && (
            <>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" className="w-full border rounded-lg px-3 py-2" />
              <select value={domain} onChange={e=>setDomain(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                {['Cybersecurity','AI/ML','Data Science','Web Development','Cloud','Robotics','IoT'].map(d=> <option key={d} value={d}>{d}</option>)}
              </select>
            </>
          )}
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded-lg px-3 py-2" />
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" className="w-full border rounded-lg px-3 py-2" />
          <Button onClick={onSubmit} disabled={loading} className="w-full">{loading ? 'Please wait…' : (mode==='login'?'Login':'Create account')}</Button>
          <Button variant="ghost" className="w-full">Continue with Google</Button>
        </div>
      </Card>
    </div>
  )
}


