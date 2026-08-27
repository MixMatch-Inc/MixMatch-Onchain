import { render, screen } from '@testing-library/react-native';
import React from 'react';
import MyQrCode from '../components/MyQrCode';

describe('MyQrCode', () => {
  it('renders public key text correctly', () => {
    const pubKey = 'GBH47LM235F6UOWX5B7DNEPY4UQC2G2W5H2K4UQM5L5E2Q6O2W5K2W';
    render(<MyQrCode publicKey={pubKey} />);
    expect(screen.getByText(pubKey)).toBeTruthy();
  });
});
