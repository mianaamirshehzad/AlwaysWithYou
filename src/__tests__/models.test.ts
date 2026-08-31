import { TASK_TYPE_CONFIG, DEFAULT_USER_PREFERENCES } from '../models';

describe('TASK_TYPE_CONFIG', () => {
  it('has all task types', () => {
    expect(TASK_TYPE_CONFIG.medicine).toBeDefined();
    expect(TASK_TYPE_CONFIG.water).toBeDefined();
    expect(TASK_TYPE_CONFIG.walk).toBeDefined();
    expect(TASK_TYPE_CONFIG.exercise).toBeDefined();
    expect(TASK_TYPE_CONFIG.call).toBeDefined();
    expect(TASK_TYPE_CONFIG.custom).toBeDefined();
  });

  it('each task type has label and icon', () => {
    Object.values(TASK_TYPE_CONFIG).forEach((config) => {
      expect(config.label).toBeTruthy();
      expect(config.icon).toBeTruthy();
    });
  });
});

describe('DEFAULT_USER_PREFERENCES', () => {
  it('has all required fields', () => {
    expect(typeof DEFAULT_USER_PREFERENCES.pushNotifications).toBe('boolean');
    expect(typeof DEFAULT_USER_PREFERENCES.soundEnabled).toBe('boolean');
    expect(typeof DEFAULT_USER_PREFERENCES.vibrateEnabled).toBe('boolean');
    expect(typeof DEFAULT_USER_PREFERENCES.snoozeMinutes).toBe('number');
    expect(typeof DEFAULT_USER_PREFERENCES.textSize).toBe('number');
  });

  it('textSize is between 0 and 1', () => {
    expect(DEFAULT_USER_PREFERENCES.textSize).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_USER_PREFERENCES.textSize).toBeLessThanOrEqual(1);
  });
});
