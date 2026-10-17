import { Timestamp } from 'firebase/firestore';

export type UserRole = 'child' | 'parent';

export type UserProfile = {
  uid: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  dateOfBirth?: string;
  pushToken?: string;
  createdAt: Timestamp;
};

export type RelationshipStatus = 'active' | 'inactive';

export type Relationship = {
  id: string;
  childId: string;
  parentId: string;
  /** Six digit code that this parent redeemed to create the relationship. */
  invitationCode?: string;
  status: RelationshipStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type TaskType = 'medicine' | 'water' | 'walk' | 'exercise' | 'call' | 'custom';

export type Frequency = 'once' | 'daily' | 'weekly' | 'custom';

export type TaskStatus = 'pending' | 'completed' | 'missed' | 'cancelled' | 'snoozed';

export type CareTask = {
  id: string;
  relationshipId: string;
  createdBy: string;
  assignedTo: string;
  type: TaskType;
  title: string;
  description?: string;
  note?: string;
  scheduledTime: string; // HH:mm format
  frequency: Frequency;
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type TaskOccurrence = {
  id: string;
  taskId: string;
  relationshipId: string;
  parentId: string;
  childId: string;
  title: string;
  type: TaskType;
  note?: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  status: TaskStatus;
  snoozedUntil?: Timestamp;
  snoozeCount?: number;
  completedAt?: Timestamp;
  completedBy?: string;
  escalatedAt?: Timestamp;
  escalatedTo?: string;
  escalationStage?: number;
  escalationDeliveryStatus?: 'pending' | 'delivered' | 'failed' | 'not_configured';
  escalationDeliveredAt?: Timestamp;
  escalationError?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export const SNOOZE_CONFIG = {
  DEFAULT_MINUTES: 15,
  ALLOWED_DURATIONS: [5, 10, 15, 30] as const,
  MAX_SNOOZE_COUNT: 3,
} as const;

export const ESCALATION_CONFIG = {
  GRACE_PERIOD_MINUTES: 30,
} as const;

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'audio';

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  messageType?: MessageType;
  audioUrl?: string;
  audioDurationMs?: number;
  status: MessageStatus;
  createdAt: Timestamp;
};

export type Conversation = {
  id: string;
  relationshipId: string;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  createdAt: Timestamp;
};

export type UserPreferences = {
  pushNotifications: boolean;
  dailySummaryEmail: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  snoozeMinutes: number;
  textSize: number; // 0-1
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  pushNotifications: true,
  dailySummaryEmail: false,
  soundEnabled: true,
  vibrateEnabled: false,
  snoozeMinutes: 15,
  textSize: 0.5,
};

export const TASK_TYPE_CONFIG: Record<TaskType, { label: string; icon: string; defaultTime: string }> = {
  medicine: { label: 'Medicine', icon: 'medical-outline', defaultTime: '08:00' },
  water: { label: 'Water', icon: 'water-outline', defaultTime: '10:00' },
  walk: { label: 'Walk', icon: 'walk-outline', defaultTime: '09:00' },
  exercise: { label: 'Exercise', icon: 'fitness-outline', defaultTime: '07:00' },
  call: { label: 'Call', icon: 'call-outline', defaultTime: '18:00' },
  custom: { label: 'Custom', icon: 'ellipsis-horizontal-outline', defaultTime: '12:00' },
};
