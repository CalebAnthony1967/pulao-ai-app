import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CATEGORY_COLOURS = ["#0f3a63", "#15805b", "#b4791b", "#b02a2a", "#2b6f8f"];

function Panel({ title, description, children }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 h-72 w-full">{children}</div>
    </div>
  );
}

export function StatutoryBottlenecks({ data }) {
  const rows = (data || []).map((row) => ({
    name: row.check_name,
    "Failed checks": Number(row.failures) || 0,
    "Passed checks": Math.max(0, (Number(row.total) || 0) - (Number(row.failures) || 0)),
  }));

  return (
    <Panel
      title="Where bids fail the statute"
      description="Failure counts per statutory requirement across every audited bid. Taller bars show where PPADA compliance breaks down most often."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 22% 88%)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={54} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Passed checks" stackId="a" fill="#15805b" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Failed checks" stackId="a" fill="#b02a2a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function PriceVarianceByEntity({ data }) {
  const rows = (data || [])
    .filter((row) => Number(row.evaluations) > 0)
    .map((row) => ({ name: row.entity, variance: Number(row.avg_variance) || 0 }));

  return (
    <Panel
      title="Average price drift by procuring entity"
      description="How far quoted prices sit above the published market index, averaged per procuring entity."
    >
      {rows.length === 0 ? (
        <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No audited bids yet — run an audit in the evaluation room to populate this view.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 22% 88%)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(value) => value + "%"} />
            <Bar dataKey="variance" fill="#0f3a63" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

export function SpendByCategory({ data }) {
  const rows = (data || [])
    .filter((row) => Number(row.bids) > 0)
    .map((row) => ({ name: row.category, value: Number(row.value) || 0 }));

  return (
    <Panel
      title="Where the money is going"
      description="Total value of bids lodged, grouped by the category of goods, works or services."
    >
      {rows.length === 0 ? (
        <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No bids have been lodged yet.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
              {rows.map((entry, index) => (
                <Cell key={entry.name} fill={CATEGORY_COLOURS[index % CATEGORY_COLOURS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 10, fontSize: 12 }}
              formatter={(value) => "KES " + Number(value).toLocaleString("en-KE")}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}