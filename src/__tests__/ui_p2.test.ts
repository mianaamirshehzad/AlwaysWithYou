import { cleanPhoneNumber } from '../utils/phone';
import { validateDisplayName, validatePhoneNumber } from '../utils/validation';
import {
  checkVoiceNoteSupport,
  formatAudioDuration,
  startAudioRecording,
  stopAudioRecording,
  playAudioNote,
} from '../services/voiceNotes';
import { LEGAL_CONFIG, openLegalDocument } from '../constants/legal';
import type { Message } from '../models';
import { Alert } from 'react-native';

// Mock Alert.alert for testing
jest.spyOn(Alert, 'alert');

describe('P2 UI & Polish Verifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('P2.3 Phone-Call Confirmation & Number Sanitization', () => {
    it('cleans formatted phone numbers accurately', () => {
      expect(cleanPhoneNumber('(555) 123-4567')).toBe('5551234567');
      expect(cleanPhoneNumber('+1 (800) 555-0199')).toBe('+18005550199');
      expect(cleanPhoneNumber('  +44 20 7946 0991  ')).toBe('+442079460991');
    });

    it('handles null, undefined, or empty phone strings gracefully', () => {
      expect(cleanPhoneNumber(null)).toBe('');
      expect(cleanPhoneNumber(undefined)).toBe('');
      expect(cleanPhoneNumber('')).toBe('');
      expect(cleanPhoneNumber('   ')).toBe('');
    });

    it('strips non-dialable characters while preserving plus and hash', () => {
      expect(cleanPhoneNumber('+1-555-EXT#123')).toBe('+1555#123');
      expect(cleanPhoneNumber('Call: 123-456')).toBe('123456');
    });
  });

  describe('P2.5 Profile Editing Validation', () => {
    describe('validateDisplayName', () => {
      it('rejects empty or whitespace-only names', () => {
        const resEmpty = validateDisplayName('');
        expect(resEmpty.isValid).toBe(false);
        expect(resEmpty.error).toMatch(/cannot be empty/i);

        const resSpace = validateDisplayName('   ');
        expect(resSpace.isValid).toBe(false);
      });

      it('rejects names shorter than 2 characters', () => {
        const resShort = validateDisplayName('A');
        expect(resShort.isValid).toBe(false);
        expect(resShort.error).toMatch(/at least 2 characters/i);
      });

      it('rejects names longer than 50 characters', () => {
        const longName = 'A'.repeat(51);
        const resLong = validateDisplayName(longName);
        expect(resLong.isValid).toBe(false);
        expect(resLong.error).toMatch(/cannot exceed 50 characters/i);
      });

      it('accepts valid trimmed names', () => {
        const res = validateDisplayName('  Alice Smith  ');
        expect(res.isValid).toBe(true);
        expect(res.value).toBe('Alice Smith');
        expect(res.error).toBeUndefined();
      });
    });

    describe('validatePhoneNumber', () => {
      it('allows empty phone numbers since phone is optional', () => {
        const res = validatePhoneNumber('');
        expect(res.isValid).toBe(true);
        expect(res.value).toBe('');
      });

      it('rejects phone numbers containing invalid letters or symbols', () => {
        const res = validatePhoneNumber('123-abc-4567');
        expect(res.isValid).toBe(false);
        expect(res.error).toMatch(/invalid characters/i);
      });

      it('rejects phone numbers with fewer than 7 digits', () => {
        const res = validatePhoneNumber('123-45');
        expect(res.isValid).toBe(false);
        expect(res.error).toMatch(/at least 7 digits/i);
      });

      it('rejects phone numbers with more than 15 digits', () => {
        const res = validatePhoneNumber('+1 234 567 890 123 4567');
        expect(res.isValid).toBe(false);
        expect(res.error).toMatch(/cannot exceed 15 digits/i);
      });

      it('accepts valid international and local numbers', () => {
        const res1 = validatePhoneNumber('+1 (555) 234-5678');
        expect(res1.isValid).toBe(true);
        expect(res1.value).toBe('+1 (555) 234-5678');

        const res2 = validatePhoneNumber('5551234567');
        expect(res2.isValid).toBe(true);
      });
    });
  });

  describe('P2.2 Voice-Note Service & Capability Detection', () => {
    it('accurately identifies missing native audio library without crashing', () => {
      const support = checkVoiceNoteSupport();
      expect(support.isSupported).toBe(false);
      expect(support.hasNativeAudio).toBe(false);
      expect(support.reason).toBeDefined();
      expect(support.reason).toMatch(/expo-audio/i);
    });

    it('formats audio durations accurately', () => {
      expect(formatAudioDuration(undefined)).toBe('0:00');
      expect(formatAudioDuration(0)).toBe('0:00');
      expect(formatAudioDuration(5000)).toBe('0:05');
      expect(formatAudioDuration(15000)).toBe('0:15');
      expect(formatAudioDuration(65000)).toBe('1:05');
      expect(formatAudioDuration(125000)).toBe('2:05');
    });

    it('rejects startAudioRecording with descriptive error when unsupported', async () => {
      await expect(startAudioRecording()).rejects.toThrow(/audio/i);
    });

    it('rejects stopAudioRecording with descriptive error when unsupported', async () => {
      await expect(stopAudioRecording()).rejects.toThrow(/audio/i);
    });

    it('rejects playAudioNote with descriptive error when unsupported', async () => {
      await expect(playAudioNote('https://fake.url/audio.m4a')).rejects.toThrow(/audio/i);
    });
  });

  describe('P2.6 Legal Links Fallback & Configuration', () => {
    it('provides legal configuration endpoints and support email', () => {
      expect(LEGAL_CONFIG).toBeDefined();
      expect(LEGAL_CONFIG.supportEmail).toBe('support@alwayswithyou.care');
    });

    it('gracefully presents informative dialog when external URL is not configured', async () => {
      await openLegalDocument('privacy');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Privacy Policy',
        expect.stringContaining('Firebase Cloud Firestore'),
        expect.any(Array)
      );

      await openLegalDocument('terms');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Terms of Service',
        expect.stringContaining('AlwaysWithYou is designed for private family care'),
        expect.any(Array)
      );

      await openLegalDocument('support');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Help & Support',
        expect.stringContaining('support@alwayswithyou.care'),
        expect.any(Array)
      );
    });
  });

  describe('P2.1 Chat & Message Model Integrity', () => {
    it('supports audio message attributes alongside text messages', () => {
      const textMsg: Message = {
        id: 'msg-1',
        conversationId: 'rel-123',
        senderId: 'user-1',
        text: 'Hello from caregiver',
        messageType: 'text',
        status: 'sent',
        createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
      };
      expect(textMsg.messageType).toBe('text');

      const audioMsg: Message = {
        id: 'msg-2',
        conversationId: 'rel-123',
        senderId: 'user-2',
        text: 'Voice message',
        messageType: 'audio',
        audioUrl: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/voice.m4a',
        audioDurationMs: 14500,
        status: 'delivered',
        createdAt: { seconds: 1700000010, nanoseconds: 0 } as any,
      };
      expect(audioMsg.messageType).toBe('audio');
      expect(audioMsg.audioDurationMs).toBe(14500);
      expect(audioMsg.audioUrl).toContain('voice.m4a');
    });
  });
});
