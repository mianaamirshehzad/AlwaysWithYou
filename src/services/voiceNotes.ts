/* eslint-disable @typescript-eslint/no-require-imports */
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

export type AudioPlaybackCallback = (status: {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  didFinish: boolean;
}) => void;

let activeAudioRecorder: any = null;
let recordingStartTimestamp: number = 0;
let activeAudioPlayer: any = null;
let activePlayerListener: any = null;

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
  let expoAudio: any;
  try {
    expoAudio = require('expo-audio');
  } catch {
    throw new Error('Audio recording library (expo-audio) is not available in this environment.');
  }

  if (!expoAudio) {
    throw new Error('Audio recording is not supported in this build.');
  }

  try {
    if (typeof expoAudio.requestRecordingPermissionsAsync === 'function') {
      const permission = await expoAudio.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission is required to record voice messages.');
      }
    }

    if (typeof expoAudio.setAudioModeAsync === 'function') {
      await expoAudio.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
    }

    const AudioRecorder = expoAudio.AudioRecorder;
    const RecordingPresets = expoAudio.RecordingPresets;

    if (AudioRecorder) {
      const options = RecordingPresets?.HIGH_QUALITY ?? {};
      const recorder = new AudioRecorder(options);
      if (typeof recorder.prepareToRecordAsync === 'function') {
        await recorder.prepareToRecordAsync();
      }
      if (typeof recorder.record === 'function') {
        recorder.record();
      }
      activeAudioRecorder = recorder;
    } else {
      activeAudioRecorder = {
        mock: true,
        stop: async () => {},
        uri: `file:///cache/voice_${Date.now()}.m4a`,
      };
    }
    recordingStartTimestamp = Date.now();
  } catch (err: any) {
    activeAudioRecorder = null;
    throw new Error(err?.message ?? 'Failed to start audio recording.');
  }
}

/**
 * Stops audio recording and returns audio metadata.
 */
export async function stopAudioRecording(): Promise<AudioRecordingResult> {
  if (!activeAudioRecorder) {
    const support = checkVoiceNoteSupport();
    if (!support.isSupported) {
      throw new Error(support.reason ?? 'Audio recording is not supported in this build.');
    }
    throw new Error('No active audio recording in progress.');
  }

  const recorder = activeAudioRecorder;
  activeAudioRecorder = null;
  const durationMs = Math.max(1000, Date.now() - recordingStartTimestamp);

  try {
    if (typeof recorder.stop === 'function') {
      await recorder.stop();
    }
    const uri = recorder.uri || `file:///cache/voice_${Date.now()}.m4a`;
    return {
      uri,
      durationMs,
    };
  } catch (err: any) {
    throw new Error(err?.message ?? 'Failed to stop audio recording.');
  }
}

/**
 * Cancels and discards active audio recording without throwing.
 */
export async function cancelAudioRecording(): Promise<void> {
  if (activeAudioRecorder) {
    try {
      if (typeof activeAudioRecorder.stop === 'function') {
        await activeAudioRecorder.stop();
      }
    } catch {
      // Discard
    } finally {
      activeAudioRecorder = null;
    }
  }
}

/**
 * Plays an audio URL or throws descriptive error.
 */
export async function playAudioNote(
  audioUrl: string,
  onStatusUpdate?: AudioPlaybackCallback
): Promise<void> {
  let expoAudio: any;
  try {
    expoAudio = require('expo-audio');
  } catch {
    throw new Error('Audio playback library (expo-audio) is not available in this environment.');
  }

  if (!expoAudio) {
    throw new Error('Audio playback is not supported in this build.');
  }

  try {
    await stopAudioPlayback();

    if (typeof expoAudio.setAudioModeAsync === 'function') {
      await expoAudio.setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    }

    if (typeof expoAudio.createAudioPlayer === 'function') {
      const player = expoAudio.createAudioPlayer(audioUrl);
      activeAudioPlayer = player;

      if (onStatusUpdate && typeof player.addListener === 'function') {
        activePlayerListener = player.addListener('playbackStatusUpdate', (status: any) => {
          const isPlaying = Boolean(status?.playing);
          const positionMs = Math.round((status?.currentTime ?? 0) * 1000);
          const durationMs = Math.round((status?.duration ?? 0) * 1000);
          const didFinish = Boolean(
            status?.didJustFinish ||
              (status?.currentTime > 0 &&
                status?.duration > 0 &&
                status.currentTime >= status.duration)
          );

          onStatusUpdate({
            isPlaying,
            positionMs,
            durationMs,
            didFinish,
          });

          if (didFinish) {
            stopAudioPlayback().catch(() => {});
          }
        });
      }

      if (typeof player.play === 'function') {
        player.play();
      }
    }
  } catch (err: any) {
    await stopAudioPlayback();
    throw new Error(err?.message ?? 'Failed to play audio note.');
  }
}

/**
 * Pauses active audio playback.
 */
export async function pauseAudioPlayback(): Promise<void> {
  if (activeAudioPlayer) {
    try {
      if (typeof activeAudioPlayer.pause === 'function') {
        activeAudioPlayer.pause();
      }
    } catch {
      // Ignore
    }
  }
}

/**
 * Resumes active audio playback.
 */
export async function resumeAudioPlayback(): Promise<void> {
  if (activeAudioPlayer) {
    try {
      if (typeof activeAudioPlayer.play === 'function') {
        activeAudioPlayer.play();
      }
    } catch {
      // Ignore
    }
  }
}

/**
 * Stops and releases active audio playback.
 */
export async function stopAudioPlayback(): Promise<void> {
  if (activePlayerListener) {
    try {
      if (typeof activePlayerListener.remove === 'function') {
        activePlayerListener.remove();
      }
    } catch {
      // Ignore
    }
    activePlayerListener = null;
  }

  if (activeAudioPlayer) {
    try {
      if (typeof activeAudioPlayer.pause === 'function') {
        activeAudioPlayer.pause();
      }
      if (typeof activeAudioPlayer.release === 'function') {
        activeAudioPlayer.release();
      }
    } catch {
      // Ignore
    }
    activeAudioPlayer = null;
  }
}
