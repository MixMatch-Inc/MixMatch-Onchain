import { render, screen } from '@testing-library/react-native';
import App from '../../App';

describe('App', () => {
  it('renders auth shell when not logged in', () => {
    render(<App />);

    expect(screen.getByText('MixMatch Onchain')).toBeTruthy();
    expect(screen.getByText('Sign In')).toBeTruthy();
  });
});
