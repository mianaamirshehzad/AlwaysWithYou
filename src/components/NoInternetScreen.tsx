import Ionicons from '@expo/vector-icons/Ionicons';
import * as React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Colors from '@/src/assets/Colors';
import { useNetwork } from '@/src/context/NetworkContext';

type Props = {
  onRetry?: () => void;
};

export default function NoInternetScreen({ onRetry }: Props) {
  const { isChecking, checkConnectivity } = useNetwork();

  const handleRetry = async () => {
    if (onRetry) {
      onRetry();
    } else {
      await checkConnectivity();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.dashboard.accent} />
        </View>

        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.subtitle}>
          Please check your network settings. AlwaysWithYou requires an active internet connection to synchronize care tasks and messages.
        </Text>

        <Pressable
          onPress={handleRetry}
          disabled={isChecking}
          accessibilityRole="button"
          accessibilityLabel="Retry connection"
          style={({ pressed }) => [
            styles.retryBtn,
            isChecking && styles.retryBtnDisabled,
            { opacity: pressed ? 0.85 : 1 },
          ]}>
          {isChecking ? (
            <ActivityIndicator size="small" color={Colors.dashboard.bg} />
          ) : (
            <>
              <Ionicons name="reload" size={18} color={Colors.dashboard.bg} />
              <Text style={styles.retryBtnText}>Retry Connection</Text>
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
    zIndex: 9998,
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
  retryBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dashboard.accent,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    minWidth: 200,
  },
  retryBtnDisabled: {
    opacity: 0.5,
  },
  retryBtnText: {
    color: Colors.dashboard.bg,
    fontSize: 15,
    fontWeight: '800',
  },
});
