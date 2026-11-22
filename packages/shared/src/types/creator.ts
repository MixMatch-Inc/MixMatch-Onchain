/** Public creator profile shown on the web and used to pre-fill tips (#1378, #1379). */
export interface CreatorProfile {
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  publicKey: string;
  totalEarnings: string;
  tipsReceived: number;
}

export interface CreatorSummary {
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
}

export interface CreatorsResponse {
  creators: CreatorSummary[];
}

export interface CreatorDetailResponse {
  creator: CreatorProfile;
  recentTips: TipRecord[];
}

export interface TipRecord {
  id: string;
  amount: string;
  memo: string;
  fromAddress: string;
  createdAt: string;
}

export interface CreatorDashboard {
  totalEarnings: string;
  tipsReceived: number;
  tips: TipRecord[];
}

export interface CreatorDashboardResponse {
  dashboard: CreatorDashboard;
}

/** Server-resolved tip target: the client pre-fills Send with these values. */
export interface TipResolution {
  destinationPublicKey: string;
  memo: string;
  suggestedAmount: string;
  creator: CreatorSummary;
}

/** Signed URL upload descriptor (#1380). */
export interface UploadTicket {
  uploadUrl: string;
  assetUrl: string;
  objectKey: string;
  expiresAt: string;
  method: 'PUT';
}

export interface UploadJob {
  id: string;
  status: 'PENDING' | 'SCANNING' | 'TRANSCODING' | 'READY' | 'REJECTED';
  assetUrl: string;
  playbackUrl?: string | null;
  error?: string | null;
}
