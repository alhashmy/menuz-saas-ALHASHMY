import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

interface AnalyticsChartProps {
  monthlyRevenue: { month: string; revenue: number }[]
}

export function AnalyticsChart({ monthlyRevenue }: AnalyticsChartProps) {
  const data =
    monthlyRevenue.length > 0
      ? monthlyRevenue.map((m) => ({ name: m.month, revenue: m.revenue }))
      : [
          { name: 'jan', revenue: 0 },
          { name: 'feb', revenue: 0 },
          { name: 'mar', revenue: 0 },
          { name: 'apr', revenue: 0 },
          { name: 'may', revenue: 0 },
          { name: 'jun', revenue: 0 },
          { name: 'jul', revenue: 0 },
          { name: 'aug', revenue: 0 },
          { name: 'sep', revenue: 0 },
          { name: 'oct', revenue: 0 },
          { name: 'nov', revenue: 0 },
          { name: 'dec', revenue: 0 },
        ]

  return (
    <ResponsiveContainer width='100%' height={300}>
      <AreaChart data={data}>
        <XAxis
          dataKey='name'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `د.ع ${value}`}
        />
        <Area
          type='monotone'
          dataKey='revenue'
          stroke='currentColor'
          className='text-primary'
          fill='currentColor'
          fillOpacity={0.15}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
