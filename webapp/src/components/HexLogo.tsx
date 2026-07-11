export default function HexLogo({ size = 28 }: { size?: number }) {
  const h = Math.round(size * 1.14);
  return (
    <svg className="hex-logo" width={size} height={h} viewBox="0 0 28 32" aria-hidden>
      <polygon
        points="14,1 27,8 27,24 14,31 1,24 1,8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="14" cy="16" r="4" fill="currentColor" />
    </svg>
  );
}
