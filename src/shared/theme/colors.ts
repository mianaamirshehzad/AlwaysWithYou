// Centralized app color tokens.
// Prefer importing this everywhere instead of inline hex/rgba literals.

const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

const BRAND_PRIMARY = '#55E08F';
const BRAND_ON_PRIMARY = '#0E1A16';

const AUTH_BG = '#062B22';
const DASH_BG = '#071F19';
const WHITE = '#FFFFFF';

const alpha = {
  // White alphas used across the app
  white90: 'rgba(255,255,255,0.90)',
  white85: 'rgba(255,255,255,0.85)',
  white82: 'rgba(255,255,255,0.82)',
  white80: 'rgba(255,255,255,0.80)',
  white78: 'rgba(255,255,255,0.78)',
  white75: 'rgba(255,255,255,0.75)',
  white70: 'rgba(255,255,255,0.70)',
  white65: 'rgba(255,255,255,0.65)',
  white60: 'rgba(255,255,255,0.60)',
  white55: 'rgba(255,255,255,0.55)',
  white50: 'rgba(255,255,255,0.50)',
  white45: 'rgba(255,255,255,0.45)',
  white40: 'rgba(255,255,255,0.40)',
  white35: 'rgba(255,255,255,0.35)',
  white34: 'rgba(255,255,255,0.34)',
  white30: 'rgba(255,255,255,0.30)',
  white28: 'rgba(255,255,255,0.28)',
  white25: 'rgba(255,255,255,0.25)',
  white22: 'rgba(255,255,255,0.22)',
  white16: 'rgba(255,255,255,0.16)',
  white12: 'rgba(255,255,255,0.12)',
  white10: 'rgba(255,255,255,0.10)',
  white08: 'rgba(255,255,255,0.08)',
  white06: 'rgba(255,255,255,0.06)',
  white05: 'rgba(255,255,255,0.05)',
  white04: 'rgba(255,255,255,0.04)',

  // Black alphas used in templates/shadows
  black80: 'rgba(0,0,0,0.8)',
  black05: 'rgba(0,0,0,0.05)',
} as const;

const Colors = {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    separator: '#eee',
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
    separator: 'rgba(255,255,255,0.1)',
  },

  brand: {
    primary: BRAND_PRIMARY,
    onPrimary: BRAND_ON_PRIMARY,
    primarySoftBg: 'rgba(85,224,143,0.16)',
  },

  alpha,

  auth: {
    bg: AUTH_BG,
    text: WHITE,
    muted: alpha.white70,
    subtle: alpha.white55,
    chipBorder: alpha.white08,
    accent: BRAND_PRIMARY,

    heroBg: '#F3E7DB',
    heroCardBg: alpha.white06,
    heroOverlay: 'rgba(6,43,34,0.30)',

    overlayStrong: 'rgba(6,43,34,0.45)',
    terms: alpha.white34,
    link: BRAND_PRIMARY,
    circleBg: alpha.white08,
    circleImageOpacity: 0.22 as const,

    roleAccent: '#7BCCB5',
    roleAccentSoft: 'rgba(123,204,181,0.16)',
    roleSelectedBg: 'rgba(123,204,181,0.14)',
    roleSelectedBorder: 'rgba(123,204,181,0.60)',
  },

  dashboard: {
    bg: DASH_BG,
    text: WHITE,
    surface: alpha.white04,
    surfaceStrong: alpha.white06,
    border: alpha.white06,

    icon: alpha.white85,
    iconMuted: alpha.white75,

    accent: '#32D57B',
    warning: '#E7A349',
    info: '#38BDF8',
    danger: '#F43F5E',
    purple: '#845EF7',
    purpleSoft: '#C8BEFF',

    // Status / chip backgrounds
    accentSoftBg: 'rgba(50,213,123,0.10)',
    accentSoftBorder: 'rgba(50,213,123,0.22)',
    accentText: 'rgba(50,213,123,0.95)',
    accentIconBg: 'rgba(50,213,123,0.12)',
    accentSelectedBg: 'rgba(50,213,123,0.16)',
    accentSelectedBorder: 'rgba(50,213,123,0.35)',
    accentPillBorder: 'rgba(50,213,123,0.18)',

    warningSoftBg: 'rgba(231,163,73,0.10)',
    warningSoftBorder: 'rgba(231,163,73,0.25)',
    warningText: 'rgba(231,163,73,0.95)',

    dangerSoftBg: 'rgba(244,63,94,0.10)',
    dangerSoftBorder: 'rgba(244,63,94,0.22)',
    dangerText: 'rgba(244,63,94,0.95)',
    dangerIconBg: 'rgba(244,63,94,0.12)',
    dangerIconFg: 'rgba(255,185,195,0.95)',

    infoSoftBg: 'rgba(56,189,248,0.10)',
    infoSoftBorder: 'rgba(56,189,248,0.22)',
    infoText: 'rgba(56,189,248,0.95)',
    infoIconBg: 'rgba(56,189,248,0.12)',
    infoIconFg: 'rgba(170,235,255,0.95)',

    purpleSoftBg: 'rgba(132,94,247,0.12)',
    purpleIconFg: 'rgba(200,190,255,0.95)',

    // Tab bar
    tabInactive: alpha.white45,
  },
} as const;

export default Colors;

