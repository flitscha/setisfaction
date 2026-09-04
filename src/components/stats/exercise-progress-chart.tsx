export function ExerciseProgressChart({ points }: { points: { performedAt: Date; value: number }[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-gray-500">No sets logged for this exercise yet.</p>;
  }

  const width = 300;
  const height = 120;
  const padding = 12;

  const values = points.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const coords = points.map((point, i) => {
    const x = points.length === 1 ? width / 2 : padding + (i / (points.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((point.value - minValue) / range) * (height - 2 * padding);
    return { x, y };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3} fill="currentColor" />
      ))}
    </svg>
  );
}
