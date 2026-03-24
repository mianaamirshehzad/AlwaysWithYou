import { useRouter } from 'expo-router';
import * as React from 'react';

import RoleSelectionScreen from '../src/screens/Authentication/RoleSelectionScreen';

export default function IndexRoute() {
  const router = useRouter();

  return (
    <RoleSelectionScreen
      onContinue={(role) => {
        if (role === 'parent') {
          router.replace('/(parent-tabs)');
          return;
        }
        router.replace({ pathname: '/signup', params: { role } });
      }}
    />
  );
}


