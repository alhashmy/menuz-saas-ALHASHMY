import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

interface OverviewProps {
  monthlyRevenue: { month: string; revenue: number }[]
}

export function Overview({ monthlyRevenue }: OverviewProps) {
  const data =
    monthlyRevenue.length > 0
      ? monthlyRevenue
      : [
          { month: 'كانون الثاني', revenue: 0 },
          { month: 'شباط', revenue: 0 },
          { month: 'آذار', revenue: 0 },
          { month: 'نيسان', revenue: 0 },
          { month: 'أيار', revenue: 0 },
          { month: 'حزيران', revenue: 0 },
          { month: 'تموز', revenue: 0 },
          { month: 'آب', revenue: 0 },
          { month: 'أيلول', revenue: 0 },
          { month: 'تشرين الأول', revenue: 0 },
          { month: 'تشرين الثاني', revenue: 0 },
          { month: 'كانون الأول', revenue: 0 },
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
