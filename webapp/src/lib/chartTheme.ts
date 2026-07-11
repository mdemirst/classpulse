export const CHART = {
  series: "#3987e5",
  grid: "#3a3a38",
  axis: "#8a897f",
  highlight: "#fab219",
  tooltipBg: "#242423",
  tooltipBorder: "#3a3a38",
} as const;

export const tooltipStyle = {
  background: CHART.tooltipBg,
  border: `1px solid ${CHART.tooltipBorder}`,
  borderRadius: 8,
  fontSize: 12,
};

export const axisProps = {
  stroke: CHART.axis,
  fontSize: 12,
  tickLine: false as const,
};
