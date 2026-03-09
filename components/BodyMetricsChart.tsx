'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'

type Metric = {
  date: string
  weight: number | null
  waist: number | null
  body_fat: number | null
}

type Props = {
  data: Metric[]
}

export default function BodyMetricsChart({ data }: Props) {
  const formatted = data.map(m => ({
    ...m,
    date: new Date(m.date).toLocaleDateString()
  }))

  return (
    <div className="w-full h-80 mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />

          <XAxis dataKey="date" stroke="#ccc" />
          <YAxis stroke="#ccc" />

          <Tooltip />

          <Line
            type="monotone"
            dataKey="weight"
            stroke="#22c55e"
            strokeWidth={3}
            dot={false}
          />

          <Line
            type="monotone"
            dataKey="waist"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={false}
          />

          <Line
            type="monotone"
            dataKey="body_fat"
            stroke="#ef4444"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}