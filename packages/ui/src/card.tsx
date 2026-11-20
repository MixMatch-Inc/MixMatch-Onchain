import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  children: ReactNode;
  /** Optional footer, typically actions. */
  footer?: ReactNode;
}

/** Plain surface for grouping content. It does not navigate; put a link or Button inside for that. */
export function Card({ title, children, footer, style, ...rest }: CardProps) {
  return (
    <section
      {...rest}
      style={{
        border: "1px solid var(--mm-color-border, #e5e7eb)",
        borderRadius: 12,
        padding: 16,
        background: "var(--mm-color-surface, transparent)",
        ...style,
      }}
    >
      {title ? <h2 style={{ fontSize: 18, marginBottom: 8 }}>{title}</h2> : null}
      <div>{children}</div>
      {footer ? <div style={{ marginTop: 12 }}>{footer}</div> : null}
    </section>
  );
}
