import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/src/assets/Colors';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color?: any;
}) {
  return <Ionicons size={22} {...props} />;
}

export default function ParentTabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(
    insets.bottom,
    Platform.select({ ios: 28, android: 24, default: 12 }) ?? 16
  );
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Colors.dashboard.accent,
        tabBarInactiveTintColor: Colors.dashboard.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.dashboard.bg,
          borderTopWidth: 0,
          elevation: 0,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          marginBottom: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ color }) => <TabBarIcon name="chatbubble-ellipses-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="person-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
