import type {
  CreatorDashboardResponse,
  CreatorDetailResponse,
  CreatorsResponse,
  MeResponse,
  TipResolution,
  UploadJob,
  UploadTicket,
} from '@mixmatch/shared';
import { authHeaders, request } from './api-client';

type Raw = Record<string, unknown>;

const str = (value: unknown): string => (typeof value === 'string' ? value : String(value ?? ''));
const optional = (value: unknown): string | null => (value == null ? null : String(value));

export async function getCurrentProfile(accessToken: string): Promise<MeResponse> {
  const row = await request<Raw>('/api/users/me', { headers: authHeaders(accessToken) });
  return {
    user: {
      id: str(row.id),
      email: str(row.email),
      role: str(row.role) as MeResponse['user']['role'],
      displayName: optional(row.display_name) ?? undefined,
      avatarUrl: optional(row.avatar_url),
      bio: optional(row.bio),
      createdAt: str(row.created_at ?? row.createdAt),
      updatedAt: str(row.updated_at ?? row.updatedAt),
      emailVerifiedAt: optional(row.email_verified_at ?? row.emailVerifiedAt),
    },
  };
}

function toSummary(row: Raw) {
  return {
    handle: str(row.handle),
    displayName: str(row.display_name ?? row.displayName),
    bio: optional(row.bio),
    avatarUrl: optional(row.avatar_url ?? row.avatarUrl),
  };
}

export async function listCreators(): Promise<CreatorsResponse> {
  const rows = await request<Raw[]>('/api/creators');
  return { creators: (rows ?? []).map(toSummary) };
}

export async function getCreator(handle: string): Promise<CreatorDetailResponse> {
  const row = await request<Raw>(`/api/creators/${encodeURIComponent(handle)}`);
  const creator = row.creator as Raw;
  return {
    creator: {
      ...toSummary(creator),
      publicKey: str(creator.public_key),
      totalEarnings: str(creator.total_earnings),
      tipsReceived: Number(creator.tips_received ?? 0),
    },
    recentTips: ((row.recent_tips as Raw[]) ?? []).map((tip) => ({
      id: str(tip.id),
      amount: str(tip.amount),
      memo: str(tip.memo),
      fromAddress: str(tip.from_address),
      createdAt: str(tip.created_at),
    })),
  };
}

export async function resolveTip(handle: string, accessToken: string): Promise<TipResolution> {
  const row = await request<Raw>(`/api/creators/${encodeURIComponent(handle)}/tip/resolve`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  return {
    destinationPublicKey: str(row.destination_public_key),
    memo: str(row.memo),
    suggestedAmount: str(row.suggested_amount),
    creator: {
      handle: str((row.creator as Raw)?.handle),
      displayName: str((row.creator as Raw)?.display_name),
      bio: optional((row.creator as Raw)?.bio),
      avatarUrl: optional((row.creator as Raw)?.avatar_url),
    },
  };
}

export async function getCreatorDashboard(accessToken: string): Promise<CreatorDashboardResponse> {
  const row = await request<Raw>('/api/creators/me/dashboard', { headers: authHeaders(accessToken) });
  return {
    dashboard: {
      totalEarnings: str(row.total_earnings),
      tipsReceived: Number(row.tips_received ?? 0),
      tips: ((row.tips as Raw[]) ?? []).map((tip) => ({
        id: str(tip.id),
        amount: str(tip.amount),
        memo: str(tip.memo),
        fromAddress: str(tip.from_address),
        createdAt: str(tip.created_at),
      })),
    },
  };
}

export async function requestUploadTicket(
  input: { fileName: string; contentType: string; sizeBytes: number },
  accessToken: string,
): Promise<UploadTicket> {
  const row = await request<Raw>('/api/uploads/signed-url', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      file_name: input.fileName,
      content_type: input.contentType,
      size_bytes: input.sizeBytes,
    }),
  });
  return {
    uploadUrl: str(row.upload_url),
    assetUrl: str(row.asset_url),
    objectKey: str(row.object_key),
    expiresAt: str(row.expires_at),
    method: 'PUT',
  };
}

export async function completeUpload(objectKey: string, accessToken: string): Promise<UploadJob> {
  const row = await request<Raw>('/api/uploads/complete', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ object_key: objectKey }),
  });
  return toJob(row);
}

export async function getUploadJob(jobId: string, accessToken: string): Promise<UploadJob> {
  return toJob(await request<Raw>(`/api/uploads/jobs/${jobId}`, { headers: authHeaders(accessToken) }));
}

function toJob(row: Raw): UploadJob {
  return {
    id: str(row.id),
    status: str(row.status) as UploadJob['status'],
    assetUrl: str(row.asset_url),
    playbackUrl: optional(row.playback_url),
    error: optional(row.error),
  };
}
