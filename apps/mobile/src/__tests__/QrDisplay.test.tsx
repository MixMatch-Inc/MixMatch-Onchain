import { render, screen } from '@testing-library/react-native';
import { QrDisplay } from '../components/QrDisplay';

describe('QrDisplay', () => {
  it('renders a QR code for the given value', () => {
    render(<QrDisplay value="mixmatch://payments/send?destination=GABC" />);
    expect(screen.getByTestId('qr-display')).toBeTruthy();
  });

  it('renders the optional label', () => {
    render(<QrDisplay value="mixmatch://payments/send?destination=GABC" label="Your address" />);
    expect(screen.getByText('Your address')).toBeTruthy();
  });
});
