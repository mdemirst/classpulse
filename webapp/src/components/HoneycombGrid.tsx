import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function HoneycombGrid({ children, className = "" }: Props) {
  return (
    <div className={`honeycomb-grid ${className}`.trim()}>
      {children}
    </div>
  );
}
