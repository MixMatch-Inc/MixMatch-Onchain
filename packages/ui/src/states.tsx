import type { ReactNode } from "react";

export interface StateProps {
  message: ReactNode;
  icon?: string;
  action?: { label: string; onClick: () => void };
}

function Box({ role, icon, message, action }: StateProps & { role?: "alert" | "status" }) {
  return (
    <div role={role} style={{ textAlign: "center", padding: 24 }}>
      {icon ? <div aria-hidden="true" style={{ fontSize: 28 }}>{icon}</div> : null}
      <p>{message}</p>
      {action ? <button type="button" onClick={action.onClick}>{action.label}</button> : null}
    </div>
  );
}

/** Empty list placeholder (#1420). */
export function EmptyState(props: StateProps) {
  return <Box role="status" icon="∅" {...props} />;
}

/** Failed-load placeholder with a retry action; announced to assistive technology. */
export function ErrorState({ action, ...rest }: StateProps) {
  return <Box role="alert" icon="⚠" action={action} {...rest} />;
}
