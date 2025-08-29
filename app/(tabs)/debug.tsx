import React from 'react';
import WardrobeApolloProvider from '../../components/WardrobeApolloProvider';
import NetworkTestScreen from '../../screens/NetworkTestScreen';

export default function DebugScreen() {
  return (
    <WardrobeApolloProvider>
      <NetworkTestScreen />
    </WardrobeApolloProvider>
  );
}
