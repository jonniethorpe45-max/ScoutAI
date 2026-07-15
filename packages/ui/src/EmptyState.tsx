import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function EmptyState({
  title,
  description,
  className,
  style,
  children,
  ...rest
}: EmptyStateProps) {
  const classes = ['emptyState', className].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style} {...rest}>
      <h3 className="emptyStateTitle">{title}</h3>
      {description ? <p className="emptyStateDescription">{description}</p> : null}
      {children}
    </div>
  );
}
