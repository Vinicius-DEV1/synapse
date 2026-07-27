import React from 'react';
import { PlusCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CreationLineChartProps {
  cardsCreatedData: { name: string; criados: number }[];
}

export function CreationLineChart({ cardsCreatedData }: CreationLineChartProps) {
  return (
    <div className="bg-dark-card border border-white/5 p-6 rounded-2xl">
      <div className="flex items-center gap-2 mb-6">
        <PlusCircle className="text-green-400" size={20} />
        <h3 className="text-lg font-semibold text-white">Cartões Criados (Últimos 30 dias)</h3>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={cardsCreatedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} minTickGap={20} />
            <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip 
              cursor={{ stroke: '#ffffff20', strokeWidth: 1, strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#ffffff10', borderRadius: '8px' }}
            />
            <Line type="monotone" dataKey="criados" stroke="#22c55e" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Criados" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
