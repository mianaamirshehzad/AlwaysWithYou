import Colors from '@/src/assets/Colors';

const childSettingsColors = {
  background: Colors.dashboard.bg,
  card: Colors.dashboard.surface,
  border: Colors.dashboard.border,
  divider: Colors.dashboard.border,

  text: Colors.dashboard.text,
  textSecondary: Colors.alpha.white70,
  textMuted: Colors.alpha.white45,
  sectionTitle: Colors.alpha.white55,

  accent: Colors.dashboard.accent,
  accentSoft: Colors.dashboard.accentSoftBg,
  accentBorder: Colors.dashboard.accentSoftBorder,

  purple: Colors.dashboard.purple,
  purpleSoft: Colors.dashboard.purpleSoftBg,

  green: Colors.dashboard.accent,
  greenSoft: Colors.dashboard.accentSoftBg,

  switchTrackOff: Colors.alpha.white16,

  white: Colors.dashboard.text,
  black: Colors.alpha.black80,
} as const;

export default childSettingsColors;
