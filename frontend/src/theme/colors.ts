// src/theme/colors.ts
export const THEME_COLORS = [
  '#5B89B5', // blue
  '#E5C16E', // gold
  '#A06B8C', // mauve
  '#4DAE8B', // green
  '#E08E4F', // orange
  '#6B6BA8', // indigo
  '#A8CC5C', // lime
  '#D9755C', // terracotta
  '#9669B5', // purple
  '#3DA9C9', // teal
  '#D45C6B', // rose
  '#C6CC4D', // chartreuse
];

export const PRIMARY = THEME_COLORS[0];
export const SECONDARY = THEME_COLORS[3];
export const TERTIARY = THEME_COLORS[4];

export const formatCurrency2dp = (value: number) =>
  `$${(value / 1_000_000).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} M`;
export const formatCurrency2dpGraph = (value: number) =>
  `$${(value / 1_000_000).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}M`;
export const formatPercent2dp = (value: number) => `${value.toFixed(2)}%`;