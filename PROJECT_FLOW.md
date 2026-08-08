# AlwaysWithYou — Project Flow & Architecture

A comprehensive overview so an AI assistant can understand the codebase quickly and safely modify it.

---

## 1. Identity & Stack

| Aspect | Value |
|---|---|
| Name | AlwaysWithYou (family care / reminders app) |
| Entry point | `expo-router/entry` (file-based routing) |
| Expo SDK | 54.0.36 |
| React Native | 0.81.5 |
| React | 19.1.0 |
| Language | TypeScript, `strict: true`, JSX `react-jsx` |
| Router | Expo Router v6 (`app/` directory) with **typed routes enabled** |
| Icons | `@expo/vector-icons` — **Ionicons** is the standard icon family everywhere |
| Navigation libs | `@react-navigation/native` v7 (under Expo Router), `react-native-screens`, `react-native-safe-area-context` |
| Other notable deps | `@react-native-community/datetimepicker`, `expo-web-browser`, `expo-linking`, `expo-font`, `react-native-reanimated` |
| State management | **None** — plain React `useState` per screen |
| Backend / auth | **None** — no API client, no storage, no session, no user model |
| Tests / lint | No test suite wired to `npm test`, **no lint script**, no ESLint config. Validation = `npx tsc --noEmit` and `npx expo export` |

### Scripts (package.json)
- `npm start` → `expo start`
- `npm run ios` → `expo start --ios`
- `npm run android` → `expo start --android`
- `npm run web` → `expo start --web`

No `build`/`test`/`lint` scripts exist. Do not add lint/test commands that don't exist; use `tsc --noEmit` for validation.

### Path aliases (tsconfig.json)
- `@/*` → project root
- `@assets/*` → `src/assets/*`, `@shared/*` → `src/shared/*`, `@features/*` → `src/features/*`, `@core/*` → `src/core/*`, `@services/*` → `src/services/*` (the last three folders are mostly empty scaffolding)

Import style is **mixed** in the codebase: many files use relative imports (`../../assets/Images`), some use `@/src/assets/Colors`. Match the file you're editing.

---

## 2. Folder Architecture

```
app/                      → Expo Router routes (file-based navigation)
  _layout.tsx             → root Stack layout
  index.tsx               → `/` role selection
  signup.tsx, login.tsx, invite.tsx → auth routes
  (tabs)/                 → CHILD bottom-tab group (dark green theme)
  (parent-tabs)/          → PARENT bottom-tab group (dark green theme)
  modal.tsx, +not-found.tsx, +html.tsx → template leftovers
src/
  assets/Colors.tsx       → re-exports shared theme (default export `Colors`)
  assets/Images.tsx       → bundled JPG assets (hands, medicine, water, rest, walk, call, lunch)
  shared/theme/colors.ts  → THE single source of truth for app colors
  components/             → reusable UI, grouped by feature
  screens/                → full screens, grouped by role (Child, Parent, Authentication)
  core/errors/            → AppError class + error normalizers (scaffolded, mostly unused)
  features/, shared/, services/ → mostly README scaffolding, empty
components/               → expo template leftovers (Themed, StyledText, ExternalLink…) — legacy, avoid
```

---

## 3. Navigation Tree (exact)

Root `app/_layout.tsx` declares a `Stack` (all screens `headerShown: false` except `modal`):

```
Stack
├── index            → RoleSelectionScreen        (onboarding role picker)
├── signup           → SignupScreen
├── login            → LoginScreen
├── invite           → InviteCodeLinkingScreen
├── (tabs)           → CHILD tab navigator (5 tabs)
│   ├── index       → ChildDashboardScreen   (Home)
│   ├── two         → empty placeholder View (Plan)
│   ├── three       → empty placeholder View (Chat)
│   ├── four        → empty placeholder View (Profile)
│   └── settings    → ChildSettingsScreen     (Settings — newly implemented)
├── (parent-tabs)   → PARENT tab navigator (3 tabs)
│   ├── index       → ParentDashboardScreen  (Home)
│   ├── calendar    → ParentCalendarScreen   (Calendar)
│   └── settings    → ParentSetting          (Settings)
└── modal           → expo template modal (legacy)
```

- Tab bars are built in `app/(tabs)/_layout.tsx` and `app/(parent-tabs)/_layout.tsx` using the same styling: dark background `Colors.dashboard.bg`, green active tint `Colors.dashboard.accent`, Ionicons outline icons.
- Route files in `app/` are thin wrappers: they import a screen from `src/screens/...` and render it. Keep this pattern.

### Navigation helpers used
- `useRouter()` / `router.replace(...)`, `router.push(...)`, `router.dismissAll()`, `router.back()`
- `useNavigation()` / `navigation.canGoBack()`, `navigation.goBack()`
- Back-button convention: `navigation.canGoBack() ? navigation.goBack() : router.replace('<fallback route>')`

---

## 4. User Flows (as currently implemented)

### Onboarding / auth flow (all MOCKED — no real accounts)
1. App opens → `/` → `RoleSelectionScreen` (dark green hero screen, radio cards "I am a Child" / "I am a Parent").
2. **Continue** with `child` → `router.replace('/signup', { params: { role } })`. With `parent` → `router.replace('/(parent-tabs)')` (straight into the Parent app).
3. `SignupScreen` → "Link my family account" → `router.push('/invite')`.
4. `InviteCodeLinkingScreen` ("I have a code" / "Share my code" tabs, 6-digit code boxes) → **Link Account** → `router.dismissAll(); router.replace('/(tabs)')` → lands in Child tabs.
5. `LoginScreen` (email + phone inputs) → **Login** → same: `dismissAll(); replace('/(tabs)')`.

There is **no logout implementation** anywhere. `ChildSettingsScreen`'s Log Out button calls `router.replace('/')` (back to role selection) as its integration point.

### Child side (role: sends reminders to parents)
- **Home** (`ChildDashboardScreen`): greeting header ("Sarah", avatar `Images.hands`), notification + settings icon buttons (visual only), Today's summary card (75%, streak), Quick Send pills (Water/Meds/Call), Timeline list (segment toggle Today/History) of `CareCard`s, floating "+" button that opens the **CreateNewReminderModal** (full-screen modal: reminder type grid, optional 120-char note, time picker via `DateTimePicker`, frequency chips Daily/Weekly/Custom with repeat-days chips).
- **Settings** (`ChildSettingsScreen`): light elder-friendly screen — profile card (Sarah Miller / Child Account), My Parents (Mom, Dad), Preferences (Push Notifications ON, Daily Summary Email OFF, Reminder Sounds → "Chime"), App Info (Help & Support, Privacy Policy, Terms of Service), outlined Log Out button, footer "Version 2.4.1 / Made with love for our elders".

### Parent side (role: receives reminders)
- **Home** (`ParentDashboardScreen`): "Hi, Dad." greeting, TODAY header with date, "RIGHT NOW" hero reminder card (Afternoon Pills, "REMINDER FROM Sarah", "I took them" action), "COMING UP" list, floating call button, and an auto-opened `NotificationAcknowledgementModal` after 3s (full-screen: avatar halo, water media card, "Acknowledged" CTA, snooze 15 min).
- **Calendar** (`ParentCalendarScreen`): "VITALITY CARE" header with prev/next week arrows, 7-day `WeekStrip` (Monday start, selected day filled green), progress ring card, "Daily Care" list with per-status items, promo card.
- **Settings** (`ParentSetting`): dark-theme settings — user profile header (Martha Smith), Sound & Alerts switches (Play Sound, Vibrate), Snooze Duration chips (5/15/30), Text Size slider, Caregiver card (Sarah Smith, Daughter) with call button, Sign Out button (no-op), "Version 2.4.0".

---

## 5. Design System

### 5.1 The dark "green" theme (used by everything except Child Settings)
Single source: `src/shared/theme/colors.ts`, re-exported as default from `src/assets/Colors.tsx`.

Key tokens:
- `Colors.dashboard.bg` = `#071F19` (dark green, app background), `text` = white
- `Colors.dashboard.accent` = `#32D57B` (green, primary action color)
- `Colors.brand.primary` = `#55E08F` (auth accent), `Colors.auth.bg` = `#062B22`
- `Colors.alpha.whiteXX` / `blackXX` — huge set of alpha tokens used for surfaces (`surface: white04`, `surfaceStrong: white06`), text (`white35`…`white90`), borders (`white08`)
- Status colors: `warning` amber, `info` blue, `danger` pink, `purple`, each with `*SoftBg`, `*SoftBorder`, `*Text`, `*IconBg` variants

### 5.2 The light "Child Settings" theme (isolated, newer)
Because the Child Settings reference design is light/orange, its palette lives **locally** in `src/components/ChildSettings/colors.ts` (`childSettingsColors`):
- `background` `#F6F7F9`, `card` white, `border`/`divider` light grays
- `text` `#2E333B`, `textSecondary` `#8A9099`, `textMuted` `#A6ACB6`, `sectionTitle` `#6E7683`
- `accent` `#FF7A3D` (orange), pastel icon backgrounds: `accentSoft` `#FFF0E7`, `purpleSoft` `#F1EDFF`, `greenSoft` `#E9F8F0`
- Switch: `trackColor { false: switchTrackOff, true: accent }`, white thumb

Rule: **do not touch `src/shared/theme/colors.ts` for the light settings screen** — keep the light palette local unless the whole app moves light.

### 5.3 Styling conventions
- `StyleSheet.create` at the bottom of every file; no inline styles except tiny layout tweaks (`<View style={{ width: 42 }} />`)
- Cards: `borderRadius: 22–26`, `backgroundColor: Colors.dashboard.surface`, thin border `Colors.dashboard.border`
- Buttons/pills: `borderRadius: 999`; the shared `Button` component is brand-green with big text
- Typography: system font, weight `900`/`800` for headings/labels, `700`–`600` body, `11–13px` for kickers/labels with `letterSpacing` for uppercase kickers; NO custom font (SpaceMono is loaded for template only)
- Accessibility: every `Pressable` gets `accessibilityRole` and `accessibilityLabel`; states via `accessibilityState`
- Press feedback: `style={({ pressed }) => [styles.x, { opacity: pressed ? 0.9 : 1 }]}`
- Safe areas: `SafeAreaView` from `react-native-safe-area-context` at screen root; content in `ScrollView` with `contentContainerStyle` padding

---

## 6. Screens & Components Catalog

### Shared components (`src/components/`)
| Component | Purpose |
|---|---|
| `Button.tsx` | Primary pill CTA (green, arrow icon optional). Default label "Continue" |
| `Input.tsx` | Labeled pill text input with optional leading icon |
| `UserProfileHeader.tsx` | Centered avatar + name + subtitle; sizes sm/md/lg; green check badge |
| `UpcomingReminderCard.tsx` | Row card: icon circle, title/subtitle, right time |
| `RoleSelectionRadioCard.tsx` | Dark radio option card (icon bubble, radio indicator) |
| `NotificationAcknowledgementModal.tsx` | Full-screen push-ack modal (avatar halo, media card, Acknowledged + snooze) |
| `ExternalLink.tsx` (in `components/`, legacy) | Opens URLs in in-app browser via `expo-web-browser` |

### Dashboard components (`src/components/Dashboard/`)
- `ProfileGreeting` — avatar + status dot + "Welcome back, X" headline
- `SummaryCard` — percent + progress bar + streak chip
- `CareCard` — timeline row with `CareStatus` (`acknowledged | done | missed | sent | upcoming`) → colored pill + icon theme
- `QuickSendItem` — pill with icon + label
- `ReminderForCard` — selectable reminder-type chip (used in New Reminder grid)
- `ParentReminderCard` — hero image + action card for Parent Home
- `FloatingActionButton` — green circular FAB, positioned above the tab bar

### Parent Calendar components (`src/components/ParentCalendar/`)
- `ParentCalendarHeader`, `WeekStrip` (exports `WeekDay` type), `ProgressCard`, `DailyCareSection`/`DailyCareItem`, `CalendarPromoCard`

### Parent Settings components (`src/components/ParentSettings/`)
- `SoundAlertsSection` (Switch rows), `SnoozeDurationSection` (chips), `TextSizeSection` (custom slider), `CaregiverCard`

### Child Settings components (`src/components/ChildSettings/`)
- `colors.ts` — the local light palette (see 5.2)
- `ChildProfileCard` — avatar + orange pencil edit badge + name/label + Edit Profile button
- `MyParentsSection` — parent rows (avatar, name, "Last active: …", chevron) + "Add New Parent" (exports `ParentEntry` type)
- `PreferencesSection` — 3 rows: Push Notifications (orange Switch), Daily Summary Email (gray Switch), Reminder Sounds (value + chevron)
- `AppInfoSection` — Help & Support / Privacy Policy / Terms of Service rows

### Screens (`src/screens/`)
- `Child/ChildDashboardScreen.tsx`, `Child/ChildSettingsScreen.tsx`, `Child/CreateNewReminderModal.tsx`
- `Parent/ParentDashboardScreen.tsx`, `Parent/ParentCalendarScreen.tsx`, `Parent/ParentSetting.tsx`
- `Authentication/RoleSelectionScreen.tsx`, `SignupScreen.tsx`, `LoginScreen.tsx`, `InviteCodeLinkingScreen.tsx`

---

## 7. Data & State — what's mocked, where to hook real data

There is **no backend, no store, no persistence**. Everything is hardcoded per screen:

| Data | Current source | Integration point |
|---|---|---|
| Child user "Sarah Miller" | hardcoded in `ChildSettingsScreen` (`childProfile` const) and `ChildDashboardScreen` ("Sarah") | replace const with authenticated user |
| Child's parents (Mom/Dad, last active) | hardcoded `parents` array in `ChildSettingsScreen` | replace with parent data model |
| Parent user "Martha Smith" / "Dad" | hardcoded in `ParentSetting`, `ParentDashboardScreen` (`parentKind` const, marked `// TODO`) | replace with profile data |
| Reminder items | hardcoded arrays in dashboards/calendar | wire to reminder API |
| Settings toggles | `useState` in `ChildSettingsScreen` (`pushNotifications`, `dailySummaryEmail`) and `ParentSetting` (`playSound`, `vibrate`, `snooze`, `textSize`) | persist via AsyncStorage/expo-sqlite or API |
| Unimplemented actions | friendly `Alert.alert(...)` placeholders in `ChildSettingsScreen` (Edit Profile, Add New Parent, parent details, Reminder Sounds, Help/Privacy/Terms) | swap handler bodies |
| Auth / logout | none; Log Out = `router.replace('/')` | replace with real auth service |
| Error handling | `src/core/errors/AppError.ts` (`NETWORK`, `UNAUTHORIZED`, `SUPABASE`, …) scaffolded, unused | use when backend arrives |

Displayed versions: Child Settings footer "Version 2.4.1", Parent Settings "Version 2.4.0" (`app.json` `version` is still 1.0.0).

---

## 8. Code Conventions Checklist (for AI modifications)

1. **Icons**: Ionicons only (`import Ionicons from '@expo/vector-icons/Ionicons'`); type icon names as `React.ComponentProps<typeof Ionicons>['name']`.
2. **Colors**: import `Colors` from `@/src/assets/Colors` (or relative `../../assets/Images` style is also used). Never hardcode hex in dark screens; hardcoded hex only inside `src/shared/theme/colors.ts` or the local `ChildSettings/colors.ts`.
3. **Images**: `import Images from '@/src/assets/Images'` or relative.
4. **Types**: props typed with `type Props = {...}`; `strict` mode on — no `any` unless already present.
5. **Component style**: function components, `export default function`, local `styles = StyleSheet.create({...})`, sub-components in the same file when small.
6. **Layout**: `SafeAreaView` → `View flex:1` → custom header row → `ScrollView` with `contentContainerStyle`. Screen-level padding horizontal ≈ 18–24.
7. **Don't**: modify `src/shared/theme/colors.ts` casually, don't change tab layout styles, don't touch the other role's screens, don't add new dependencies without a strong reason.

---

## 9. How to Run & Validate

```bash
npm install
npx tsc --noEmit            # type check (no errors expected)
npx expo export --platform web   # bundles the whole route tree (validates routes/imports)
npx expo start --ios        # run on iOS simulator (needs Expo Go installed on simulator)
npx expo start              # QR/dev server for a device
```

- No lint, no jest runner configured; `npx tsc --noEmit` is the primary gate.
- The app runs with `newArchEnabled: true` (Fabric), `typedRoutes` enabled.

---

## 10. Current Gaps / Known Placeholders

- Child tabs **two (Plan)**, **three (Chat)**, **four (Profile)** are empty views
- `app/modal.tsx`, `components/` (Themed/StyledText/EditScreenInfo), `src/features`, `src/services`, `src/core/errors` are template/scaffold leftovers
- Reminder creation modal sends nothing (closes on "Send Reminder")
- Parent "Sign Out" is a no-op; notification modal, quick send, call FAB, "I took them" all have empty handlers
- No deep links beyond default expo-router behavior
