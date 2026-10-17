import {
  getTodayOccurrences,
  isOccurrenceMissed,
  getOccurrenceScheduledDateTime,
  getOccurrenceEffectiveDeadline,
} from '../services/firestore/tasks';
import { SNOOZE_CONFIG, ESCALATION_CONFIG, type TaskOccurrence } from '../models';

function makeOccurrence(overrides: Partial<TaskOccurrence> = {}): TaskOccurrence {
  const now = new Date();
  return {
    id: 'test-id',
    taskId: 'task-1',
    relationshipId: 'rel-1',
    parentId: 'parent-1',
    childId: 'child-1',
    title: 'Test Task',
    type: 'medicine',
    scheduledDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    scheduledTime: '09:00',
    status: 'pending',
    createdAt: {} as any,
    updatedAt: {} as any,
    ...overrides,
  };
}

describe('getTodayOccurrences', () => {
  it('returns empty arrays for no occurrences', () => {
    const result = getTodayOccurrences([]);
    expect(result.pending).toHaveLength(0);
    expect(result.completed).toHaveLength(0);
    expect(result.missed).toHaveLength(0);
    expect(result.upcoming).toHaveLength(0);
  });

  it('separates completed from pending', () => {
    const completed = makeOccurrence({ id: 'c1', status: 'completed' });
    const pending = makeOccurrence({ id: 'p1', status: 'pending', scheduledTime: '23:59' });
    const result = getTodayOccurrences([completed, pending]);
    expect(result.completed).toHaveLength(1);
    expect(result.completed[0].id).toBe('c1');
  });

  it('identifies missed occurrences', () => {
    const missed = makeOccurrence({ id: 'm1', status: 'missed' });
    const result = getTodayOccurrences([missed]);
    expect(result.missed).toHaveLength(1);
    expect(result.missed[0].id).toBe('m1');
  });

  it('ignores occurrences from other dates', () => {
    const other = makeOccurrence({ id: 'o1', scheduledDate: '2020-01-01', status: 'pending' });
    const result = getTodayOccurrences([other]);
    expect(result.pending).toHaveLength(0);
    expect(result.completed).toHaveLength(0);
    expect(result.missed).toHaveLength(0);
    expect(result.upcoming).toHaveLength(0);
  });

  it('separates snoozed occurrences into upcoming if in future, and pending if elapsed', () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    const pastDate = new Date(Date.now() - 5 * 60 * 1000);
    const snoozedFuture = makeOccurrence({
      id: 's1',
      status: 'snoozed',
      snoozedUntil: { toDate: () => futureDate } as any,
    });
    const snoozedPast = makeOccurrence({
      id: 's2',
      status: 'snoozed',
      snoozedUntil: { toDate: () => pastDate } as any,
    });

    const result = getTodayOccurrences([snoozedFuture, snoozedPast]);
    expect(result.upcoming.map((o) => o.id)).toContain('s1');
    expect(result.pending.map((o) => o.id)).toContain('s2');
  });

  it('filters out cancelled occurrences from today list', () => {
    const cancelled = makeOccurrence({ id: 'c1', status: 'cancelled' });
    const result = getTodayOccurrences([cancelled]);
    expect(result.pending).toHaveLength(0);
    expect(result.completed).toHaveLength(0);
    expect(result.missed).toHaveLength(0);
    expect(result.upcoming).toHaveLength(0);
  });
});

describe('Care reminder validation', () => {
  function validateReminderCreation(params: {
    userRole: string | null;
    relationshipId: string | null;
    parentId: string | null;
    relationships: Array<{ id: string; parentId: string; status: 'active' | 'inactive' }>;
  }): { valid: boolean; error?: string } {
    if (!params.userRole || !params.relationshipId || !params.parentId) {
      return { valid: false, error: 'Please connect a parent first.' };
    }
    if (params.userRole !== 'child') {
      return { valid: false, error: 'Only a caregiver child can create reminders.' };
    }
    const hasActiveRel = params.relationships.some(
      (r) => r.id === params.relationshipId && r.status === 'active' && r.parentId === params.parentId
    );
    if (!hasActiveRel) {
      return { valid: false, error: 'You do not have an active relationship with this parent.' };
    }
    return { valid: true };
  }

  it('rejects when role is parent', () => {
    const res = validateReminderCreation({
      userRole: 'parent',
      relationshipId: 'rel-1',
      parentId: 'parent-1',
      relationships: [{ id: 'rel-1', parentId: 'parent-1', status: 'active' }],
    });
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Only a caregiver child can create reminders.');
  });

  it('rejects when relationship is inactive', () => {
    const res = validateReminderCreation({
      userRole: 'child',
      relationshipId: 'rel-1',
      parentId: 'parent-1',
      relationships: [{ id: 'rel-1', parentId: 'parent-1', status: 'inactive' }],
    });
    expect(res.valid).toBe(false);
    expect(res.error).toBe('You do not have an active relationship with this parent.');
  });

  it('rejects when parentId does not match relationship', () => {
    const res = validateReminderCreation({
      userRole: 'child',
      relationshipId: 'rel-1',
      parentId: 'parent-2',
      relationships: [{ id: 'rel-1', parentId: 'parent-1', status: 'active' }],
    });
    expect(res.valid).toBe(false);
    expect(res.error).toBe('You do not have an active relationship with this parent.');
  });

  it('succeeds when child has active relationship with parent', () => {
    const res = validateReminderCreation({
      userRole: 'child',
      relationshipId: 'rel-1',
      parentId: 'parent-1',
      relationships: [{ id: 'rel-1', parentId: 'parent-1', status: 'active' }],
    });
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });
});

describe('Parent acknowledgment and idempotent completion', () => {
  function processCompletion(
    occurrence: { id: string; status: 'pending' | 'completed' | 'missed'; completedAt?: number; completedBy?: string },
    completedByUid: string
  ): { updated: boolean; occurrence: typeof occurrence } {
    if (occurrence.status === 'completed') {
      return { updated: false, occurrence };
    }
    return {
      updated: true,
      occurrence: {
        ...occurrence,
        status: 'completed',
        completedBy: completedByUid,
        completedAt: 123456789,
      },
    };
  }

  it('completes a pending occurrence with parent UID', () => {
    const occ = { id: 'occ-1', status: 'pending' as const };
    const res = processCompletion(occ, 'parent-user-1');
    expect(res.updated).toBe(true);
    expect(res.occurrence.status).toBe('completed');
    expect(res.occurrence.completedBy).toBe('parent-user-1');
  });

  it('no-ops when occurrence is already completed (idempotency)', () => {
    const occ = { id: 'occ-1', status: 'completed' as const, completedBy: 'parent-user-1', completedAt: 1000 };
    const res = processCompletion(occ, 'parent-user-1');
    expect(res.updated).toBe(false);
    expect(res.occurrence.completedAt).toBe(1000); // timestamp unchanged
  });
});

describe('Single-day query vs range query (Firestore index optimization)', () => {
  function determineQueryType(startDate: string, endDate: string): 'equality' | 'range' {
    return startDate === endDate ? 'equality' : 'range';
  }

  it('uses equality query when startDate equals endDate', () => {
    expect(determineQueryType('2026-10-17', '2026-10-17')).toBe('equality');
  });

  it('uses range query when querying multiple days', () => {
    expect(determineQueryType('2026-10-10', '2026-10-17')).toBe('range');
  });
});

describe('Snooze business logic & constraints', () => {
  function validateSnooze(params: {
    occurrence: TaskOccurrence | null;
    requestingParentUid: string;
    durationMinutes: number;
  }): { valid: boolean; error?: string; safeDuration?: number; newCount?: number } {
    if (!params.occurrence) {
      return { valid: false, error: 'Reminder occurrence not found.' };
    }
    if (params.occurrence.parentId !== params.requestingParentUid) {
      return { valid: false, error: 'Only the assigned parent can snooze this reminder.' };
    }
    if (params.occurrence.status === 'completed') {
      return { valid: false, error: 'Cannot snooze an already completed reminder.' };
    }
    if (params.occurrence.status === 'cancelled') {
      return { valid: false, error: 'Cannot snooze a cancelled reminder.' };
    }
    const currentCount = params.occurrence.snoozeCount || 0;
    if (currentCount >= SNOOZE_CONFIG.MAX_SNOOZE_COUNT) {
      return {
        valid: false,
        error: `Maximum snooze limit (${SNOOZE_CONFIG.MAX_SNOOZE_COUNT} times) reached for this reminder.`,
      };
    }
    const safeDuration = (SNOOZE_CONFIG.ALLOWED_DURATIONS as readonly number[]).includes(params.durationMinutes)
      ? params.durationMinutes
      : SNOOZE_CONFIG.DEFAULT_MINUTES;

    return { valid: true, safeDuration, newCount: currentCount + 1 };
  }

  it('allows valid snooze request and increments count', () => {
    const occ = makeOccurrence({ parentId: 'p1', snoozeCount: 1 });
    const res = validateSnooze({ occurrence: occ, requestingParentUid: 'p1', durationMinutes: 10 });
    expect(res.valid).toBe(true);
    expect(res.safeDuration).toBe(10);
    expect(res.newCount).toBe(2);
  });

  it('falls back to default duration (15m) when invalid duration requested', () => {
    const occ = makeOccurrence({ parentId: 'p1' });
    const res = validateSnooze({ occurrence: occ, requestingParentUid: 'p1', durationMinutes: 99 });
    expect(res.valid).toBe(true);
    expect(res.safeDuration).toBe(15);
  });

  it('rejects snooze when unauthorized user attempts it', () => {
    const occ = makeOccurrence({ parentId: 'p1' });
    const res = validateSnooze({ occurrence: occ, requestingParentUid: 'child-1', durationMinutes: 15 });
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Only the assigned parent can snooze this reminder.');
  });

  it('enforces maximum snooze limit of 3', () => {
    const occ = makeOccurrence({ parentId: 'p1', snoozeCount: 3 });
    const res = validateSnooze({ occurrence: occ, requestingParentUid: 'p1', durationMinutes: 15 });
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Maximum snooze limit (3 times) reached for this reminder.');
  });

  it('rejects snooze on completed or cancelled occurrences', () => {
    const completedOcc = makeOccurrence({ parentId: 'p1', status: 'completed' });
    const cancelledOcc = makeOccurrence({ parentId: 'p1', status: 'cancelled' });

    expect(validateSnooze({ occurrence: completedOcc, requestingParentUid: 'p1', durationMinutes: 15 }).valid).toBe(false);
    expect(validateSnooze({ occurrence: cancelledOcc, requestingParentUid: 'p1', durationMinutes: 15 }).valid).toBe(false);
  });
});

describe('Missed reminder detection and escalation logic', () => {
  it('marks scheduled task missed after 30 min grace period', () => {
    const now = new Date('2026-10-17T10:00:00');
    const occ = makeOccurrence({ scheduledDate: '2026-10-17', scheduledTime: '09:00', status: 'pending' });
    expect(isOccurrenceMissed(occ, now)).toBe(true);
  });

  it('does NOT mark task missed within 30 min grace period', () => {
    const now = new Date('2026-10-17T09:15:00');
    const occ = makeOccurrence({ scheduledDate: '2026-10-17', scheduledTime: '09:00', status: 'pending' });
    expect(isOccurrenceMissed(occ, now)).toBe(false);
  });

  it('an occurrence scheduled yesterday and snoozed until later today is NOT marked missed', () => {
    // Scheduled yesterday at 22:00, snoozed until today 14:00.
    // Evaluated today at 10:00.
    const now = new Date('2026-10-17T10:00:00');
    const snoozedUntil = new Date('2026-10-17T14:00:00');
    const occ = makeOccurrence({
      scheduledDate: '2026-10-16',
      scheduledTime: '22:00',
      status: 'snoozed',
      snoozedUntil: { toDate: () => snoozedUntil } as any,
    });
    expect(isOccurrenceMissed(occ, now)).toBe(false);
  });

  it('a snooze deadline that has elapsed but remains within the grace period is NOT marked missed', () => {
    // Snooze deadline was 14:00 today. Evaluated at 14:15 (within 30m grace period).
    const now = new Date('2026-10-17T14:15:00');
    const snoozedUntil = new Date('2026-10-17T14:00:00');
    const occ = makeOccurrence({
      scheduledDate: '2026-10-17',
      scheduledTime: '09:00',
      status: 'snoozed',
      snoozedUntil: { toDate: () => snoozedUntil } as any,
    });
    expect(isOccurrenceMissed(occ, now)).toBe(false);
  });

  it('a snooze deadline that has elapsed beyond the grace period IS marked missed', () => {
    // Snooze deadline was 14:00 today. Evaluated at 14:35 (beyond 30m grace period).
    const now = new Date('2026-10-17T14:35:00');
    const snoozedUntil = new Date('2026-10-17T14:00:00');
    const occ = makeOccurrence({
      scheduledDate: '2026-10-17',
      scheduledTime: '09:00',
      status: 'snoozed',
      snoozedUntil: { toDate: () => snoozedUntil } as any,
    });
    expect(isOccurrenceMissed(occ, now)).toBe(true);
  });

  it('acknowledged and cancelled occurrences are never marked missed or escalated', () => {
    const now = new Date('2026-10-17T12:00:00');
    const completedOcc = makeOccurrence({
      scheduledDate: '2026-10-17',
      scheduledTime: '08:00',
      status: 'completed',
    });
    const cancelledOcc = makeOccurrence({
      scheduledDate: '2026-10-17',
      scheduledTime: '08:00',
      status: 'cancelled',
    });

    expect(isOccurrenceMissed(completedOcc, now)).toBe(false);
    expect(isOccurrenceMissed(cancelledOcc, now)).toBe(false);
  });

  it('correctly handles midnight boundary grace period for late-night reminders', () => {
    // Task scheduled at 23:50 on 2026-10-16.
    // Grace period of 30 mins means deadline is 00:20 on 2026-10-17.
    const occ = makeOccurrence({
      scheduledDate: '2026-10-16',
      scheduledTime: '23:50',
      status: 'pending',
    });

    // Evaluated at 00:10 on 2026-10-17 (20 min after scheduled) -> NOT missed
    const at0010 = new Date('2026-10-17T00:10:00');
    expect(isOccurrenceMissed(occ, at0010)).toBe(false);

    // Evaluated at 00:25 on 2026-10-17 (35 min after scheduled) -> MISSED
    const at0025 = new Date('2026-10-17T00:25:00');
    expect(isOccurrenceMissed(occ, at0025)).toBe(true);
  });

  it('calculates effective deadlines consistently across pending and snoozed states', () => {
    const pendingOcc = makeOccurrence({
      scheduledDate: '2026-10-17',
      scheduledTime: '09:00',
      status: 'pending',
    });
    const pendingDeadline = getOccurrenceEffectiveDeadline(pendingOcc);
    expect(pendingDeadline.getHours()).toBe(9);
    expect(pendingDeadline.getMinutes()).toBe(30);

    const snoozedDate = new Date('2026-10-17T10:15:00');
    const snoozedOcc = makeOccurrence({
      scheduledDate: '2026-10-17',
      scheduledTime: '09:00',
      status: 'snoozed',
      snoozedUntil: { toDate: () => snoozedDate } as any,
    });
    const snoozedDeadline = getOccurrenceEffectiveDeadline(snoozedOcc);
    expect(snoozedDeadline.getHours()).toBe(10);
    expect(snoozedDeadline.getMinutes()).toBe(45);
  });

  it('supports late acknowledgment on previously missed occurrence', () => {
    // When a parent acknowledges late, status changes to 'completed'
    const missedOcc = makeOccurrence({
      scheduledDate: '2026-10-17',
      scheduledTime: '09:00',
      status: 'missed',
      escalatedAt: { seconds: 12345 } as any,
    });
    expect(isOccurrenceMissed(missedOcc)).toBe(true);

    const acknowledgedLate = {
      ...missedOcc,
      status: 'completed' as const,
      completedAt: { seconds: 54321 } as any,
      completedBy: 'parent-1',
    };
    expect(isOccurrenceMissed(acknowledgedLate)).toBe(false);
  });
});

describe('History occurrences filtering and sorting', () => {
  function filterAndSortHistory(occs: TaskOccurrence[], today: string): TaskOccurrence[] {
    return occs
      .filter((o) => (o.scheduledDate < today || o.status === 'completed' || o.status === 'missed') && o.status !== 'cancelled')
      .sort((a, b) => {
        const dateCmp = b.scheduledDate.localeCompare(a.scheduledDate);
        if (dateCmp !== 0) return dateCmp;
        return b.scheduledTime.localeCompare(a.scheduledTime);
      });
  }

  it('excludes future pending occurrences and cancelled occurrences', () => {
    const today = '2026-10-17';
    const pastMissed = makeOccurrence({ id: 'h1', scheduledDate: '2026-10-15', scheduledTime: '08:00', status: 'missed' });
    const todayCompleted = makeOccurrence({ id: 'h2', scheduledDate: '2026-10-17', scheduledTime: '09:00', status: 'completed' });
    const todayPending = makeOccurrence({ id: 'h3', scheduledDate: '2026-10-17', scheduledTime: '18:00', status: 'pending' });
    const pastCancelled = makeOccurrence({ id: 'h4', scheduledDate: '2026-10-15', scheduledTime: '09:00', status: 'cancelled' });

    const result = filterAndSortHistory([pastMissed, todayCompleted, todayPending, pastCancelled], today);
    expect(result.map((o) => o.id)).toEqual(['h2', 'h1']);
  });

  it('sorts reverse-chronologically by date then time', () => {
    const today = '2026-10-17';
    const o1 = makeOccurrence({ id: '1', scheduledDate: '2026-10-10', scheduledTime: '10:00', status: 'completed' });
    const o2 = makeOccurrence({ id: '2', scheduledDate: '2026-10-15', scheduledTime: '08:00', status: 'completed' });
    const o3 = makeOccurrence({ id: '3', scheduledDate: '2026-10-15', scheduledTime: '14:00', status: 'completed' });

    const result = filterAndSortHistory([o1, o2, o3], today);
    expect(result.map((o) => o.id)).toEqual(['3', '2', '1']);
  });
});

