export type Sep24TransactionStatus =
  | 'incomplete'
  | 'pending_user_transfer_start'
  | 'pending_user_transfer_complete'
  | 'pending_external'
  | 'pending_anchor'
  | 'pending_stellar'
  | 'pending_trust'
  | 'pending_user'
  | 'on_hold'
  | 'completed'
  | 'refunded'
  | 'expired'
  | 'error';

/** Statuses where the transaction is still progressing and should keep being polled. */
export const SEP24_IN_PROGRESS_STATUSES: ReadonlySet<Sep24TransactionStatus> = new Set([
  'incomplete',
  'pending_user_transfer_start',
  'pending_user_transfer_complete',
  'pending_external',
  'pending_anchor',
  'pending_stellar',
  'pending_trust',
  'pending_user',
  'on_hold',
]);

/** Terminal failure statuses — the transfer did not complete and won't without the user starting over. */
export const SEP24_FAILURE_STATUSES: ReadonlySet<Sep24TransactionStatus> = new Set([
  'refunded',
  'expired',
  'error',
]);

export interface Sep24InteractiveResponse {
  type: 'interactive_customer_info_needed';
  url: string;
  id: string;
}

export interface Sep24Transaction {
  id: string;
  kind: 'deposit' | 'withdrawal';
  status: Sep24TransactionStatus;
  amountIn: string | null;
  amountOut: string | null;
  startedAt: string;
  completedAt: string | null;
  moreInfoUrl: string | null;
  stellarTransactionId: string | null;
  externalTransactionId: string | null;
  /** Set (and meaningful) only when `status` is `error`. */
  message: string | null;
}

interface RawSep24Transaction {
  id: string;
  kind: 'deposit' | 'withdrawal';
  status: Sep24TransactionStatus;
  amount_in?: string;
  amount_out?: string;
  started_at: string;
  completed_at?: string;
  more_info_url?: string;
  stellar_transaction_id?: string;
  external_transaction_id?: string;
  message?: string;
}

function toSep24Transaction(raw: RawSep24Transaction): Sep24Transaction {
  return {
    id: raw.id,
    kind: raw.kind,
    status: raw.status,
    amountIn: raw.amount_in ?? null,
    amountOut: raw.amount_out ?? null,
    startedAt: raw.started_at,
    completedAt: raw.completed_at ?? null,
    moreInfoUrl: raw.more_info_url ?? null,
    stellarTransactionId: raw.stellar_transaction_id ?? null,
    externalTransactionId: raw.external_transaction_id ?? null,
    message: raw.message ?? null,
  };
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`SEP-24 request to ${url} failed: HTTP ${response.status} ${body}`.trim());
  }
  return response.json() as Promise<T>;
}

function authHeaders(jwt: string): Record<string, string> {
  return { Authorization: `Bearer ${jwt}` };
}

export interface InitiateSep24Params {
  transferServerSep24: string;
  jwt: string;
  assetCode: string;
  /** The Stellar account funds should land in (deposit) or be withdrawn from (withdraw). Defaults to the JWT's own account if omitted. */
  account?: string;
  amount?: string;
}

function buildSep24Form(params: InitiateSep24Params): FormData {
  const form = new FormData();
  form.set('asset_code', params.assetCode);
  if (params.account) form.set('account', params.account);
  if (params.amount) form.set('amount', params.amount);
  return form;
}

/** Starts a SEP-24 interactive deposit — returns the URL to open (redirect or iframe) for the user to complete KYC/payment details on the anchor's side. */
export async function initiateSep24Deposit(params: InitiateSep24Params): Promise<Sep24InteractiveResponse> {
  return fetchJson<Sep24InteractiveResponse>(`${params.transferServerSep24}/transactions/deposit/interactive`, {
    method: 'POST',
    headers: authHeaders(params.jwt),
    body: buildSep24Form(params),
  });
}

/** Starts a SEP-24 interactive withdrawal — returns the URL to open for the user to complete payout details on the anchor's side. */
export async function initiateSep24Withdraw(params: InitiateSep24Params): Promise<Sep24InteractiveResponse> {
  return fetchJson<Sep24InteractiveResponse>(`${params.transferServerSep24}/transactions/withdraw/interactive`, {
    method: 'POST',
    headers: authHeaders(params.jwt),
    body: buildSep24Form(params),
  });
}

export interface GetSep24TransactionParams {
  transferServerSep24: string;
  jwt: string;
  id: string;
}

/** Polls a SEP-24 transaction's current status — this is a multi-minute-to-multi-hour external process, not a synchronous call. */
export async function getSep24Transaction(params: GetSep24TransactionParams): Promise<Sep24Transaction> {
  const url = new URL(`${params.transferServerSep24}/transaction`);
  url.searchParams.set('id', params.id);

  const { transaction } = await fetchJson<{ transaction: RawSep24Transaction }>(url.toString(), {
    headers: authHeaders(params.jwt),
  });
  return toSep24Transaction(transaction);
}
