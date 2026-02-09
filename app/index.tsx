import { useRouter } from 'expo-router';
import * as React from 'react';

import RoleSelectionScreen from '@/src/screens/RoleSelectionScreen';

export default function IndexRoute() {
  const router = useRouter();

  return <RoleSelectionScreen onContinue={() => router.replace('/(tabs)')} />;
}


