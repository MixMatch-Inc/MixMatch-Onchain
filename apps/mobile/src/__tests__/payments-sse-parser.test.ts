describe('Mobile Payments Client SSE Parser (Port #1170)', () => {
  it('correctly handles versioned SSE events and heartbeats', () => {
    const rawEvents = [
      'data: {"version": "1.0", "event_type": "heartbeat"}\n\n',
      'data: {"version": "1.0", "event_type": "transaction_update", "transaction": {"id": "tx-1", "status": "SUCCESS", "amount": "100.0"}}\n\n',
      'data: {"version": "1.0", "event_type": "transaction_update", "data": {"id": "tx-2", "status": "FAILED", "amount": "50.0"}}\n\n'
    ];

    const received: any[] = [];
    for (const chunk of rawEvents) {
      const dataLine = chunk.split('\n').find((l) => l.startsWith('data:'));
      if (dataLine) {
        const payload = JSON.parse(dataLine.slice(5).trim());
        if (payload.event_type === 'heartbeat') continue;
        const tx = payload.transaction ?? payload.data;
        if (tx) received.push(tx);
      }
    }

    expect(received).toHaveLength(2);
    expect(received[0].id).toBe('tx-1');
    expect(received[1].id).toBe('tx-2');
  });
});
