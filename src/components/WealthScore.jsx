import React from "react";
import { ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";

export default function WealthScore({ score }) {
  const data = [
    {
      name: "Score",
      value: score,
      fill: score > 70 ? "#10b981" : score > 50 ? "#f59e0b" : "#ef4444",
    },
  ];

  return (
    <div className="relative flex items-center justify-center w-full h-32">
      <ResponsiveContainer>
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={180}
          endAngle={0}
          cy="70%"
        >
          <RadialBar
            minAngle={15}
            background
            clockWise
            dataKey="value"
            cornerRadius={10}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center mt-4">
        <span className="text-3xl font-bold text-slate-800">{score}</span>
        <span className="block text-[10px] text-slate-400 uppercase tracking-widest">
          Score
        </span>
      </div>
    </div>
  );
}
