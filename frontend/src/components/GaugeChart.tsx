interface GaugeChartProps {
  title: string;
  actual: number;
  target: number;
  color: string;
  format?: (value: number) => string;
  lowerIsBetter?: boolean; // true for cost metrics like COGS/OpEx, where under-target is good
}

const TRACK_COLOR = '#E5E7EB';
const TICK_COLOR = '#374151';

// Standard polar->cartesian helper. Angle convention: 0deg = top (12 o'clock),
// increases clockwise. -90 = left (9 o'clock), 90 = right (3 o'clock).
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function GaugeChart({
  title,
  actual,
  target,
  color,
  format = (v) => v.toLocaleString(),
  lowerIsBetter = false,
}: GaugeChartProps) {
  const max = Math.max(actual, target, 1) * 1.25;
  const valuePct = Math.max(0, Math.min(1, actual / max));
  const targetPct = Math.max(0, Math.min(1, target / max));

  const valueAngle = -90 + valuePct * 180;
  const targetAngle = -90 + targetPct * 180;

  const cx = 100;
  const cy = 95;
  const r = 75;
  const strokeWidth = 16;

  const tickStart = polarToCartesian(cx, cy, r - strokeWidth / 2 - 4, targetAngle);
  const tickEnd = polarToCartesian(cx, cy, r + strokeWidth / 2 + 4, targetAngle);

  const achievedPct = target !== 0 ? (actual / target) * 100 : 0;
  const isGood = lowerIsBetter ? actual <= target : actual >= target;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{title}</p>

      <svg viewBox="0 0 200 115" className="w-full max-w-[220px]">
        {/* background track */}
        <path
          d={describeArc(cx, cy, r, -90, 90)}
          fill="none"
          stroke={TRACK_COLOR}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* actual value fill */}
        <path
          d={describeArc(cx, cy, r, -90, valueAngle)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* target tick mark */}
        <line
          x1={tickStart.x}
          y1={tickStart.y}
          x2={tickEnd.x}
          y2={tickEnd.y}
          stroke={TICK_COLOR}
          strokeWidth={3}
        />
      </svg>

      <div className="text-center -mt-2">
        <p className="text-xl font-bold text-gray-900 dark:text-white">{format(actual)}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Budget: {format(target)}</p>
        <p className={`text-xs font-semibold mt-1 ${isGood ? 'text-green-600' : 'text-red-600'}`}>
          {achievedPct.toFixed(1)}% of Budget
        </p>
      </div>
    </div>
  );
}