import { render, screen } from '@testing-library/react-native';
import App from '../../App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);

    expect(screen.getByText('TheMixMatch Onchain')).toBeTruthy();
  });
});
