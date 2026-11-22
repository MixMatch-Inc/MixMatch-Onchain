import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';

describe('BottomSheet (#1415)', () => {
  it('shows its title and children when visible', () => {
    render(
      <BottomSheet visible onClose={() => undefined} title="Confirm payment">
        <Text>Send 10 XLM?</Text>
      </BottomSheet>,
    );
    expect(screen.getByText('Confirm payment')).toBeTruthy();
    expect(screen.getByText('Send 10 XLM?')).toBeTruthy();
  });

  it('closes when the scrim is pressed', () => {
    const onClose = jest.fn();
    render(
      <BottomSheet visible onClose={onClose} title="T">
        <Text>x</Text>
      </BottomSheet>,
    );
    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
