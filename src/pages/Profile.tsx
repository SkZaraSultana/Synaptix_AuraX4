import React, { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { getUserDomain, setUserDomain } from '../lib/api'
import { toast } from 'react-hot-toast'

const POPULAR = ['Cybersecurity','AI/ML','Data Science','Web Development','Cloud Computing','Robotics','IoT']

export default function Profile() {
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { getUserDomain().then(r => setSelected(r.data.domains)) }, [])

  function toggle(d: string) {
    setSelected(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev, d])
  }

  async function save() {
    setSaving(true)
    try {
      await setUserDomain(selected)
      toast.success('Preferences saved')
    } catch (e) {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Card>
        <div className="font-display text-xl mb-2">Select Your Focus Domains</div>
        <p className="text-sm text-slate-600 mb-4">Choose one or more domains to personalize recommendations.</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {POPULAR.map(d => (
            <button key={d} onClick={()=>toggle(d)} className={`p-4 rounded-xl border text-left transition hover:shadow-soft ${selected.includes(d)?'bg-gradient-to-r from-brand-blue/10 to-brand-purple/10 border-brand-blue/40':'bg-white/60 dark:bg-slate-800/40'}`}>
              <div className="font-medium">{d}</div>
              <div className="text-xs text-slate-500">{selected.includes(d) ? 'Selected' : 'Tap to select'}</div>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Preferences'}</Button>
        </div>
      </Card>
    </div>
  )
}


