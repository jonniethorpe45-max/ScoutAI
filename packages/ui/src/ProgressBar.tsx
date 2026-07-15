import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
  label?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function ProgressBar({
  value,
  max = 100,
  className,
  trackClassName,
  fillClassName,
  label,
  style,
  children,
  ...rest
}: ProgressBarProps) {
  const safeMax = max <= 0 ? 100 : max;
  const pct = Math.max(0, Math.min(100, Math.round((value / safeMax) * 100)));

  return (
    <div className={className} style={style} {...rest}>
      {label ? <div className="progressBarLabel">{label}</div> : null}
      <div
        className={trackClassName ?? 'progressBarTrack'}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div className={fillClassName ?? 'progressBarFill'} style={{ width: `${pct}%` }} />
      </div>
      {children}
    </div>
  );
}
