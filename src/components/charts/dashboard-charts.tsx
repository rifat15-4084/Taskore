"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { STATUS_COLUMNS } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  todo: "#64748b",
  in_progress: "#06b6d4",
  in_review: "#8b5cf6",
  hold: "#f59e0b",
  completed: "#10b981",
};

const chartTheme = {
  tooltip: {
    contentStyle: {
      background: "hsl(240 5% 16%)",
      border: "1px solid hsl(240 5% 25%)",
      borderRadius: "8px",
      fontSize: "12px",
    },
    labelStyle: { color: "hsl(0 0% 85%)" },
  },
};

export function TasksByStatusPie({ data }: { data: { _id: string; count: number }[] }) {
  const rows = STATUS_COLUMNS.map((c) => ({
    name: c.label,
    value: data.find((d) => d._id === c.status)?.count ?? 0,
    color: STATUS_COLORS[c.status],
  })).filter((r) => r.value > 0);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No task data yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
          {rows.map((r) => (
            <Cell key={r.name} fill={r.color} stroke="transparent" />
          ))}
        </Pie>
        <Legend
          formatter={(value) => <span style={{ color: "hsl(0 0% 70%)", fontSize: 12 }}>{value}</span>}
        />
        <Tooltip {...chartTheme.tooltip} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TasksPerMemberBar({
  data,
}: {
  data: { _id: string; count: number; name: string }[];
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No assignments yet</p>;
  }
  const rows = data.map((d) => ({ name: d.name.split(" ")[0], count: d.count }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 22%)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} allowDecimals={false} />
        <Tooltip {...chartTheme.tooltip} cursor={{ fill: "hsl(240 5% 22% / 0.4)" }} />
        <Bar dataKey="count" name="Tasks" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CompletionTrendLine({ data }: { data: { date: string; count: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: d.date.slice(5) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 22%)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} interval={6} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} allowDecimals={false} />
        <Tooltip {...chartTheme.tooltip} />
        <Line
          type="monotone"
          dataKey="count"
          name="Completed"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
