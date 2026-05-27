"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface ClassPerformanceChartProps {
  data: Array<{ subject: string; score: number }>;
}

export default function ClassPerformanceChart({ data }: ClassPerformanceChartProps) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="subject"
            stroke="rgba(255,255,255,0.4)"
            fontSize={10}
            tickLine={false}
            tickFormatter={(value) => {
              // Truncate long subject names
              return value.length > 12 ? value.substring(0, 10) + "..." : value;
            }}
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
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar
            dataKey="score"
            name="Avg Score %"
            fill="#0F6E56"
            radius={[6, 6, 0, 0]}
            maxBarSize={45}
            animationDuration={1000}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
