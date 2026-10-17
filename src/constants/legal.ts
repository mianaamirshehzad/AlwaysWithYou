import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Colors from '@/src/assets/Colors';

export const LEGAL_CONFIG = {
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? '',
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
  supportEmail: 'support@alwayswithyou.care',
};

export type LegalDocType = 'terms' | 'privacy' | 'support';

const FALLBACK_MESSAGES: Record<LegalDocType, { title: string; body: string }> = {
  terms: {
    title: 'Terms of Service',
    body: 'AlwaysWithYou is designed for private family care coordination and daily reminder management. Care tasks, acknowledgments, and messages are shared strictly between authorized family caregivers and care receivers. The service must not be used as a replacement for professional emergency medical care.',
  },
  privacy: {
    title: 'Privacy Policy',
    body: 'Your personal care data and check-in history are encrypted and stored in secure Firebase Cloud Firestore databases. Data access is restricted to verified family relationships. We do not sell, rent, or monetize your health or contact data with third-party advertisers.',
  },
  support: {
    title: 'Help & Support',
    body: 'For assistance with setup, caregiver pairing, or daily reminder configuration, reach out to our dedicated care support team at support@alwayswithyou.care.',
  },
};

/**
 * Opens a legal document in an in-app browser when configured,
 * or gracefully presents an informative summary dialog if no external URL is defined.
 */
export async function openLegalDocument(type: LegalDocType): Promise<void> {
  const targetUrl = type === 'terms' ? LEGAL_CONFIG.termsUrl : type === 'privacy' ? LEGAL_CONFIG.privacyUrl : '';

  if (targetUrl && (targetUrl.startsWith('https://') || targetUrl.startsWith('http://'))) {
    try {
      await WebBrowser.openBrowserAsync(targetUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        toolbarColor: Colors.dashboard.bg,
        controlsColor: Colors.dashboard.accent,
      });
      return;
    } catch {
      // If browser fails to open, fall back to dialogue
    }
  }

  const fallback = FALLBACK_MESSAGES[type];
  Alert.alert(fallback.title, fallback.body, [{ text: 'Understood' }]);
}

