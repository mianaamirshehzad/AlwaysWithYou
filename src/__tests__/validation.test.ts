// `expo-crypto` is replaced with a deterministic byte source so the uniqueness
// assertion is meaningful in Jest, where the native module is a stub.
jest.mock('expo-crypto', () => {
  // Deterministic xorshift so the uniqueness assertion is meaningful in Jest,
  // where the native crypto module is a stub.
  let state = 0x12345678;
  const nextByte = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state % 250;
  };
  return {
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = nextByte();
      }
      return array;
    },
  };
});

import { validateCareTask } from '../services/firestore/tasks';
import { generateInvitationCode } from '../services/firestore/invitations';
import type { CareTask } from '../models';

function makeTask(overrides: Partial<Omit<CareTask, 'id' | 'createdAt' | 'updatedAt'>> = {}) {
  return {
    relationshipId: 'child-1_parent-1',
    createdBy: 'child-1',
    assignedTo: 'parent-1',
    type: 'medicine' as const,
    title: 'Morning meds',
    scheduledTime: '09:00',
    frequency: 'daily' as const,
    startDate: '2026-01-01',
    active: true,
    ...overrides,
  } as Omit<CareTask, 'id' | 'createdAt' | 'updatedAt'>;
}

describe('validateCareTask', () => {
  it('accepts a well formed daily reminder', () => {
    expect(validateCareTask(makeTask())).toBeNull();
  });

  it('rejects a blank title', () => {
    expect(validateCareTask(makeTask({ title: '   ' }))).toMatch(/title/i);
  });

  it('rejects an over-long title', () => {
    expect(validateCareTask(makeTask({ title: 'x'.repeat(201) }))).toMatch(/too long/i);
  });

  it('rejects an invalid scheduled time', () => {
    expect(validateCareTask(makeTask({ scheduledTime: '99:99' }))).toMatch(/valid time/i);
    expect(validateCareTask(makeTask({ scheduledTime: '9:00' }))).toMatch(/valid time/i);
    expect(validateCareTask(makeTask({ scheduledTime: '09:60' }))).toMatch(/valid time/i);
  });

  it('accepts boundary times', () => {
    expect(validateCareTask(makeTask({ scheduledTime: '00:00' }))).toBeNull();
    expect(validateCareTask(makeTask({ scheduledTime: '23:59' }))).toBeNull();
  });

  it('rejects a malformed start date', () => {
    expect(validateCareTask(makeTask({ startDate: '2026-1-1' }))).toMatch(/start date/i);
  });

  it('rejects an end date before the start date', () => {
    expect(validateCareTask(makeTask({ startDate: '2026-01-10', endDate: '2026-01-01' }))).toMatch(
      /end date cannot be before/i
    );
  });

  it('accepts an end date equal to the start date', () => {
    expect(validateCareTask(makeTask({ startDate: '2026-01-10', endDate: '2026-01-10' }))).toBeNull();
  });

  it('rejects missing connection details', () => {
    expect(validateCareTask(makeTask({ relationshipId: '' }))).toMatch(/connection details/i);
    expect(validateCareTask(makeTask({ createdBy: '' }))).toMatch(/connection details/i);
    expect(validateCareTask(makeTask({ assignedTo: '' }))).toMatch(/connection details/i);
  });

  it('rejects a self assigned reminder', () => {
    expect(validateCareTask(makeTask({ assignedTo: 'child-1' }))).toMatch(/cannot be assigned/i);
  });

  it('requires at least one day for a custom frequency', () => {
    expect(validateCareTask(makeTask({ frequency: 'custom', daysOfWeek: [] }))).toMatch(
      /at least one day/i
    );
    expect(validateCareTask(makeTask({ frequency: 'custom' }))).toMatch(/at least one day/i);
  });

  it('rejects out of range recurrence days', () => {
    expect(validateCareTask(makeTask({ frequency: 'custom', daysOfWeek: [1, 9] }))).toMatch(
      /valid days/i
    );
    expect(validateCareTask(makeTask({ frequency: 'custom', daysOfWeek: [1.5] }))).toMatch(
      /valid days/i
    );
  });

  it('accepts every supported frequency', () => {
    for (const frequency of ['once', 'daily', 'weekly', 'custom'] as const) {
      const task = makeTask({ frequency, daysOfWeek: frequency === 'custom' ? [1, 3, 5] : undefined });
      expect(validateCareTask(task)).toBeNull();
    }
  });

  it('accepts every supported task type', () => {
    for (const type of ['medicine', 'water', 'walk', 'exercise', 'call', 'custom'] as const) {
      expect(validateCareTask(makeTask({ type }))).toBeNull();
    }
  });
});

describe('generateInvitationCode', () => {
  it('always produces exactly six digits', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateInvitationCode()).toMatch(/^\d{6}$/);
    }
  });

  it('produces a string, so leading zeros survive', () => {
    const codes = Array.from({ length: 200 }, () => generateInvitationCode());
    expect(codes.every((c) => typeof c === 'string' && c.length === 6)).toBe(true);
    // With 200 draws there is a reasonable chance of hitting a leading zero,
    // which is exactly the case the numeric check would have broken.
    const withLeadingZero = codes.filter((c) => c.startsWith('0'));
    expect(withLeadingZero.length).toBeGreaterThan(0);
  });

  it('does not always return the same code', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateInvitationCode()));
    expect(codes.size).toBeGreaterThan(190);
  });
});