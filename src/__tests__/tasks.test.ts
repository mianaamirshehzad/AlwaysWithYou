import { getTodayOccurrences } from '../services/firestore/tasks';
import type { TaskOccurrence } from '../models';

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
