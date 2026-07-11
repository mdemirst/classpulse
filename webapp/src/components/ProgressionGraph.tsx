/** Abstract multi-line progression graph for the landing hero. */
export default function ProgressionGraph() {
  return (
    <svg
      className="progression-graph"
      viewBox="0 0 480 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="pg-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3987e5" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#3987e5" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pg-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ca30c" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0ca30c" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pg-amber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fab219" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fab219" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pg-coral" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ec835a" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ec835a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pg-violet" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#9085e9" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#3987e5" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="480" height="320" fill="url(#pg-violet)" rx="16" />

      {[80, 140, 200, 260].map((y) => (
        <line key={y} x1="40" y1={y} x2="460" y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      ))}

      <path
        d="M40 240 C100 220, 140 200, 180 190 S260 150, 320 130 S400 100, 460 72"
        fill="url(#pg-blue)"
      />
      <path
        className="progression-line line-blue"
        d="M40 240 C100 220, 140 200, 180 190 S260 150, 320 130 S400 100, 460 72"
        stroke="#3987e5"
        strokeWidth="4"
      />

      <path
        d="M40 260 C120 250, 160 220, 200 210 S280 170, 340 155 S410 140, 460 118"
        fill="url(#pg-green)"
      />
      <path
        className="progression-line line-green"
        d="M40 260 C120 250, 160 220, 200 210 S280 170, 340 155 S410 140, 460 118"
        stroke="#0ca30c"
        strokeWidth="4"
      />

      <path
        d="M40 200 L100 175 L140 210 L200 160 L260 185 L320 120 L380 150 L460 95 L460 280 L40 280Z"
        fill="url(#pg-amber)"
      />
      <path
        className="progression-line line-amber"
        d="M40 200 L100 175 L140 210 L200 160 L260 185 L320 120 L380 150 L460 95"
        stroke="#fab219"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      <path
        className="progression-line line-coral"
        d="M40 230 C80 225, 120 200, 160 215 S220 250, 280 200 S360 120, 460 88"
        stroke="#ec835a"
        strokeWidth="3.5"
        strokeDasharray="8 5"
      />

      {[
        { cx: 180, cy: 190, c: "#3987e5" },
        { cx: 320, cy: 130, c: "#3987e5" },
        { cx: 460, cy: 72, c: "#3987e5" },
        { cx: 260, cy: 185, c: "#fab219" },
        { cx: 460, cy: 88, c: "#ec835a" },
        { cx: 340, cy: 155, c: "#0ca30c" },
      ].map((n, i) => (
        <g key={i}>
          <circle cx={n.cx} cy={n.cy} r="14" fill={n.c} opacity="0.25" />
          <circle cx={n.cx} cy={n.cy} r="6" fill={n.c} />
        </g>
      ))}

      <circle className="progression-pulse" cx="460" cy="72" r="20" stroke="#3987e5" strokeWidth="2" opacity="0.6" />
      <circle className="progression-pulse delay" cx="460" cy="88" r="16" stroke="#ec835a" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}
