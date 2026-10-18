import { Redirect, useRouter } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';

import RoleSelectionScreen from '../src/screens/Authentication/RoleSelectionScreen';
import { useAuth } from '../src/context/AuthContext';
import Colors from '../src/assets/Colors';

export default function IndexRoute() {
  const router = useRouter();
  const { status, role, hasConnected } = useAuth();

  // 1. While authentication or local session is hydrating, render a matching dark background
  // NEVER render RoleSelectionScreen while auth status or role is loading
  if (status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.dashboard.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ActivityIndicator size="large" color={Colors.dashboard.accent} />
      </View>
    );
  }

  // 2. If authenticated with a role, redirect to the corresponding dashboard tabs
  if (status === 'authenticated') {
    if (role === 'child') {
      return <Redirect href="/(tabs)" />;
    }
    if (role === 'parent') {
      return <Redirect href="/(parent-tabs)" />;
    }
  }

  // 3. If role is already set or connection was established, go directly to login
  if (hasConnected || role !== null) {
    return <Redirect href="/login" />;
  }

  // 4. Only show RoleSelectionScreen if completely first-time unauthenticated user
  return (
    <RoleSelectionScreen
      onContinue={(selectedRole) => {
        router.replace({ pathname: '/signup', params: { role: selectedRole } });
      }}
    />
  );
}
