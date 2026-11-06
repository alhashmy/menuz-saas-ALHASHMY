import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

interface OverviewProps {
  monthlyRevenue: { month: string; revenue: number }[]
}

export function Overview({ monthlyRevenue }: OverviewProps) {
  const data = monthlyRevenue.length > 0 ? monthlyRevenue : [
    { month: 'jan', revenue: 0 },
    { month: 'feb', revenue: 0 },
    { month: 'mar', revenue: 0 },
    { month: 'apr', revenue: 0 },
    { month: 'may', revenue: 0 },
    { month: 'jun', revenue: 0 },
    { month: 'jul', revenue: 0 },
    { month: 'aug', revenue: 0 },
    { month: 'sep', revenue: 0 },
    { month: 'oct', revenue: 0 },
    { month: 'nov', revenue: 0 },
    { month: 'dec', revenue: 0 },
  ]

  return (
    <ResponsiveContainer width='100%' height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey='month'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          direction='ltr'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `د.ع ${value}`}
        />
        <Bar
          dataKey='revenue'
          fill='currentColor'
          radius={[4, 4, 0, 0]}
          className='fill-primary'
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
