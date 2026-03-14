# NEETFORGE: Web → React Native Conversion

## Overview
Converting `forge-your-future/` (React web) to `forge-your-future-native/` (Expo SDK 55 + React Native 0.83). Goal: pixel-perfect parity with mobile-native patterns and offline caching.

## Tech Stack
| Layer | Web | Native |
|-------|-----|--------|
| Framework | React + Vite | Expo SDK 55 + expo-router |
| Styling | Tailwind CSS | NativeWind v4 + inline styles |
| Animations | Framer Motion | Moti + Reanimated 4 |
| Navigation | react-router-dom | expo-router (file-based) |
| Storage | localStorage | AsyncStorage + SecureStore (JWT) |
| Icons | lucide-react | lucide-react-native |
| Images | `<img>` | expo-image (disk cache) |
| Toasts | Sonner | react-native-toast-message |
| Markdown | react-markdown | react-native-markdown-display |
| Charts | Recharts | View-based bars (gifted-charts available) |
| Gradients | CSS | expo-linear-gradient |
| Bottom Sheet | — | @gorhom/bottom-sheet |

## Architecture

### Provider Stack (app/_layout.tsx)
```
Redux → PersistQueryClient → Theme → Auth → Language → Revision → Stack → Toast
```

### Auth Token Pattern
In-memory variable for synchronous axios interceptor access:
```ts
// src/lib/api.ts
let authToken: string | null = null;
export const setAuthToken = (t) => { authToken = t; };
// Interceptor reads authToken synchronously
// SecureStore persists across restarts, loaded on boot
```

### Key Adaptations
- `localStorage` → `AsyncStorage` (prefs/cache) + `SecureStore` (JWT)
- `window.dispatchEvent` → Custom `EventEmitter` (`src/lib/events.ts`)
- `useNavigate()` → `useRouter()` from expo-router
- CSS vars → Static hex values in `src/theme/colors.ts`
- `className` styles → Inline `style` objects using theme colors

## File Structure

```
forge-your-future-native/
├── app/                          # Expo Router routes
│   ├── _layout.tsx               # Root providers + font loading
│   ├── index.tsx                 # Splash screen
│   ├── login.tsx                 # Login
│   ├── signup.tsx                # Registration
│   └── (auth)/                   # Protected (auth guard in _layout)
│       ├── _layout.tsx           # Auth check → Redirect
│       ├── (tabs)/               # Bottom tab navigator
│       │   ├── _layout.tsx       # 5 tabs: Home, Tests, AI, Social, Profile
│       │   ├── index.tsx         # Dashboard
│       │   ├── tests/index.tsx   # Test series catalog
│       │   ├── ai-assistant.tsx  # AI chat
│       │   ├── social/index.tsx  # Chat list
│       │   └── profile.tsx       # Full profile + settings
│       ├── analytics.tsx         # Subject accuracy, trends, heatmap
│       ├── daily-challenge.tsx   # Daily DPP quiz
│       ├── leaderboard.tsx       # Daily/Weekly/All-Time ranks
│       ├── study-plan.tsx        # AI study planner
│       ├── onboarding.tsx        # 3-step onboarding
│       ├── quiz/{index,start,session,results,generator}.tsx
│       ├── revision/{index,dashboard,track}.tsx
│       ├── ncert/{search,reader}.tsx
│       ├── formula-cards/{index,[chapterId],viewer}.tsx
│       ├── learning-paths/{index,[pathId],create}.tsx
│       ├── doubts/{index,[id]}.tsx
│       ├── test/{custom-create,custom-session,session/[attemptId],report/[attemptId]}.tsx
│       ├── tests/{[seriesKey],[seriesKey]/[typeKey],pdf-viewer}.tsx
│       ├── curriculum/{browser,quiz-instructions}.tsx
│       ├── practice/{start,session/[challengeId]}.tsx
│       ├── pyq/{index,[topicId]}.tsx
│       ├── social/[chatId].tsx
│       ├── ai-quiz-session.tsx
│       ├── mock-analyzer.tsx
│       ├── my-challenges.tsx
│       └── add-friend.tsx
├── src/
│   ├── components/
│   │   ├── ui/                   # 21 pixel-perfect UI primitives
│   │   │   ├── Button.tsx        # Pressable + LinearGradient, 48px min, 12px radius
│   │   │   ├── GlassCard.tsx     # Card with shadow, border, 12px radius, 20px padding
│   │   │   ├── Input.tsx         # TextInput with focus ring
│   │   │   ├── Badge.tsx         # 5 variants: primary/secondary/success/warning/outline
│   │   │   ├── Progress.tsx      # 8px animated gradient bar
│   │   │   ├── Skeleton.tsx      # Moti pulse animation
│   │   │   ├── Tabs.tsx          # Pressable row + animated underline
│   │   │   ├── Avatar.tsx        # expo-image + initials fallback
│   │   │   ├── StatIcon.tsx      # 40x40, 12px radius, 10% opacity bg
│   │   │   ├── QuizOption.tsx    # 4 states: default/selected/correct/incorrect
│   │   │   ├── Modal.tsx         # Centered overlay
│   │   │   ├── BottomSheet.tsx   # @gorhom wrapper
│   │   │   ├── Select.tsx        # Modal + FlatList picker
│   │   │   ├── Switch.tsx, Checkbox.tsx, RadioGroup.tsx
│   │   │   ├── Accordion.tsx     # Reanimated height animation
│   │   │   ├── Card.tsx, Separator.tsx, GradientText.tsx, GlowOrb.tsx
│   │   │   └── (21 total)
│   │   ├── RevisionWidget.tsx    # NeuronZ due questions (Redux)
│   │   ├── DailyChallengeCard.tsx # Daily DPP card with API
│   │   ├── ActiveChallenges.tsx  # Active practice challenges
│   │   ├── ShieldCard.tsx        # 25-min study timer
│   │   ├── QuizPlayer.tsx        # Full quiz engine (MCQ/multi/numerical)
│   │   ├── QuestionRenderer.tsx  # Multi-type question renderer
│   │   ├── DashboardSkeleton.tsx # Loading state
│   │   └── ThemeToggle.tsx       # Dark/light toggle
│   ├── contexts/
│   │   ├── ThemeContext.tsx       # light/dark/system + AsyncStorage
│   │   ├── AuthContext.tsx        # SecureStore JWT + expo-router
│   │   ├── LanguageContext.tsx    # en/hi + AsyncStorage + 50+ keys
│   │   └── RevisionContext.tsx    # 7-level spaced repetition + AsyncStorage
│   ├── hooks/
│   │   └── useSocket.ts          # socket.io with in-memory token
│   ├── lib/
│   │   ├── api.ts                # Axios + in-memory token interceptor
│   │   ├── apiService.ts         # 654 lines, 15+ API modules (copied from web)
│   │   ├── storage.ts            # AsyncStorage wrapper
│   │   ├── events.ts             # Custom EventEmitter
│   │   ├── queryClient.ts        # React Query + AsyncStorage persister
│   │   ├── quizTracking.ts       # Quiz session persistence
│   │   └── utils.ts              # cn() helper
│   ├── store/                    # Redux (copied from web)
│   │   ├── index.ts
│   │   ├── hooks.ts
│   │   └── slices/neuronzSlice.ts
│   └── theme/
│       ├── colors.ts             # Light/dark hex tokens
│       ├── shadows.ts            # RN shadow objects
│       ├── gradients.ts          # Gradient color arrays
│       └── spacing.ts            # Spacing scale + border radii
```

## Design Tokens

### Colors (Light / Dark)
| Token | Light | Dark |
|-------|-------|------|
| background | `#f4f5f7` | `#0f1219` |
| foreground | `#171c28` | `#eef1f5` |
| card | `#ffffff` | `#181d27` |
| primary | `#0080ff` | `#1a8dff` |
| secondary | `#4a42d1` | `#5b53db` |
| success | `#1fad64` | `#1fad64` |
| warning | `#f5a623` | `#f5a623` |
| destructive | `#df2020` | `#df2020` |
| muted | `#ecedf0` | `#272d38` |
| border | `#e2e4e8` | `#2b3140` |

### Typography
- Body: Inter (400-900)
- Headings: Plus Jakarta Sans (500-800)
- Loaded via `expo-font` from `assets/fonts/`

### Radii
sm=8, md=12, lg=16, xl=20, 2xl=24, full=9999

## Caching Strategy
1. **React Query** → AsyncStorage persister (staleTime: 5min, gcTime: 30min)
2. **Images** → expo-image `cachePolicy="disk"`
3. **JWT** → SecureStore (encrypted keychain)
4. **Quiz sessions** → AsyncStorage on every answer
5. **Revision data** → AsyncStorage (fully offline)
6. **Network awareness** → @react-native-community/netinfo

## Files Copied Directly from Web
- `src/lib/apiService.ts` (654 lines, all API endpoints)
- `src/store/index.ts`, `hooks.ts`, `slices/neuronzSlice.ts`
- `src/lib/quizTracking.ts` (adapted localStorage → storage)

## Build & Run
```bash
npm install --legacy-peer-deps
npx expo start --android    # or --ios
```

## What's Done
- All 50 route screens created
- 21 UI primitives built
- 6 feature components (QuizPlayer, QuestionRenderer, RevisionWidget, DailyChallengeCard, ActiveChallenges, ShieldCard)
- Full auth flow (login/signup/demo/logout)
- 5-tab bottom navigation
- Dark/light theme with system detection
- English/Hindi language support
- Redux + React Query with offline persistence
- Socket.io chat integration
- Build compiles successfully (4,153+ modules)

## Remaining Gaps
- Charts components (`src/components/Charts/`) not yet built (react-native-gifted-charts installed)
- NTATestPlayer component (full NTA exam simulation)
- Some screens are functional stubs (basic UI, API calls, but not pixel-perfect)
- Razorpay payment → needs `react-native-razorpay` integration
- Speech recognition → needs `@react-native-voice/voice`
- PDF viewer → needs `react-native-pdf`
- Push notifications not implemented
- Deep linking configuration not finalized
