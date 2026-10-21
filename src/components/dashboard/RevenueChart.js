import { useId } from 'react';
import './RevenueChart.css';

const WIDTH = 760;
const HEIGHT = 280;
const PADDING = { top: 20, right: 20, bottom: 40, left: 56 };

function niceCeil(value) {
  if (value <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  let step;
  if (normalized <= 1) step = 1;
  else if (normalized <= 2) step = 2;
  else if (normalized <= 5) step = 5;
  else step = 10;
  return step * magnitude;
}

function formatAmount(value) {
  return value.toLocaleString('en-US');
}

function RevenueChart({ points }) {
  const gradientId = useId();

  if (!points || points.length === 0) {
    return <p className="chart-empty">No revenue data available yet.</p>;
  }

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const maxValue = niceCeil(Math.max(...points.map((p) => p.value), 0));

  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const value = (maxValue / tickCount) * i;
    const y = PADDING.top + plotHeight - (value / maxValue) * plotHeight;
    return { value, y };
  });

  const slot = plotWidth / points.length;
  const barWidth = Math.min(46, slot * 0.55);

  return (
    <div className="revenue-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="revenue-chart-svg"
        role="img"
        aria-label="Revenue by day"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a23b8" />
            <stop offset="100%" stopColor="#191489" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PADDING.left}
              y1={tick.y}
              x2={WIDTH - PADDING.right}
              y2={tick.y}
              className="chart-gridline"
            />
            <text x={PADDING.left - 10} y={tick.y + 4} className="chart-axis-label" textAnchor="end">
              {formatAmount(tick.value)}
            </text>
          </g>
        ))}

        {points.map((point, index) => {
          const barHeight = (point.value / maxValue) * plotHeight;
          const x = PADDING.left + slot * index + (slot - barWidth) / 2;
          const y = PADDING.top + plotHeight - barHeight;
          return (
            <g key={`${point.label}-${index}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 0)}
                rx="6"
                fill={`url(#${gradientId})`}
                className="chart-bar"
              >
                <title>{`${point.label}: GHS ${formatAmount(point.value)}`}</title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={HEIGHT - PADDING.bottom + 20}
                className="chart-axis-label"
                textAnchor="middle"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default RevenueChart;
