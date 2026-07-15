import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

function toneFromStatus(status?: string): StatusBadgeProps['tone'] {
  const normalized = (status ?? '').toUpperCase();
  if (['PUBLISHED', 'ACTIVE', 'PUBLIC', 'COMPLETE', 'OK', 'READY'].includes(normalized)) {
    return 'success';
  }
  if (['DRAFT', 'PENDING', 'PRIVATE', 'CONNECTIONS'].includes(normalized)) {
    return 'warning';
  }
  if (['ARCHIVED', 'REVOKED', 'ERROR', 'DENIED'].includes(normalized)) {
    return 'danger';
  }
  return 'neutral';
}

export function StatusBadge({
  status,
  tone,
  className,
  style,
  children,
  ...rest
}: StatusBadgeProps) {
  const resolvedTone = tone ?? toneFromStatus(status);
  const classes = ['statusBadge', `statusBadge--${resolvedTone}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} style={style} {...rest}>
      {children ?? status ?? 'Unknown'}
    </span>
  );
}
