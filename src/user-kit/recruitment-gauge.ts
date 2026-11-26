export function recruitmentGauge(applied: number, capacity: number) {
  if (capacity <= 0) return null;
  const percent = Math.min(100, Math.max(0, Math.floor((applied * 100) / capacity)));
  const tone = percent < 50 ? 'info' : percent < 80 ? 'warning' : 'danger';
  return { percent, tone } as const;
}
