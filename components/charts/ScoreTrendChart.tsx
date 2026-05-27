"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface ScoreTrendChartProps {
  data: any[];
}

export default function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            stroke="rgba(255,255,255,0.4)"
            fontSize={10}
            tickLine={false}
          />
          <YAxis
            stroke="rgba(255,255,255,0.4)"
            fontSize={10}
            tickLine={false}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#081e16",
              border: "1px solid rgba(15,110,86,0.2)",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "11px",
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            name="Score %"
            stroke="#0F6E56"
            strokeWidth={3}
            activeDot={{ r: 6 }}
            dot={{ stroke: "#0F6E56", strokeWidth: 2, fill: "#081810", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
