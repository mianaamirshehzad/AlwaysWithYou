import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import Colors from '@/src/assets/Colors';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={22} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.dashboard.accent,
        tabBarInactiveTintColor: Colors.dashboard.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.dashboard.bg,
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.select({ ios: 96, default: 72 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: 30, default: 10 }),
          marginBottom: Platform.select({ ios: 12, default: 0 }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
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
        name="two"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="three"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <TabBarIcon name="chatbubble-ellipses-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="four"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="person-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
