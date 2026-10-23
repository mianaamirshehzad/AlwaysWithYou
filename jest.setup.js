jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props) => React.createElement('Ionicons', props),
    MaterialIcons: (props) => React.createElement('MaterialIcons', props),
  };
});

jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  return (props) => React.createElement('Ionicons', props);
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
}));

jest.mock('expo-notifications', () => {
  const actual = jest.requireActual('expo-notifications');
  return {
    ...actual,
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => ({})),
    scheduleNotificationAsync: jest.fn(async () => 'mock-notification-id'),
    cancelScheduledNotificationAsync: jest.fn(async () => undefined),
    cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
    getAllScheduledNotificationsAsync: jest.fn(async () => []),
    getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  };
});

