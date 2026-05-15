# TickFeed Prototype Context

## Overview
TickFeed is a **prototype PWA-style mobile finance app** generated from **v0** and built with **Next.js 16 + React 19 + Tailwind CSS 4**. The app is currently a **frontend-only clickable prototype** with hardcoded/mock data, local component state, and no real backend, auth, API integration, or persistence.

The product concept is an **AI-powered finance news and stock tracking app** focused on Indian markets. It combines:
- personalized finance news
- watchlist and stock tracking
- stock detail views
- AI summaries / AI chat simulation
- community discussions
- a profile/settings area

## Prototype Nature
Evidence this is a v0-generated prototype:
- `app/layout.tsx` sets `generator: 'v0.app'`
- UI is highly component-driven with mock data embedded directly in screens
- app navigation is implemented with local React state rather than route-based navigation
- AI features are simulated with canned responses
- no real API clients, server actions, database, or auth flow are present

## Tech Stack
- **Framework:** Next.js 16 (`package.json`)
- **UI:** React 19, Tailwind CSS 4, shadcn/ui, Radix UI
- **Icons:** lucide-react
- **Charts:** lightweight inline SVG + sparklines, recharts installed but not central in current app flow
- **PWA-related packages:** `next-pwa` is installed but not actively configured
- **Mobile wrapper:** Capacitor dependencies exist and `capacitor.config.ts` is present
- **Analytics:** Vercel Analytics enabled only in production

## Current App Structure
### Entry point
The main app lives in `app/page.tsx`.

Instead of using multiple Next.js routes, the app behaves like a single-screen mobile shell and switches screens with React state:
- `home`
- `watchlist`
- `stock-detail`
- `add-stock`
- `community`
- `profile`
- `article-detail`

### Main layout
`app/layout.tsx` provides:
- mobile-oriented viewport settings
- PWA-ish metadata
- Apple web app metadata
- icon declarations
- forced dark root class by default
- manifest link tag

### Theme and styling
`app/globals.css` defines:
- finance-themed design tokens
- dark/light palettes
- gain/loss semantic colors
- mobile safe-area helpers
- scrollbar hiding helpers
- viewport height/mobile layout treatment
- sparkline animation

## Core Screens
### 1. Home
File: `components/tickfeed/screens/home-screen.tsx`

Features:
- top header with search and notifications icons
- tabs: `For You`, `My Stocks`, `All News`
- market digest hero card
- market ticker strip
- list of news cards
- mock finance news focused on RBI, HDFC Bank, TCS, Reliance, Infosys, etc.

Data is fully local and static.

### 2. Watchlist
File: `components/tickfeed/screens/watchlist-screen.tsx`

Features:
- stock watchlist view
- local search/filter by symbol or company name
- summary cards for gainers/losers
- stock cards with sparkline, price, change, and update counts
- CTA to add a stock

### 3. Add Stock
File: `components/tickfeed/screens/add-stock-screen.tsx`

Features:
- search through a static list of stocks
- trending stocks section
- sector chips
- add-to-watchlist flow
- prevents duplicate additions using current watchlist + local recent state

Still mock-only; no exchange/search API exists.

### 4. Stock Detail
File: `components/tickfeed/screens/stock-detail-screen.tsx`

Features:
- mock stock detail page per symbol
- price + daily movement
- SVG line chart with selectable time range chips
- key statistics grid
- related news cards
- AI insights card
- community discussions entry point
- remove-from-watchlist confirmation flow

All stock data is embedded in the file.

### 5. Article Detail
File: `components/tickfeed/screens/article-detail-screen.tsx`

Features:
- article header with metadata and tags
- tabbed content:
  - `AI Summary`
  - `Ask AI`
  - `Discuss`
- canned AI explainers and stock impact summaries
- simulated AI chat with keyword-based response selection
- discussion thread with likes and posting
- bookmark toggle

This is a strong prototype screen for the core “AI-powered finance news” positioning.

### 6. Community
File: `components/tickfeed/screens/community-screen.tsx`

Features:
- community feed of investor discussions
- trending topics
- likes/comments/shares UI
- simple post composer
- tabs for `Trending`, `Following`, `My Posts`

Interactions are local-only.

### 7. Profile
File: `components/tickfeed/screens/profile-screen.tsx`

Features:
- static user profile card
- watchlist preview
- reading/saved/stocks stats
- dark/light mode toggle
- settings/help/logout style menu items

Dark mode is toggled by adding/removing the `dark` class on `document.documentElement`.

## Reusable TickFeed Components
Located in `components/tickfeed/`:
- `bottom-nav.tsx` — bottom mobile navigation
- `market-digest.tsx` — hero digest card with inline chart
- `market-ticker.tsx` — market summary strip
- `news-card.tsx` — news item card with source, tags, summary indicator, comments, image
- `stock-card.tsx` — watchlist stock item
- `sparkline.tsx` — mini inline chart

## Navigation Model
The prototype uses a **single-page state machine** in `app/page.tsx` instead of URL-driven navigation.

Important behavior:
- screen changes are handled with `useState`
- previous screen is tracked manually for back navigation
- selected article and selected stock are held in state
- bottom nav is hidden on detail/add screens

This is suitable for a prototype/demo, but not yet for a production app architecture.

## Data Model Observations
Current data is mocked inline in components.

### News article shape
Defined in `app/page.tsx`:
- `id`
- `source`
- `timestamp`
- `headline`
- `tags`
- `aiSummaryAvailable`
- `commentsCount`
- `imageUrl`
- optional `content`

### Stock shape
Used across screens:
- `symbol`
- `name`
- `price`
- `change`
- `isPositive`
- `updatesCount`
- `chartData`
- `logoColor`
- `logo`

## PWA / Mobile Readiness Status
The app is **mobile-first** and has some PWA/mobile indicators, but it is not fully wired as a production PWA yet.

### Present
- viewport optimized for mobile
- app-like full-height layout using `100dvh`
- safe-area padding helper
- manifest link included in layout
- Apple web app metadata present
- app icons exist in `public/`
- Capacitor config exists

### Missing / incomplete
- no `public/manifest.json` found
- `next-pwa` is installed but not configured in `next.config.mjs`
- no visible service worker setup
- `capacitor.config.ts` points `webDir` to `public`, which is unusual for a Next.js app build output
- no offline caching behavior implemented

So the app is best described as a **PWA-intended mobile prototype**, not a completed production PWA.

## Project Configuration Notes
### `next.config.mjs`
Current config shows:
- `typescript.ignoreBuildErrors = true`
- `images.unoptimized = true`
- comment indicates PWA/webpack config was removed for now

This reinforces that the project is still in prototype mode.

### `capacitor.config.ts`
Current values:
- `appId: com.tickfeed.app`
- `appName: tickfeed`
- `webDir: public`

Capacitor presence suggests intent to package as a mobile app shell later.

### `components.json`
Configured for shadcn/ui with:
- style: `new-york`
- CSS file: `app/globals.css`
- alias paths for components/lib/hooks

## UX / Product Intent
The prototype is trying to validate a product idea around:
- concise finance news consumption
- AI-assisted explanation of market events
- personalized stock watchlist monitoring
- lightweight social/community interaction
- premium dark mobile UI

The strongest value proposition in the current prototype is:
**“finance news + stock watchlist + AI explanation + community discussion in one mobile app experience.”**

## Current Limitations
This repo is still a prototype and currently lacks:
- real authentication
- real user accounts
- backend/database
- live stock market data
- live news ingestion
- actual AI backend integration
- persistent bookmarks, comments, or watchlists
- proper route structure
- production-grade PWA setup
- tests
- strict production build hygiene

## Likely Next Step Categories
If this prototype is taken forward, the next layers would likely be:
1. **Real navigation and app structure**
2. **Backend/data integration**
3. **Live market/news feeds**
4. **Actual AI summarization/chat APIs**
5. **Auth and user persistence**
6. **True PWA/mobile packaging work**

## Important Files
- `app/page.tsx` — app shell, mock navigation, state orchestration
- `app/layout.tsx` — metadata, viewport, PWA-ish setup
- `app/globals.css` — theme tokens and mobile styling behavior
- `components/tickfeed/screens/home-screen.tsx` — home/news feed
- `components/tickfeed/screens/watchlist-screen.tsx` — watchlist
- `components/tickfeed/screens/add-stock-screen.tsx` — stock search/add flow
- `components/tickfeed/screens/stock-detail-screen.tsx` — stock detail prototype
- `components/tickfeed/screens/article-detail-screen.tsx` — AI/article/discussion experience
- `components/tickfeed/screens/community-screen.tsx` — community feed
- `components/tickfeed/screens/profile-screen.tsx` — profile/settings
- `next.config.mjs` — prototype-level Next config
- `capacitor.config.ts` — mobile shell intent

## Bottom Line
This repository is a **good-looking v0-generated mobile finance app prototype** for TickFeed. It demonstrates product direction and user flows well, especially for:
- AI news summarization
- stock watchlists
- finance discussions
- mobile-first UX

But technically it is still a **mock-data prototype** rather than a fully functional PWA/mobile production app.
