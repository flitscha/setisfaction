type Point = { date: Date; value: number };

export function TrendChart({
  points,
  formatValue = (value) => String(value),
}: {
  points: Point[];
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

  // A single point can't show a trend, but a flat line (rather than one lone dot)
  // makes clear this is a line chart that will fill in as more days are logged.
  const isSinglePoint = points.length === 1;
  const values = points.map((p) => p.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;

  function yFor(value: number) {
    if (isSinglePoint) return paddingTop + plotHeight / 2;
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

  const flatY = yFor(values[0]);

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

      {isSinglePoint ? (
        <text x={paddingLeft - 4} y={flatY + 3} textAnchor="end" fontSize={8} fill="currentColor" opacity={0.6}>
          {formatValue(values[0])}
        </text>
      ) : (
        <>
          <text x={paddingLeft - 4} y={paddingTop + 4} textAnchor="end" fontSize={8} fill="currentColor" opacity={0.6}>
            {formatValue(maxValue)}
          </text>
          <text
            x={paddingLeft - 4}
            y={paddingTop + plotHeight}
            textAnchor="end"
            fontSize={8}
            fill="currentColor"
            opacity={0.6}
          >
            {formatValue(minValue)}
          </text>
        </>
      )}

      <path
        d={
          isSinglePoint
            ? `M${paddingLeft},${flatY} L${width - paddingRight},${flatY}`
            : points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p.value)}`).join(" ")
        }
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />

      {points.map((point, i) => (
        <circle key={i} cx={xFor(i)} cy={yFor(point.value)} r={2.5} fill="currentColor" />
      ))}

      {labelIndices.map((i) => (
        <text key={i} x={xFor(i)} y={height - 6} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.6}>
          {points[i].date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
        </text>
      ))}
    </svg>
  );
}
