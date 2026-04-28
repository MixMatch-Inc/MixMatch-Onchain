import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { UserRole, SessionDetailsDto, AccountStatus, ModerationState, ONBOARDING_REGISTRY, OnboardingStepId, OnboardingStepStatus, OnboardingProgress, getStepsForRole, getRequiredStepsForRole } from "@mixmatch/types";
import { container } from "../../config/di";
import { generateToken } from "../../services/jwt.service";
import { emailService } from "../../services/email.service";
import { EmailVerificationService } from "./email-verification.service";
import { loginSchema, registerSchema, changePasswordSchema } from "./auth.validation";
import { AuthenticatedRequestUser } from "../../middleware/auth.middleware";
import { sendSuccess } from "../../utils/api-response";
import { AuthError, ValidationError } from "../../utils/errors";
import { auditLogService } from "../moderation/audit-log.service";
import { authAuditService } from "../moderation/auth-audit.service";
import { IUser } from "../../repositories/user.repository";

const SALT_ROUNDS = 10;
const SESSION_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const deriveNameFromEmail = (email: string): string => {
  const localPart = email.split("@")[0] || "mixmatch-user";
  return localPart.trim() || "mixmatch-user";
};

const serializeUser = (user: IUser) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  onboardingCompleted: user.onboardingCompleted,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const register = async (req: Request, res: Response): Promise<void> => {
  const parsedPayload = registerSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    throw ValidationError.invalidInput("body", req.body, "Validation failed");
  }

  const { email, password, role } = parsedPayload.data;

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await container.userRepository.existsByEmail(normalizedEmail);

    if (existingUser) {
      throw AuthError.emailAlreadyExists(normalizedEmail);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const createdUser = await container.userRepository.create({
      name: deriveNameFromEmail(normalizedEmail),
      email: normalizedEmail,
      passwordHash,
      role,
      onboardingCompleted: false,
    });

    // Issue a verification token and send the email immediately after registration.
    // Fire-and-forget: a delivery failure should not block the 201 response.
    const verificationService = new EmailVerificationService(
      container.emailVerificationTokenRepository,
      container.userRepository,
      emailService,
    );
    verificationService
      .issueToken(createdUser.id, createdUser.email, req.ip, req.headers['user-agent'])
      .catch((err) => console.error('[register] Failed to send verification email:', err));

    const token = generateToken(createdUser.id, createdUser.role as UserRole, '');

    sendSuccess(res, 201, {
      token,
      user: serializeUser(createdUser),
    });
  } catch (error) {
    // Re-throw MixMatch errors to be handled by middleware
    if (error instanceof Error && "code" in error) {
      throw error;
    }

    // Handle MongoDB duplicate key error
    const maybeMongoError = error as { code?: number };
    if (maybeMongoError.code === 11000) {
      throw AuthError.emailAlreadyExists(email);
    }

    // Unknown errors will be handled by the error middleware
    throw error;
  }
};


export const login = async (req: Request, res: Response): Promise<void> => {
  const parsedPayload = loginSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    throw ValidationError.invalidInput("body", req.body, "Validation failed");
  }

  const { email, password } = parsedPayload.data;

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await container.userRepository.findByEmail(normalizedEmail);

    if (!existingUser) {
      throw AuthError.invalidCredentials();
    }

    const passwordMatches = await bcrypt.compare(
      password,
      existingUser.passwordHash,
    );

    if (!passwordMatches) {
      throw AuthError.invalidCredentials();
    }

    const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_MS);
    const session = await container.sessionRepository.createSession(
      existingUser.id,
      expiresAt,
      req.headers['user-agent'] as string,
      req.ip as string
    );

    const token = generateToken(existingUser.id, existingUser.role as UserRole, session.sessionId);

    sendSuccess(res, 200, {
      token,
      sessionId: session.sessionId,
      user: serializeUser(existingUser),
    });
  } catch (error) {
    // Re-throw MixMatch errors to be handled by middleware
    if (error instanceof Error && "code" in error) {
      throw error;
    }

    // Unknown errors will be handled by the error middleware
    throw error;
  }
};

export const updateOnboardingStatus = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ message: "Unauthorized: missing or invalid token" });
    return;
  }

  const completed = Boolean(req.body?.onboardingCompleted);

  try {
    const user = await container.userRepository.update(req.user.userId, {
      onboardingCompleted: completed,
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /auth/onboarding/status
 * 
 * Returns detailed onboarding progress using the centralized registry.
 */
export const getOnboardingStatus = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ message: "Unauthorized: missing or invalid token" });
    return;
  }

  try {
    const user = await container.userRepository.findById(req.user.userId);
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const userRole = user.role as UserRole;
    const steps = getStepsForRole(userRole);
    const requiredSteps = getRequiredStepsForRole(userRole);
    
    // Build step status map
    const stepStatus: Record<OnboardingStepId, OnboardingStepStatus> = {} as any;
    const pendingSteps: OnboardingStepId[] = [];
    let completedCount = 0;
    
    for (const step of steps) {
      // Determine step status based on prerequisites and completion
      const prerequisitesMet = step.prerequisites.every((prereq) => {
        if (prereq.type === 'STEP_COMPLETED' && prereq.stepId) {
          return stepStatus[prereq.stepId] === OnboardingStepStatus.COMPLETED;
        }
        return true; // Other prerequisite types handled elsewhere
      });
      
      // For now, use simple logic - in production, check actual user data
      const isCompleted = user.onboardingCompleted && step.isRequired;
      
      if (isCompleted) {
        stepStatus[step.id] = OnboardingStepStatus.COMPLETED;
        completedCount++;
      } else if (!prerequisitesMet) {
        stepStatus[step.id] = OnboardingStepStatus.LOCKED;
      } else {
        stepStatus[step.id] = OnboardingStepStatus.AVAILABLE;
        pendingSteps.push(step.id);
      }
    }
    
    // Calculate completion percentage based on required steps
    const requiredCompleted = requiredSteps.filter(
      (step) => stepStatus[step.id] === OnboardingStepStatus.COMPLETED
    ).length;
    
    const completionPercentage = requiredSteps.length > 0
      ? Math.round((requiredCompleted / requiredSteps.length) * 100)
      : 100;
    
    // Determine next step
    const nextStep = pendingSteps.length > 0 ? pendingSteps[0] : undefined;
    
    const isComplete = completionPercentage >= ONBOARDING_REGISTRY.minimumCompletionPercentage;
    
    const progress: OnboardingProgress = {
      userId: user.id,
      stepStatus,
      completionPercentage,
      pendingSteps,
      nextStep,
      isComplete,
    };
    
    sendSuccess(res, 200, {
      progress,
      registry: ONBOARDING_REGISTRY,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const session = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ message: "Unauthorized: missing or invalid token" });
    return;
  }

  try {
    const user = await container.userRepository.findById(req.user.userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Get wallet linkages for provider summary
    const wallets = await container.walletLinkageRepository.findByUserId(req.user.userId);

    const now = new Date();
    const iat = req.user.iat ? new Date(req.user.iat * 1000) : user.createdAt;
    const exp = req.user.exp ? new Date(req.user.exp * 1000) : new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const ageSeconds = Math.floor((now.getTime() - iat.getTime()) / 1000);

    const response: SessionDetailsDto = {
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as any,
        onboardingCompleted: user.onboardingCompleted,
        accountStatus: user.accountStatus as AccountStatus,
        moderationState: user.moderationState as ModerationState,
        ageGatePassed: user.ageGatePassed,
        lastActiveAt: user.lastActiveAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        timezone: user.timezone || 'UTC',
        locale: user.locale || 'en-US',
        visibilityPreference: user.visibilityPreference as any || 'PUBLIC',
        privacySettings: user.privacySettings || {
          blindListeningEligible: true,
          profileRevealAllowed: true,
          showOnlineStatus: true,
          allowDirectMessages: true,
          visibilityPreference: 'PUBLIC'
        }
      },
      session: {
        sessionId: req.user.userId, // Using userId as session identifier for now
        issuedAt: iat,
        expiresAt: exp,
        ageSeconds,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
      accountState: {
        status: user.accountStatus as AccountStatus,
        moderation: user.moderationState as ModerationState,
        isVerified: user.accountStatus === AccountStatus.ACTIVE,
        isRestricted: user.moderationState !== ModerationState.CLEAR,
        isSuspended: user.accountStatus === AccountStatus.SUSPENDED,
      },
      onboarding: {
        completed: user.onboardingCompleted,
        progressPercentage: user.onboardingCompleted ? 100 : 50, // Placeholder
        pendingSteps: user.onboardingCompleted ? [] : ['PROFILE_COMPLETION'],
      },
      providers: wallets.map(w => ({
        type: 'STELLAR',
        linked: w.status === 'ACTIVE',
        linkedAt: w.verifiedAt || w.createdAt,
        externalId: w.stellarAccountId,
      })),
      flags: {
        canTransact: user.accountStatus === AccountStatus.ACTIVE && user.moderationState === ModerationState.CLEAR,
        canPost: user.moderationState === ModerationState.CLEAR,
        requiresOnboarding: !user.onboardingCompleted,
        requiresRecoverySetup: true, // Placeholder for recovery requirement
        showBetaFeatures: user.role === 'ADMIN',
      }
    };

    sendSuccess(res, 200, response);
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const me = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ message: "Unauthorized: missing or invalid token" });
    return;
  }

  try {
    const user = await container.userRepository.findById(req.user.userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      user: serializeUser(user),
    });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId || !req.user?.sessionId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const sessionIdToRevoke = req.body?.sessionId || req.user.sessionId;
    await container.sessionRepository.revokeSession(sessionIdToRevoke, req.user.userId);

    await auditLogService.log({
      action: 'USER_LOGGED_OUT',
      actorId: req.user.userId,
      targetId: req.user.userId,
      metadata: { sessionId: sessionIdToRevoke },
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logoutAll = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const count = await container.sessionRepository.revokeAllUserSessions(req.user.userId);

    await auditLogService.log({
      action: 'USER_LOGGED_OUT_ALL',
      actorId: req.user.userId,
      targetId: req.user.userId,
      metadata: { sessionsRevoked: count },
    });

    res.status(200).json({ message: "All sessions logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

/** Max number of previous password hashes to retain for history checks */
const PASSWORD_HISTORY_LIMIT = 5;

export const changePassword = async (
  req: Request & { user?: AuthenticatedRequestUser },
  res: Response,
): Promise<void> => {
  if (!req.user?.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ValidationError.invalidInput("body", req.body, "Validation failed");
  }

  const { currentPassword, newPassword, revokeAllSessions } = parsed.data;
  const userId = req.user.userId;

  // Fetch user with password history (normally excluded from queries)
  const user = await container.userRepository.findByIdWithPasswordHistory(userId);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  // Verify current password — use a generic error to avoid leaking info
  const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentMatches) {
    await authAuditService.log({
      eventType: 'PASSWORD_CHANGE_FAILED',
      userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { reason: 'wrong_current_password' },
    });
    await auditLogService.log({
      action: 'PASSWORD_CHANGE_FAILED',
      actorId: userId,
      targetId: userId,
    });
    throw AuthError.invalidCredentials();
  }

  // Policy: new password must not match current password
  const matchesCurrent = await bcrypt.compare(newPassword, user.passwordHash);
  if (matchesCurrent) {
    throw ValidationError.invalidInput(
      "newPassword",
      "[redacted]",
      "New password must differ from the current password",
    );
  }

  // Policy: new password must not appear in recent history
  const history = user.passwordHistory ?? [];
  for (const oldHash of history) {
    const matchesHistory = await bcrypt.compare(newPassword, oldHash);
    if (matchesHistory) {
      throw ValidationError.invalidInput(
        "newPassword",
        "[redacted]",
        `Password was used recently. Choose a password not used in the last ${PASSWORD_HISTORY_LIMIT} changes`,
      );
    }
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Rotate history: prepend current hash, keep last N
  const updatedHistory = [user.passwordHash, ...history].slice(0, PASSWORD_HISTORY_LIMIT);

  await container.userRepository.update(userId, {
    passwordHash: newHash,
    passwordHistory: updatedHistory,
  } as any);

  // Optionally revoke all sessions
  if (revokeAllSessions) {
    await container.sessionRepository.revokeAllUserSessions(userId);
  } else if (req.user.sessionId) {
    // Revoke only the current session so the client must re-authenticate
    await container.sessionRepository.revokeSession(req.user.sessionId, userId);
  }

  await authAuditService.log({
    eventType: 'PASSWORD_CHANGED',
    userId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { revokeAllSessions },
  });
  await auditLogService.log({
    action: 'PASSWORD_CHANGED',
    actorId: userId,
    targetId: userId,
    metadata: { revokeAllSessions },
  });

  sendSuccess(res, 200, { message: "Password changed successfully" });
};
