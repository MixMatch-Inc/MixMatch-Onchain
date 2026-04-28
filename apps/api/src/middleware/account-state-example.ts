/**
 * Example: Using Account State Middleware in Routes
 * 
 * This file demonstrates how to apply access policies to different routes
 * based on their security requirements.
 */

import { Router } from 'express';
import {
  requireAuth,
  enforcePolicy,
  AccessPolicy,
  requireVerified,
  requireOnboardingComplete,
  requireModerationClear,
  requireFullAccess,
} from '../middleware/account-state';
import { requireRole } from '../middleware/auth.middleware';
import { UserRole } from '@mixmatch/types';

const exampleRouter = Router();

// ── Public Routes (No Authentication Required) ──────────────────────────────

// Anyone can access these
exampleRouter.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

exampleRouter.get('/public/djs', (req, res) => {
  // Return public DJ listings
  res.json({ djs: [] });
});

// ── Authenticated Routes (Basic Auth Only) ───────────────────────────────────

// Any logged-in user can access these
exampleRouter.get('/profile', requireAuth, (req, res) => {
  // req.user is available
  res.json({
    userId: req.user?.userId,
    role: req.user?.role,
  });
});

exampleRouter.get('/settings', requireAuth, (req, res) => {
  // View settings
  res.json({ settings: {} });
});

// ── Verified Routes (Email Verification Required) ────────────────────────────

// User must have verified their email
exampleRouter.post('/bookings', requireAuth, requireVerified, (req, res) => {
  // req.accountState is available
  console.log('Account state:', req.accountState);
  
  // Create booking logic
  res.json({ booking: {} });
});

exampleRouter.get('/messages', requireAuth, enforcePolicy(AccessPolicy.VERIFIED), (req, res) => {
  // Access messages
  res.json({ messages: [] });
});

// ── Onboarding Complete Routes ───────────────────────────────────────────────

// User must have completed onboarding
exampleRouter.get('/discover', requireAuth, requireOnboardingComplete, (req, res) => {
  // Access discovery features
  res.json({ recommendations: [] });
});

exampleRouter.post('/journeys', requireAuth, enforcePolicy(AccessPolicy.ONBOARDING_COMPLETE), (req, res) => {
  // Create vibe journey
  res.json({ journey: {} });
});

// ── Moderation Clear Routes ──────────────────────────────────────────────────

// User must not be under moderation review
exampleRouter.post('/comments', requireAuth, requireModerationClear, (req, res) => {
  // Post comment
  res.json({ comment: {} });
});

exampleRouter.post('/reviews', requireAuth, enforcePolicy(AccessPolicy.MODERATION_CLEAR), (req, res) => {
  // Submit review
  res.json({ review: {} });
});

// ── Full Access Routes (All Requirements) ────────────────────────────────────

// User must be verified + onboarded + moderation clear
exampleRouter.post('/payments', requireAuth, requireFullAccess, (req, res) => {
  // Process payment
  res.json({ payment: {} });
});

exampleRouter.post('/bookings/:id/accept', requireAuth, enforcePolicy(AccessPolicy.FULL_ACCESS), (req, res) => {
  // Accept booking
  res.json({ booking: {} });
});

// ── Role-Based + Policy Routes ───────────────────────────────────────────────

// DJ-specific routes with full access
exampleRouter.post('/dj/performances',
  requireAuth,
  requireRole([UserRole.DJ]),
  requireFullAccess,
  (req, res) => {
    // DJ creates performance
    res.json({ performance: {} });
  }
);

// Planner-specific routes
exampleRouter.post('/planner/events',
  requireAuth,
  requireRole([UserRole.PLANNER]),
  enforcePolicy(AccessPolicy.VERIFIED),
  (req, res) => {
    // Planner creates event
    res.json({ event: {} });
  }
);

// Admin routes (bypass some checks)
exampleRouter.delete('/users/:userId',
  requireAuth,
  requireRole([UserRole.ADMIN]),
  (req, res) => {
    // Admin deletes user
    res.json({ success: true });
  }
);

// ── Custom Policy Logic ─────────────────────────────────────────────────────

// Example: Custom middleware that checks multiple policies
const requireVerifiedAndOnboarded = async (req: any, res: any, next: any) => {
  const { loadAccountState, checkPolicyCompliance, AccessPolicy } = await import('../middleware/account-state');
  
  if (!req.user?.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const accountState = await loadAccountState(req.user.userId);
  req.accountState = accountState;
  
  // Check verification
  const verified = checkPolicyCompliance(accountState, AccessPolicy.VERIFIED);
  if (!verified.compliant) {
    return res.status(403).json(verified.denial);
  }
  
  // Check onboarding
  const onboarded = checkPolicyCompliance(accountState, AccessPolicy.ONBOARDING_COMPLETE);
  if (!onboarded.compliant) {
    return res.status(403).json(onboarded.denial);
  }
  
  next();
};

exampleRouter.get('/advanced', requireAuth, requireVerifiedAndOnboarded, (req, res) => {
  res.json({ message: 'Advanced access granted' });
});

// ── Error Handling Example ───────────────────────────────────────────────────

// Example handler that uses account state
exampleRouter.get('/dashboard', requireAuth, requireFullAccess, (req, res) => {
  const accountState = req.accountState;
  
  // Account state is guaranteed to be available after policy check
  res.json({
    dashboard: {
      userId: accountState?.userId,
      isVerified: accountState?.isVerified,
      onboardingComplete: accountState?.onboardingCompleted,
      canTransact: accountState?.isVerified && accountState?.onboardingCompleted,
    },
  });
});

export default exampleRouter;
