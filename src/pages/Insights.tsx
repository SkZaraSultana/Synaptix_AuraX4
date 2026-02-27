import React, { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import { Line, Scatter } from 'react-chartjs-2'
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend, ScatterController } from 'chart.js'
import { trendsSkills } from '../lib/api'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend, ScatterController)

export default function Insights() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { trendsSkills().then(r => setData(r.data)) }, [])

  const line = data ? {
    labels: data.labels,
    datasets: data.series.map((s:any, i:number) => ({
      label: s.name,
      data: s.data,
      borderColor: i===0 ? '#3B82F6' : '#9333EA',
      backgroundColor: i===0 ? 'rgba(59,130,246,0.2)' : 'rgba(147,51,234,0.2)',
      fill: true,
      tension: 0.35
    }))
  } : null

  const scatter = {
    datasets: [{
      label: 'Salary vs Demand',
      data: [{x:60,y:100},{x:70,y:120},{x:80,y:150},{x:90,y:180}],
      backgroundColor: '#3B82F6'
    }]
  }

  return (
    <div className="max-w-6xl mx-auto p-6 grid md:grid-cols-2 gap-4">
      <Card>
        <div className="font-medium mb-2">Top Trending Skills</div>
        {line ? <Line data={line} options={{ responsive: true, plugins: { legend: { display: true }}}} /> : 'Loading...'}
      </Card>
      <Card>
        <div className="font-medium mb-2">Salary vs Skill Demand</div>
        <Scatter data={scatter} options={{ responsive: true }} />
      </Card>
    </div>
  )
}


