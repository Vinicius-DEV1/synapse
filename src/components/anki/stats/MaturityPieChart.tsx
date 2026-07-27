import React from 'react';
import { BrainCircuit } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface MaturityPieChartProps {
  maturityData: { name: string; value: number; color: string }[];
}

export function MaturityPieChart({ maturityData }: MaturityPieChartProps) {
  return (
    <div className="bg-dark-card border border-white/5 p-6 rounded-2xl">
      <div className="flex items-center gap-2 mb-2">
        <BrainCircuit className="text-emerald-400" size={20} />
        <h3 className="text-lg font-semibold text-white">Maturidade do Conhecimento</h3>
      </div>
      <p className="text-xs text-dark-subtext mb-6">Como está a saúde da sua memória de longo prazo.</p>
      <div className="h-64 w-full flex items-center justify-center">
        {maturityData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={maturityData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {maturityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#ffffff10', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <span className="text-dark-subtext">Sem dados suficientes</span>
        )}
      </div>
      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        {maturityData.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{backgroundColor: d.color}}></div>
            <span className="text-dark-subtext">{d.name} <span className="text-white font-medium">({d.value})</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
