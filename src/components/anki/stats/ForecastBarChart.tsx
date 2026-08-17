import { Calendar as CalendarIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ForecastBarChartProps {
  forecastData: { name: string; futuras: number }[];
}

export function ForecastBarChart({ forecastData }: ForecastBarChartProps) {
  return (
    <div className="bg-dark-card border border-white/5 p-6 rounded-2xl">
      <div className="flex items-center gap-2 mb-6">
        <CalendarIcon className="text-orange-400" size={20} />
        <h3 className="text-lg font-semibold text-white">Previsão (Próximos 14 dias)</h3>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} minTickGap={10} />
            <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip 
              cursor={{ fill: '#ffffff05' }}
              contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#ffffff10', borderRadius: '8px' }}
            />
            <Bar dataKey="futuras" fill="#f97316" radius={[4, 4, 0, 0]} name="A Revisar" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
