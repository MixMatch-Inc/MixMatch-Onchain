/**
 * Account State Access Policies
 * 
 * Defines access policy types for route-level authorization based on
 * account state, onboarding completion, and moderation status.
 */

import { NextFunction, Request, Response } from 'express';
import { AccountStatus, ModerationState } from '@mixmatch/types';
import { AuthenticatedRequestUser } from './auth.middleware';
import { container } from '../config/di';
import { AuthError } from '../utils/errors';

/**
 * Access policy types for route protection
 */
export enum AccessPolicy {
  /** User must be authenticated (basic requirement) */
  AUTHENTICATED = 'AUTHENTICATED',
  
  /** User must have verified email (account status = ACTIVE) */
  VERIFIED = 'VERIFIED',
  
  /** User must have completed onboarding */
  ONBOARDING_COMPLETE = 'ONBOARDING_COMPLETE',
  
  /** User must not be under moderation review or restricted */
  MODERATION_CLEAR = 'MODERATION_CLEAR',
  
  /** User must have active account + verified email + completed onboarding */
  FULL_ACCESS = 'FULL_ACCESS',
}

/**
 * Account state information injected into request
 */
export interface AccountState {
  userId: string;
  accountStatus: AccountStatus;
  moderationState: ModerationState;
  onboardingCompleted: boolean;
  isVerified: boolean;
  isRestricted: boolean;
  isSuspended: boolean;
}

/**
 * Extended request type with account state
 */
export interface AccountStateRequest extends Request {
  user?: AuthenticatedRequestUser;
  accountState?: AccountState;
}

/**
 * Policy denial details
 */
export interface PolicyDenial {
  policy: AccessPolicy;
  reason: string;
  userMessage: string;
  requiredState: Partial<AccountState>;
  currentState: Partial<AccountState>;
}

/**
 * Load user account state from database
 */
export async function loadAccountState(
  userId: string
): Promise<AccountState> {
  const user = await container.userRepository.findById(userId);
  
  if (!user) {
    throw AuthError.userNotFound();
  }

  const accountStatus = (user as any).accountStatus as AccountStatus;
  const moderationState = (user as any).moderationState as ModerationState;
  const onboardingCompleted = user.onboardingCompleted;

  return {
    userId,
    accountStatus,
    moderationState,
    onboardingCompleted,
    isVerified: accountStatus === AccountStatus.ACTIVE,
    isRestricted: moderationState !== ModerationState.CLEAR,
    isSuspended: accountStatus === AccountStatus.SUSPENDED || accountStatus === AccountStatus.BANNED,
  };
}

/**
 * Check if account state satisfies a policy
 */
export function checkPolicyCompliance(
  accountState: AccountState,
  policy: AccessPolicy
): { compliant: boolean; denial?: PolicyDenial } {
  switch (policy) {
    case AccessPolicy.AUTHENTICATED:
      // Already authenticated if we have account state
      return { compliant: true };

    case AccessPolicy.VERIFIED:
      if (!accountState.isVerified) {
        return {
          compliant: false,
          denial: {
            policy: AccessPolicy.VERIFIED,
            reason: 'Email not verified',
            userMessage: 'Please verify your email address before accessing this feature. Check your inbox for a verification link.',
            requiredState: { isVerified: true },
            currentState: { isVerified: false, accountStatus: accountState.accountStatus },
          },
        };
      }
      return { compliant: true };

    case AccessPolicy.ONBOARDING_COMPLETE:
      if (!accountState.onboardingCompleted) {
        return {
          compliant: false,
          denial: {
            policy: AccessPolicy.ONBOARDING_COMPLETE,
            reason: 'Onboarding not completed',
            userMessage: 'Please complete your profile setup to access this feature.',
            requiredState: { onboardingCompleted: true },
            currentState: { onboardingCompleted: false },
          },
        };
      }
      return { compliant: true };

    case AccessPolicy.MODERATION_CLEAR:
      if (accountState.isRestricted) {
        return {
          compliant: false,
          denial: {
            policy: AccessPolicy.MODERATION_CLEAR,
            reason: 'Account under moderation review or restricted',
            userMessage: 'Your account is currently under review. Please contact support for more information.',
            requiredState: { isRestricted: false },
            currentState: { 
              isRestricted: true, 
              moderationState: accountState.moderationState 
            },
          },
        };
      }
      return { compliant: true };

    case AccessPolicy.FULL_ACCESS:
      // Check all requirements
      if (!accountState.isVerified) {
        return {
          compliant: false,
          denial: {
            policy: AccessPolicy.FULL_ACCESS,
            reason: 'Email not verified',
            userMessage: 'Please verify your email address before accessing this feature.',
            requiredState: { isVerified: true },
            currentState: { isVerified: false },
          },
        };
      }
      
      if (!accountState.onboardingCompleted) {
        return {
          compliant: false,
          denial: {
            policy: AccessPolicy.FULL_ACCESS,
            reason: 'Onboarding not completed',
            userMessage: 'Please complete your onboarding to access this feature.',
            requiredState: { onboardingCompleted: true },
            currentState: { onboardingCompleted: false },
          },
        };
      }
      
      if (accountState.isRestricted) {
        return {
          compliant: false,
          denial: {
            policy: AccessPolicy.FULL_ACCESS,
            reason: 'Account restricted',
            userMessage: 'Your account is currently restricted. Please contact support.',
            requiredState: { isRestricted: false },
            currentState: { isRestricted: true },
          },
        };
      }
      
      return { compliant: true };

    default:
      return {
        compliant: false,
        denial: {
          policy,
          reason: 'Unknown policy',
          userMessage: 'Invalid access policy configuration.',
          requiredState: {},
          currentState: {},
        },
      };
  }
}

/**
 * Middleware factory: Enforce access policy
 * 
 * Usage:
 *   app.get('/protected', requireAuth, enforcePolicy(AccessPolicy.VERIFIED), handler);
 */
export function enforcePolicy(policy: AccessPolicy) {
  return async (
    req: AccountStateRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized: missing or invalid token' });
      return;
    }

    try {
      // Load account state
      const accountState = await loadAccountState(req.user.userId);
      req.accountState = accountState;

      // Check policy compliance
      const { compliant, denial } = checkPolicyCompliance(accountState, policy);

      if (!compliant && denial) {
        // Return structured denial error
        res.status(403).json({
          code: 'ACCESS_DENIED',
          policy: denial.policy,
          reason: denial.reason,
          message: denial.userMessage,
          requiredState: denial.requiredState,
          currentState: denial.currentState,
          action: getRemediationAction(denial),
        });
        return;
      }

      next();
    } catch (error) {
      // Pass to error handler
      next(error);
    }
  };
}

/**
 * Get remediation action for policy denial
 */
function getRemediationAction(denial: PolicyDenial): string {
  switch (denial.policy) {
    case AccessPolicy.VERIFIED:
      return 'VERIFY_EMAIL';
    case AccessPolicy.ONBOARDING_COMPLETE:
      return 'COMPLETE_ONBOARDING';
    case AccessPolicy.MODERATION_CLEAR:
      return 'CONTACT_SUPPORT';
    case AccessPolicy.FULL_ACCESS:
      if (!denial.currentState.isVerified) {
        return 'VERIFY_EMAIL';
      }
      if (!denial.currentState.onboardingCompleted) {
        return 'COMPLETE_ONBOARDING';
      }
      return 'CONTACT_SUPPORT';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Convenience middleware: Require verified email
 */
export const requireVerified = enforcePolicy(AccessPolicy.VERIFIED);

/**
 * Convenience middleware: Require onboarding complete
 */
export const requireOnboardingComplete = enforcePolicy(AccessPolicy.ONBOARDING_COMPLETE);

/**
 * Convenience middleware: Require moderation clear
 */
export const requireModerationClear = enforcePolicy(AccessPolicy.MODERATION_CLEAR);

/**
 * Convenience middleware: Require full access
 */
export const requireFullAccess = enforcePolicy(AccessPolicy.FULL_ACCESS);
