import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import Colors from '@/src/assets/Colors';

export default function ProfileTabRoute() {
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dashboard.bg },
});
