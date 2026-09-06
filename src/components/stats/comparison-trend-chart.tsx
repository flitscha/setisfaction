type Point = { date: Date; value: number };
type Series = { label: string; points: Point[]; dashed?: boolean; colorClassName: string };

// Like TrendChart, but overlays 1-2 series on one time axis positioned by
// actual date (not array index) — the two people being compared rarely
// trained on the exact same days, so index-aligning them would misleadingly
// line up unrelated training days. Used only for a direct comparison; every
// other chart in the app keeps using plain TrendChart.
export function ComparisonTrendChart({
  series,
  formatValue = (value) => String(value),
}: {
  series: Series[];
  formatValue?: (value: number) => string;
}) {
  const nonEmpty = series.filter((s) => s.points.length > 0);
  const allPoints = nonEmpty.flatMap((s) => s.points);

  if (allPoints.length === 0) {
    return <p className="text-sm text-muted">Not enough data yet.</p>;
  }

  const width = 300;
  const height = 140;
  const paddingLeft = 30;
  const paddingRight = 8;
  const paddingTop = 12;
  const paddingBottom = 22;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const values = allPoints.map((p) => p.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = maxValue - minValue || 1;

  const times = allPoints.map((p) => p.date.getTime());
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);
  const timeRange = maxTime - minTime || 1;
  const isSingleDay = minTime === maxTime;

  function yFor(value: number) {
    return paddingTop + plotHeight - ((value - minValue) / valueRange) * plotHeight;
  }

  function xFor(date: Date) {
    if (isSingleDay) return paddingLeft + plotWidth / 2;
    return paddingLeft + ((date.getTime() - minTime) / timeRange) * plotWidth;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
      <line
        x1={paddingLeft}
        y1={paddingTop + plotHeight}
        x2={width - paddingRight}
        y2={paddingTop + plotHeight}
        stroke="currentColor"
        strokeOpacity={0.15}
      />

      <text x={paddingLeft - 4} y={paddingTop + 4} textAnchor="end" fontSize={8} fill="currentColor" opacity={0.6}>
        {formatValue(maxValue)}
      </text>
      <text x={paddingLeft - 4} y={paddingTop + plotHeight} textAnchor="end" fontSize={8} fill="currentColor" opacity={0.6}>
        {formatValue(minValue)}
      </text>

      {nonEmpty.map((s) => {
        const sorted = [...s.points].sort((a, b) => a.date.getTime() - b.date.getTime());
        return (
          <g key={s.label} className={s.colorClassName}>
            <path
              d={
                sorted.length === 1
                  ? `M${paddingLeft},${yFor(sorted[0].value)} L${width - paddingRight},${yFor(sorted[0].value)}`
                  : sorted.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.date)},${yFor(p.value)}`).join(" ")
              }
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray={s.dashed ? "4 3" : undefined}
            />
            {sorted.map((p, i) => (
              <circle key={i} cx={xFor(p.date)} cy={yFor(p.value)} r={2.5} fill="currentColor" />
            ))}
          </g>
        );
      })}

      {!isSingleDay && (
        <>
          <text x={paddingLeft} y={height - 6} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.6}>
            {new Date(minTime).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
          </text>
          <text x={width - paddingRight} y={height - 6} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.6}>
            {new Date(maxTime).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
          </text>
        </>
      )}
    </svg>
  );
}

export function ChartLegend({ series }: { series: Series[] }) {
  return (
    <div className="flex items-center gap-4 px-1">
      {series.map((s) => (
        <div key={s.label} className={`flex items-center gap-1.5 text-xs text-muted ${s.colorClassName}`}>
          <svg width={14} height={8} className="shrink-0">
            <line
              x1={0}
              y1={4}
              x2={14}
              y2={4}
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray={s.dashed ? "4 3" : undefined}
            />
          </svg>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}
