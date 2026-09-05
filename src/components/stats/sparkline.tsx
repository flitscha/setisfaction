export function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;

  const width = 64;
  const height = 24;
  const padding = 2;

  // A single day of data can't show a trend, but a flat line reads clearly as
  // "a chart with more to come" — a lone dot is easy to miss entirely.
  if (values.length === 1) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-16 h-6 shrink-0 text-accent">
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="currentColor" strokeWidth={1.5} />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((value, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-16 h-6 shrink-0 text-accent">
      <polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}
