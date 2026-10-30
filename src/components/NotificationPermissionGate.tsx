import Ionicons from '@expo/vector-icons/Ionicons';
import * as Notifications from 'expo-notifications';
import * as React from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Colors from '@/src/assets/Colors';

type Props = {
  onPermissionGranted: () => void;
};

export default function NotificationPermissionGate({ onPermissionGranted }: Props) {
  const [checking, setChecking] = React.useState(false);

  const checkAndRequest = React.useCallback(async () => {
    setChecking(true);
    try {
      const current = await Notifications.getPermissionsAsync();
      if (current.granted || current.status === 'granted') {
        onPermissionGranted();
        return;
      }

      const req = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      if (req.granted || req.status === 'granted') {
        onPermissionGranted();
      } else if (Platform.OS !== 'web') {
        // If denied, open device settings so user can grant permission
        void Linking.openSettings();
      }
    } catch (err) {
      console.warn('Notification permission error:', err);
    } finally {
      setChecking(false);
    }
  }, [onPermissionGranted]);

  // Re-check automatically when user returns to app from system settings
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        Notifications.getPermissionsAsync().then((res) => {
          if (res.granted || res.status === 'granted') {
            onPermissionGranted();
          }
        });
      }
    });
    return () => sub.remove();
  }, [onPermissionGranted]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="notifications" size={54} color={Colors.dashboard.accent} />
        </View>

        <Text style={styles.title}>Notifications Required</Text>
        <Text style={styles.subtitle}>
          AlwaysWithYou is designed around real-time medicine schedules, hydration check-ins, and safety alerts. The app cannot function without notification permissions enabled.
        </Text>

        <Pressable
          onPress={checkAndRequest}
          disabled={checking}
          accessibilityRole="button"
          accessibilityLabel="Enable Notifications"
          style={({ pressed }) => [
            styles.enableBtn,
            checking && styles.btnDisabled,
            { opacity: pressed ? 0.85 : 1 },
          ]}>
          {checking ? (
            <ActivityIndicator size="small" color={Colors.dashboard.bg} />
          ) : (
            <>
              <Ionicons name="notifications-outline" size={18} color={Colors.dashboard.bg} />
              <Text style={styles.enableBtnText}>Enable Notifications</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.dashboard.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.dashboard.surfaceStrong,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.alpha.white08,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.dashboard.accentIconBg,
    borderWidth: 1.5,
    borderColor: Colors.dashboard.accentSoftBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    color: Colors.dashboard.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.alpha.white70,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  enableBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dashboard.accent,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    minWidth: 220,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  enableBtnText: {
    color: Colors.dashboard.bg,
    fontSize: 15,
    fontWeight: '800',
  },
});
