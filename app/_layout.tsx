import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/src/assets/Colors';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { UserProfileProvider } from '../src/context/UserProfileContext';
import { RelationshipsProvider, useRelationships } from '../src/context/RelationshipsContext';
import { PreferencesProvider } from '../src/context/PreferencesContext';
import { NetworkProvider, useNetwork } from '../src/context/NetworkContext';
import NoInternetScreen from '../src/components/NoInternetScreen';
import NotificationPermissionGate from '../src/components/NotificationPermissionGate';
import { logOut } from '../src/services/auth';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style="light" />
      <AuthProvider>
        <UserProfileProvider>
          <PreferencesProvider>
            <RelationshipsProvider>
              <NetworkProvider>
                <RootNavigator />
              </NetworkProvider>
            </RelationshipsProvider>
          </PreferencesProvider>
        </UserProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { status, role, roleError, retryLoadRole, hasConnected } = useAuth();
  const { relationships, loading: relationshipsLoading } = useRelationships();
  const { isConnected, checkConnectivity } = useNetwork();
  const [hasNotificationPermission, setHasNotificationPermission] = React.useState<boolean>(true);
  const router = useRouter();
  const segments = useSegments();

  // Enforce notification permissions check
  React.useEffect(() => {
    Notifications.getPermissionsAsync()
      .then((perm) => {
        if (perm.granted || perm.status === 'granted') {
          setHasNotificationPermission(true);
        } else {
          Notifications.requestPermissionsAsync()
            .then((req) => {
              setHasNotificationPermission(req.granted || req.status === 'granted');
            })
            .catch(() => {
              setHasNotificationPermission(false);
            });
        }
      })
      .catch(() => {
        setHasNotificationPermission(true);
      });
  }, []);

  const isParentLinked = React.useMemo(() => {
    return relationships.some((r) => r.status === 'active');
  }, [relationships]);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      if (hasConnected) {
        if (segments[0] !== 'login' && segments[0] !== 'signup') {
          router.replace('/login');
        }
      } else {
        if (segments[0] === '(tabs)' || segments[0] === '(parent-tabs)') {
          router.replace('/');
        }
      }
      return;
    }

    if (status === 'authenticated' && role !== null) {
      if (role === 'child') {
        if (segments[0] !== '(tabs)' && segments[0] !== 'modal' && segments[0] !== 'conversation') {
          router.replace('/(tabs)');
        }
        return;
      }

      if (role === 'parent') {
        // While relationships are loading, do not navigate to prevent loops/flicker
        if (relationshipsLoading) {
          return;
        }

        if (isParentLinked) {
          if (segments[0] !== '(parent-tabs)' && segments[0] !== 'modal' && segments[0] !== 'conversation') {
            router.replace('/(parent-tabs)');
          }
        } else {
          // Unlinked parent must link their account via invite code first
          if (segments[0] !== 'invite' && segments[0] !== 'modal') {
            router.replace('/invite');
          }
        }
      }
    }
  }, [status, role, relationshipsLoading, isParentLinked, segments, router]);

  const showLoadingGate =
    status === 'loading' ||
    (status === 'authenticated' && role === null && !roleError) ||
    (status === 'authenticated' && role === 'parent' && relationshipsLoading);

  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="invite" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(parent-tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="conversation" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>

      {showLoadingGate ? <AuthGateLoading /> : null}
      {roleError ? <AuthGateError onRetry={retryLoadRole} /> : null}
      {!hasNotificationPermission ? (
        <NotificationPermissionGate onPermissionGranted={() => setHasNotificationPermission(true)} />
      ) : null}
      {!isConnected ? <NoInternetScreen onRetry={checkConnectivity} /> : null}
    </>
  );
}

function AuthGateLoading() {
  return (
    <View style={styles.gate}>
      <ActivityIndicator size="large" color={Colors.dashboard.accent} />
    </View>
  );
}

function AuthGateError(props: { onRetry: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.gate}>
      <Text style={styles.gateTitle}>We couldn&apos;t load your account details.</Text>
      <Pressable
        onPress={props.onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry"
        style={({ pressed }) => [styles.gateRetryBtn, { opacity: pressed ? 0.9 : 1 }]}>
        <Text style={styles.gateRetryText}>Retry</Text>
      </Pressable>
      <Pressable
        onPress={async () => {
          await logOut();
          router.replace('/login');
        }}
        accessibilityRole="button"
        accessibilityLabel="Sign Out"
        style={({ pressed }) => [styles.gateSignOutBtn, { opacity: pressed ? 0.8 : 1 }]}>
        <Text style={styles.gateSignOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  gate: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.dashboard.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 32,
  },
  gateTitle: {
    color: Colors.alpha.white70,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  gateRetryBtn: {
    minWidth: 160,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: Colors.dashboard.accent,
    alignItems: 'center',
  },
  gateRetryText: { color: Colors.dashboard.bg, fontSize: 14, fontWeight: '900' },
  gateSignOutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  gateSignOutText: { color: Colors.alpha.white45, fontSize: 13, fontWeight: '800' },
});
