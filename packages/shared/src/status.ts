import type { AnchorTransactionRecord } from './types/anchor.js';
import type { TransactionRecord } from './types/payments.js';

/** Platform-neutral meaning of a status; each platform maps `tone` to its own accessible colours (#1418). */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusPresentation {
  tone: StatusTone;
  /** Text glyph so status is never conveyed by colour alone. */
  icon: string;
  label: string;
}

export const PAYMENT_STATUS: Record<TransactionRecord['status'], StatusPresentation> = {
  PENDING: { tone: 'warning', icon: '…', label: 'Pending' },
  PENDING_SIGNATURE: { tone: 'info', icon: '✎', label: 'Awaiting signature' },
  NEEDS_REVIEW: { tone: 'warning', icon: '!', label: 'Under review' },
  SUCCESS: { tone: 'success', icon: '✓', label: 'Completed' },
  FAILED: { tone: 'danger', icon: '✕', label: 'Failed' },
};

export const ANCHOR_STATUS: Record<AnchorTransactionRecord['status'], StatusPresentation> = {
  incomplete: { tone: 'info', icon: '↗', label: 'Waiting on you (open the anchor link)' },
  pending_user_transfer_start: { tone: 'info', icon: '…', label: 'Waiting for your transfer to start' },
  pending_user_transfer_complete: { tone: 'info', icon: '…', label: 'Waiting for your transfer to complete' },
  pending_external: { tone: 'warning', icon: '…', label: 'Waiting on an external network' },
  pending_anchor: { tone: 'warning', icon: '…', label: 'Anchor is processing' },
  pending_stellar: { tone: 'warning', icon: '…', label: 'Submitted to Stellar' },
  pending_trust: { tone: 'info', icon: '…', label: 'Waiting on a trustline' },
  pending_user: { tone: 'info', icon: '↗', label: 'Waiting on you' },
  on_hold: { tone: 'warning', icon: '!', label: 'Under review' },
  completed: { tone: 'success', icon: '✓', label: 'Completed' },
  refunded: { tone: 'neutral', icon: '↩', label: 'Refunded' },
  expired: { tone: 'neutral', icon: '–', label: 'Expired' },
  error: { tone: 'danger', icon: '✕', label: 'Failed' },
};

export function paymentStatus(status: TransactionRecord['status']): StatusPresentation {
  return PAYMENT_STATUS[status];
}

export function anchorStatus(status: AnchorTransactionRecord['status']): StatusPresentation {
  return ANCHOR_STATUS[status];
}
