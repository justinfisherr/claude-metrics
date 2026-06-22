export const GR = {
  grid: 'rgba(93, 155, 224, 0.12)',
  tick: '#87a2c3',
  label: '#87a2c3',
};

export const CLUSTER_COLORS = ['#4a9eff', '#50c878', '#ffc144', '#ff6b6b'];

export function ratingColor(r) {
  if (r >= 9) return '#50c878';
  if (r >= 7) return '#4a9eff';
  if (r >= 5) return '#ffc144';
  return '#ff6b6b';
}
