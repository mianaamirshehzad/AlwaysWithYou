import type { TaskType } from '@/src/models';

/**
 * Extracts a friendly first name greeting for a parent if available.
 */
export function getParentGreeting(parentName?: string): string {
  if (!parentName) return '';
  const trimmed = parentName.trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === 'your parent' ||
    trimmed.toLowerCase() === 'parent'
  ) {
    return '';
  }
  const firstName = trimmed.split(' ')[0];
  return `Hi ${firstName}, `;
}

/**
 * Generates the ready-made caregiver note for standard reminder types.
 */
export function getReadyMadeNote(type: TaskType, parentName?: string): string {
  const greeting = getParentGreeting(parentName);
  switch (type) {
    case 'medicine':
      return `${greeting}remember to take your medicine on time.`;
    case 'water':
      return `${greeting}please drink a glass of water and stay hydrated.`;
    case 'walk':
      return `${greeting}time for a gentle and refreshing walk.`;
    case 'exercise':
      return `${greeting}time for your daily light exercise.`;
    case 'call':
      return `${greeting}looking forward to our call today!`;
    case 'custom':
    default:
      return '';
  }
}

/**
 * Checks whether a given note string matches an auto-generated ready-made note.
 */
export function isReadyMadeNote(note: string, parentName?: string): boolean {
  if (!note || !note.trim()) return false;
  const types: TaskType[] = ['medicine', 'water', 'walk', 'exercise', 'call'];
  return types.some((t) => getReadyMadeNote(t, parentName) === note.trim());
}

