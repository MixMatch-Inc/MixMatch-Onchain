import { fireEvent, render, screen } from '@testing-library/react-native';
import { Address, Amount, CopyField, StatusPill } from '../components/display';
import { EmptyState, ErrorState } from '../components/states';

describe('display components (#1418, #1419)', () => {
  it('StatusPill shows icon and label', () => {
    render(<StatusPill tone="success" icon="✓" label="Completed" />);
    expect(screen.getByText('✓ Completed')).toBeTruthy();
  });

  it('Amount formats to 7 decimals', () => {
    render(<Amount value="10" assetCode="XLM" />);
    expect(screen.getByText('10.0000000 XLM')).toBeTruthy();
  });

  it('Address truncates', () => {
    render(<Address value={'G'.padEnd(52, 'A') + 'ABCD'} />);
    expect(screen.getByText('G…ABCD')).toBeTruthy();
  });

  it('CopyField calls onCopy with the full value', () => {
    const onCopy = jest.fn();
    render(<CopyField label="Address" value="GABCDEFGHIJKLMNOP" onCopy={onCopy} />);
    fireEvent.press(screen.getByLabelText('Copy Address'));
    expect(onCopy).toHaveBeenCalledWith('GABCDEFGHIJKLMNOP');
  });
});

describe('states (#1420)', () => {
  it('EmptyState shows its message', () => {
    render(<EmptyState message="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('ErrorState offers retry', () => {
    const onPress = jest.fn();
    render(<ErrorState message="Could not load" action={{ label: 'Retry', onPress }} />);
    fireEvent.press(screen.getByText('Retry'));
    expect(onPress).toHaveBeenCalled();
  });
});
