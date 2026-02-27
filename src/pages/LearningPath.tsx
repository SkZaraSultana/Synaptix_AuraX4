import React, { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import { getUserDomain, getRecommendations } from '../lib/api'

export default function LearningPath() {
  const [domain, setDomain] = useState('AI/ML')
  const [items, setItems] = useState<any[]>([])
  useEffect(() => {
    getUserDomain().then(r => {
      const d = r.data.domains?.[0] || 'AI/ML'
      setDomain(d)
      getRecommendations(d).then(res => setItems(res.data.items || []))
    })
  }, [])
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <Card>
        <div className="font-display text-xl mb-2">Personalized Recommendations</div>
        <div className="text-sm text-slate-600 mb-3">Domain: {domain}</div>
        <ul className="space-y-2 text-sm">
          {items.map((it:any) => (
            <li key={it.title} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <a href={it.url} target="_blank" rel="noreferrer" className="text-brand-blue hover:underline">{it.title}</a>
              <span className="ml-2 text-xs text-slate-500">{it.source}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}


