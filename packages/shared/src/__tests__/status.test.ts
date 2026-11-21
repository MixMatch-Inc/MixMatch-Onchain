import { describe, expect, it } from 'vitest';
import { ANCHOR_STATUS, PAYMENT_STATUS, anchorStatus, paymentStatus } from '../status.js';

describe('status presentation contract', () => {
  it('covers every payment status', () => {
    expect(Object.keys(PAYMENT_STATUS).sort()).toEqual(['FAILED', 'NEEDS_REVIEW', 'PENDING', 'PENDING_SIGNATURE', 'SUCCESS']);
  });
  it('gives every status a label and an icon (not colour alone)', () => {
    for (const p of [...Object.values(PAYMENT_STATUS), ...Object.values(ANCHOR_STATUS)]) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.icon.length).toBeGreaterThan(0);
    }
  });
  it('maps terminal states to expected tones', () => {
    expect(paymentStatus('SUCCESS').tone).toBe('success');
    expect(paymentStatus('FAILED').tone).toBe('danger');
    expect(anchorStatus('completed').tone).toBe('success');
    expect(anchorStatus('error').tone).toBe('danger');
  });
});
