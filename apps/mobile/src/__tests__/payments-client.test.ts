import {
  getStellarAccount,
  getTransactionHistory,
  getTransactionStatus,
  reconcileTransaction,
  sendPayment,
  subscribeToTransactionStream,
} from '../services/payments-client';

function sseBodyStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[index]));
      index += 1;
    },
  });
}

describe('payments-client', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it('sendPayment posts to /payments/send with an auth header', async () => {
    await sendPayment({ destinationPublicKey: 'G'.repeat(56), amount: '10' }, 'tok');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/payments/send');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ destinationPublicKey: 'G'.repeat(56), amount: '10' });
  });

  it('getStellarAccount hits /payments/account', async () => {
    await getStellarAccount('tok');
    expect(fetchMock.mock.calls[0][0]).toContain('/payments/account');
  });

  it('getTransactionStatus hits /payments/:id/status', async () => {
    await getTransactionStatus('tx-1', 'tok');
    expect(fetchMock.mock.calls[0][0]).toContain('/payments/tx-1/status');
  });

  it('getTransactionHistory omits query params when not provided', async () => {
    await getTransactionHistory({}, 'tok');
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/payments\/history$/);
  });

  it('getTransactionHistory includes page and limit when provided', async () => {
    await getTransactionHistory({ page: 2, limit: 10 }, 'tok');
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('page=2');
    expect(url).toContain('limit=10');
  });

  it('reconcileTransaction posts to /payments/:id/reconcile', async () => {
    await reconcileTransaction('tx-1', 'tok');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/payments/tx-1/reconcile');
    expect(init.method).toBe('POST');
  });
});

/**
 * The stream mints a single-use token via POST /auth/sse-token before
 * opening the stream, so fetch is called twice: token first, stream second.
 */
function mockSseFetch(streamResponse: unknown): jest.Mock {
  return jest.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/auth/sse-token')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: 'stream-tok', expiresInSeconds: 60 }),
      });
    }
    return Promise.resolve(streamResponse);
  });
}

describe('subscribeToTransactionStream', () => {
  it('authenticates via a ?token= query param and parses SSE events into transaction updates', async () => {
    const transaction = { id: 'tx-1', status: 'SUCCESS' };
    globalThis.fetch = mockSseFetch({
      ok: true,
      body: sseBodyStream([`data: ${JSON.stringify({ transaction })}\n\n`]),
    }) as unknown as typeof fetch;

    const onTransaction = jest.fn();
    const onError = jest.fn();
    const handle = subscribeToTransactionStream('tok', onTransaction, onError);

    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onTransaction).toHaveBeenCalledWith(transaction);
    expect(onError).not.toHaveBeenCalled();

    // The access token is never put in a URL; the minted single-use one is.
    const [tokenUrl] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(tokenUrl).toContain('/auth/sse-token');

    const [streamUrl] = (globalThis.fetch as jest.Mock).mock.calls[1];
    expect(streamUrl).toContain('/payments/stream?token=stream-tok');
    expect(streamUrl).not.toContain('token=tok&');

    handle.close();
  });

  it('parses multiple SSE events split across chunks', async () => {
    const first = { id: 'tx-1', status: 'PENDING' };
    const second = { id: 'tx-1', status: 'SUCCESS' };
    globalThis.fetch = mockSseFetch({
      ok: true,
      body: sseBodyStream([
        `data: ${JSON.stringify({ transaction: first })}\n\n`,
        `data: ${JSON.stringify({ transaction: second })}\n\n`,
      ]),
    }) as unknown as typeof fetch;

    const onTransaction = jest.fn();
    const handle = subscribeToTransactionStream('tok', onTransaction);

    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onTransaction).toHaveBeenCalledTimes(2);
    expect(onTransaction).toHaveBeenNthCalledWith(1, first);
    expect(onTransaction).toHaveBeenNthCalledWith(2, second);

    handle.close();
  });

  it('calls onError when the stream request fails', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, body: null }) as unknown as typeof fetch;

    const onError = jest.fn();
    const handle = subscribeToTransactionStream('bad-token', jest.fn(), onError);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onError).toHaveBeenCalledTimes(1);
    handle.close();
  });

  it('does not call onError after close() even if the underlying request later rejects', async () => {
    let rejectFetch!: (error: unknown) => void;
    globalThis.fetch = jest.fn().mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectFetch = reject;
      }),
    ) as unknown as typeof fetch;

    const onError = jest.fn();
    const handle = subscribeToTransactionStream('tok', jest.fn(), onError);
    handle.close();
    rejectFetch(new Error('aborted'));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onError).not.toHaveBeenCalled();
  });
});
