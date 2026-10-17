/**
 * Voice Note Service Abstraction for AlwaysWithYou.
 *
 * Handles native audio recording and cloud storage availability checks.
 * When native audio (expo-audio) or Firebase Storage is not installed or configured,
 * provides explicit diagnostics and prevents application crashes.
 */

export type VoiceNoteSupportStatus = {
  isSupported: boolean;
  hasNativeAudio: boolean;
  hasStorageBucket: boolean;
  reason?: string;
};

export type AudioRecordingResult = {
  uri: string;
  durationMs: number;
};

/**
 * Checks whether native audio recording and cloud storage are available in the current runtime.
 */
export function checkVoiceNoteSupport(): VoiceNoteSupportStatus {
  // Check for native audio package
  let hasNativeAudio = false;
  try {
    // Attempt require if present in the runtime
    const expoAudio = require('expo-audio');
    if (expoAudio) {
      hasNativeAudio = true;
    }
  } catch {
    hasNativeAudio = false;
  }

  // Check for Firebase Storage configuration
  const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const hasStorageBucket = Boolean(storageBucket && storageBucket.trim().length > 0);

  const isSupported = hasNativeAudio && hasStorageBucket;

  let reason: string | undefined;
  if (!hasNativeAudio && !hasStorageBucket) {
    reason =
      'Voice messages require the expo-audio library and a configured Firebase Cloud Storage bucket.';
  } else if (!hasNativeAudio) {
    reason =
      'Voice messages require the expo-audio package to be installed in your application.';
  } else if (!hasStorageBucket) {
    reason =
      'Firebase Cloud Storage bucket is not configured. Please define EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET.';
  }

  return {
    isSupported,
    hasNativeAudio,
    hasStorageBucket,
    reason,
  };
}

/**
 * Formats duration in milliseconds to mm:ss string
 */
export function formatAudioDuration(durationMs?: number): string {
  if (!durationMs || durationMs <= 0) return '0:00';
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Starts audio recording if supported, or throws descriptive error.
 */
export async function startAudioRecording(): Promise<void> {
  const support = checkVoiceNoteSupport();
  if (!support.isSupported) {
    throw new Error(support.reason ?? 'Audio recording is not supported in this build.');
  }
  // Native recording integration would go here once expo-audio is installed
  throw new Error('Native audio recording package is not installed.');
}

/**
 * Stops audio recording and returns audio metadata.
 */
export async function stopAudioRecording(): Promise<AudioRecordingResult> {
  const support = checkVoiceNoteSupport();
  if (!support.isSupported) {
    throw new Error(support.reason ?? 'Audio recording is not supported in this build.');
  }
  throw new Error('Native audio recording package is not installed.');
}

/**
 * Plays an audio URL or throws descriptive error.
 */
export async function playAudioNote(audioUrl: string): Promise<void> {
  const support = checkVoiceNoteSupport();
  if (!support.isSupported) {
    throw new Error(support.reason ?? 'Audio playback is not supported in this build.');
  }
  throw new Error('Native audio playback package is not installed.');
}

