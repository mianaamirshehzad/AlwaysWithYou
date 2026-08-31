import { formatTime12h, todayString, formatDateLong, getInitials, timeToMinutes, minutesToTime } from '../utils/date';

describe('formatTime12h', () => {
  it('formats morning time', () => {
    expect(formatTime12h('08:30')).toBe('8:30 AM');
  });
  it('formats afternoon time', () => {
    expect(formatTime12h('14:15')).toBe('2:15 PM');
  });
  it('formats midnight', () => {
    expect(formatTime12h('00:00')).toBe('12:00 AM');
  });
  it('formats noon', () => {
    expect(formatTime12h('12:00')).toBe('12:00 PM');
  });
  it('handles invalid input gracefully', () => {
    expect(formatTime12h('invalid')).toBe('invalid');
  });
});

describe('todayString', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = todayString();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatDateLong', () => {
  it('formats a date string', () => {
    const result = formatDateLong('2025-01-15');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
  });
});

describe('getInitials', () => {
  it('gets first and last initial', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });
  it('gets single initial', () => {
    expect(getInitials('Alice')).toBe('A');
  });
  it('handles empty string', () => {
    expect(getInitials('')).toBe('');
  });
});

describe('timeToMinutes', () => {
  it('converts midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });
  it('converts noon', () => {
    expect(timeToMinutes('12:00')).toBe(720);
  });
  it('converts end of day', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });
});

describe('minutesToTime', () => {
  it('converts 0 to midnight', () => {
    expect(minutesToTime(0)).toBe('00:00');
  });
  it('converts 720 to noon', () => {
    expect(minutesToTime(720)).toBe('12:00');
  });
  it('converts 65 to 01:05', () => {
    expect(minutesToTime(65)).toBe('01:05');
  });
});
