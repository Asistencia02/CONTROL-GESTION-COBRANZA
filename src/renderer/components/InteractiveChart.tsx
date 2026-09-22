import React from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface InteractiveChartProps {
  data: any[]
  type: 'line' | 'bar' | 'pie'
  dataKey: string | string[]
  xAxisDataKey?: string
  height?: number
  colors?: string[]
  title?: string
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
]

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  type,
  dataKey,
  xAxisDataKey = 'name',
  height = 300,
  colors = DEFAULT_COLORS,
  title,
}) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 sm:p-3 bg-slate-900 border border-slate-700 rounded shadow-lg">
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-xs sm:text-sm font-bold">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      {title && <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">{title}</h3>}
      
      <ResponsiveContainer width="100%" height={height}>
        {type === 'line' && (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={xAxisDataKey} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {Array.isArray(dataKey) ? (
              dataKey.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  dot={{ fill: colors[index % colors.length] }}
                  activeDot={{ r: 5 }}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={colors[0]}
                dot={{ fill: colors[0] }}
                activeDot={{ r: 5 }}
              />
            )}
          </LineChart>
        )}

        {type === 'bar' && (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={xAxisDataKey} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {Array.isArray(dataKey) ? (
              dataKey.map((key, index) => (
                <Bar key={key} dataKey={key} fill={colors[index % colors.length]} />
              ))
            ) : (
              <Bar dataKey={dataKey} fill={colors[0]} />
            )}
          </BarChart>
        )}

        {type === 'pie' && (
          <PieChart>
            <Pie
              data={data}
              dataKey={Array.isArray(dataKey) ? dataKey[0] : dataKey}
              nameKey={xAxisDataKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
