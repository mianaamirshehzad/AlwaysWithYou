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
