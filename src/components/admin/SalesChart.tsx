/** Lightweight inline SVG area chart — no chart library needed. */
export default function SalesChart({ series }: { series: number[] }) {
  const data = series.length ? series : [0];
  const max = Math.max(...data, 1);
  const w = 100;
  const h = 34;
  const step = data.length > 1 ? w / (data.length - 1) : w;

  const pts = data.map((v, i) => [i * step, h - (v / max) * (h - 4) - 2]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-white">Revenue — last 14 days</h2>
          <p className="mt-1 text-[12px] text-white/40">
            Paid and delivered orders only
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-white">
            Rs {data.reduce((a, b) => a + b, 0).toLocaleString("en-PK")}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/35">
            Total
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="mt-6 h-40 w-full"
        role="img"
        aria-label="Revenue trend for the last 14 days"
      >
        <defs>
          <linearGradient id="sc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffa726" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffa726" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sc-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffc44d" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1="0" x2={w}
            y1={h * g} y2={h * g}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.3"
          />
        ))}

        <path d={area} fill="url(#sc-fill)" />
        <path
          d={line}
          fill="none"
          stroke="url(#sc-line)"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="mt-3 flex justify-between text-[10.5px] font-bold uppercase tracking-wider text-white/25">
        <span>14d ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
