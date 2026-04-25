import React, { useEffect } from 'react';
import { bootstrapSession } from '@/store/session.store';
import { RootNavigator } from '@/navigation/RootNavigator';

export default function App() {
  useEffect(() => {
    bootstrapSession();
  }, []);

  return <RootNavigator />;
}
