const handler = { handleNotification: async () => ({}) };
module.exports = {
  setNotificationHandler: (h) => Object.assign(handler, h),
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
  AndroidImportance: { MAX: 5, DEFAULT: 3 },
  AndroidNotificationPriority: { MAX: 'max', HIGH: 'high' },
  getPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
  requestPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
  setNotificationChannelAsync: async () => null,
  scheduleNotificationAsync: async () => 'stub-notification-id',
  cancelScheduledNotificationAsync: async () => {},
  getAllScheduledNotificationsAsync: async () => [],
  cancelAllScheduledNotificationsAsync: async () => {},
  getExpoPushTokenAsync: async () => ({ data: 'ExponentPushToken[stub]' }),
  getDevicePushTokenAsync: async () => ({ data: 'stub-device-token' }),
};
