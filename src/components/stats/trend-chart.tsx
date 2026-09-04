type Point = { date: Date; value: number };

export function TrendChart({
  points,
  variant = "line",
  formatValue = (value) => String(value),
}: {
  points: Point[];
  variant?: "line" | "bar";
  formatValue?: (value: number) => string;
}) {
  if (points.length === 0) {
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

  const values = points.map((p) => p.value);
  const maxValue = Math.max(...values);
  const minValue = variant === "bar" ? 0 : Math.min(...values);
  const range = maxValue - minValue || 1;

  function yFor(value: number) {
    return paddingTop + plotHeight - ((value - minValue) / range) * plotHeight;
  }

  function xFor(index: number) {
    if (points.length === 1) return paddingLeft + plotWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * plotWidth;
  }

  const labelCount = Math.min(4, points.length);
  const labelIndices = Array.from(
    new Set(
      Array.from({ length: labelCount }, (_, i) =>
        Math.round((i * (points.length - 1)) / Math.max(labelCount - 1, 1)),
      ),
    ),
  );

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

      {variant === "bar"
        ? points.map((point, i) => {
            const barWidth = Math.max(plotWidth / points.length - 4, 2);
            const y = yFor(point.value);
            return (
              <rect
                key={i}
                x={xFor(i) - barWidth / 2}
                y={y}
                width={barWidth}
                height={paddingTop + plotHeight - y}
                fill="currentColor"
                opacity={0.7}
                rx={1}
              />
            );
          })
        : (
            <path
              d={points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p.value)}`).join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            />
          )}

      {variant === "line" &&
        points.map((point, i) => <circle key={i} cx={xFor(i)} cy={yFor(point.value)} r={2.5} fill="currentColor" />)}

      {labelIndices.map((i) => (
        <text key={i} x={xFor(i)} y={height - 6} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.6}>
          {points[i].date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
        </text>
      ))}
    </svg>
  );
}
