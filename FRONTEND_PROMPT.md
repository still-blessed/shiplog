# Frontend AI Agent Prompt: Shiplog Dashboard

## Project Overview
**Shiplog** is an automated changelog and social media management tool tailored for open-source developers and projects. It monitors GitHub activities such as Pull Requests (PRs), Issues, Releases, and Milestones via webhooks. Using AI (powered by tools like Gemini), it analyzes these events to generate engaging social media drafts. Users can then review, edit, schedule, or publish these drafts to platforms like X (formerly Twitter), LinkedIn, and Discord. The goal is to build hype, attract contributors, impressions, and sponsors by making project updates effortless and viral-worthy.

Key Benefits:
- Automates content creation from technical events into hype-driven posts.
- Supports multi-platform posting with platform-specific optimizations (e.g., character limits, tone).
- Focuses on user control: AI suggests, humans refine.

## Tech Stack Requirements
- **Framework**: Next.js (latest stable version, App Router for server components and routing).
- **UI Library**: shadcn/ui (built on Radix UI and Tailwind CSS for accessible, customizable components).
- **Styling**: Tailwind CSS with dark mode support (using `next-themes`).
- **State Management & Data Fetching**: TanStack Query (React Query) for caching, optimistic updates, and invalidation. Use SWR as a lightweight alternative if query complexity is low.
- **Icons**: Lucide React for consistent, scalable icons.
- **Forms & Validation**: React Hook Form for form state management, integrated with Zod for schema validation.
- **Date Handling**: date-fns or Day.js for formatting and timezones in schedulers.
- **Additional**: Clerk or NextAuth for authentication (if user accounts are needed); Toast notifications via sonner for feedback.

Ensure all dependencies are up-to-date as of December 2025, and prioritize performance with server-side rendering where possible.

## Design Philosophy
- **Modern & Clean**: Adopt a minimalist, developer-centric aesthetic inspired by tools like Vercel, Linear, or GitHub's UI. Use a neutral color palette (grays, blues) with accents for actions (e.g., green for publish, yellow for schedule). Prioritize readability with ample whitespace, sans-serif fonts (e.g., Inter or System UI).
- **Smooth Interactions**: Implement optimistic UI for real-time feel—e.g., instantly reflect draft saves or status changes before API confirmation, with rollback on errors. Use Framer Motion for subtle animations (e.g., card transitions in Kanban).
- **Responsive & Accessible**: Fully responsive across devices (mobile-first breakpoints). Ensure WCAG compliance: keyboard navigation, screen reader support (ARIA labels via Radix), high contrast modes.
- **User-Centric**: Focus on quick workflows—e.g., one-click previews, AI suggestions for refinements. Avoid clutter; use modals for editors to keep context.
- **Theming**: Support light/dark modes, with auto-detection based on system preferences.

## Core Features & Pages

### 1. Authentication & Onboarding (If Applicable)
- **Goal**: Secure access and quick setup.
- **Components**: Simple login/signup with GitHub OAuth. Onboarding wizard: Connect GitHub repo, generate webhook URL, select platforms.
- **Note**: If backend handles auth, integrate via API.

### 2. Dashboard (Home Page: `/dashboard`)
- **Goal**: Provide a high-level overview of content pipeline and project activity.
- **Layout**: Sidebar navigation (collapsible on mobile) with links to Dashboard, Integrations, Settings.
- **Components**:
  - **Stats Cards**: Interactive cards showing counts for Drafts, Scheduled, Published, and Analyzed Events (e.g., "5 New PRs Analyzed"). Use Lucide icons for visuals.
  - **Content Pipeline View**: Kanban board (using react-beautiful-dnd or shadcn's drag-and-drop) with columns for `Draft`, `Scheduled`, `Published`. Each card shows preview: truncated content, platform icon, status badge, source (e.g., "From PR #42").
    - Drag-to-reorder or change status (e.g., drag to Scheduled auto-opens date picker).
  - **Recent Events Feed**: Scrollable list of recent GitHub events (PRs, Issues) with AI hype scores—click to generate draft.
  - **Quick Actions**: Floating action button (FAB) for "Generate New Draft" (manual or from event). Search bar for filtering drafts by platform/status.
- **Interactivity**: Real-time polling (every 30s) or WebSocket for new drafts from webhooks.

### 3. Draft Editor (Modal or Dedicated Page: `/draft/[id]`)
- **Goal**: Intuitive editing and previewing of AI-generated or manual drafts.
- **Layout**: Full-screen modal on desktop for focus; full page on mobile.
- **Inputs**:
  - **Content Editor**: Rich text area with Markdown support (using react-markdown or Editor.js). Live preview pane showing platform-specific rendering (e.g., Twitter character count, LinkedIn formatting).
  - **Platform Selector**: Tabs or dropdown to switch platforms—auto-adjust content (e.g., shorten for Twitter, expand for LinkedIn).
  - **AI Refinements**: Button to "Regenerate with AI" (prompt Gemini for variations, e.g., "Make it more hype" or "Add emojis").
  - **Metadata**: Contributor handle (auto-filled from GitHub), source URL (link to PR/Issue).
  - **Scheduling**: Date/time picker (using shadcn's calendar component) with timezone support. Validation: Prevent past dates.
- **Actions**: 
  - "Preview" (simulate post on platform).
  - "Save as Draft", "Schedule", "Publish Now" (with confirmation dialog).
  - "Delete" (with undo via toast).
- **Validation**: Use Zod to enforce character limits per platform (e.g., 280 for Twitter).

### 4. Integrations Page (`/integrations`)
- **Goal**: Manage connections and monitor activity.
- **Components**:
  - **GitHub Section**: Display webhook status (active/inactive), generated URL (`{API_BASE_URL}/webhooks/github`), and setup instructions (copy-paste button).
  - **Platform Connections**: OAuth buttons for Twitter, LinkedIn, Discord (store tokens securely via backend).
  - **Event Log**: Table of recent GitHub events with AI analysis (hype score, category)—click to create draft.
- **Error Handling**: Show alerts for disconnected services, with retry buttons.

### 5. Settings Page (`/settings`)
- **Goal**: Customize preferences.
- **Features**: Theme toggle, notification settings (e.g., email on new drafts), API keys for custom AI models.

## API Integration Guide

**Base URL**: Configurable via `.env` (e.g., `NEXT_PUBLIC_API_URL=http://localhost:3000/api`).

### Data Models
Extend the Draft interface for robustness:
```typescript
type DraftStatus = 'draft' | 'scheduled' | 'published' | 'archived';
type Platform = 'twitter' | 'linkedin' | 'discord';

interface Draft {
  id: string;
  content: string;
  platform: Platform;
  status: DraftStatus;
  contributorHandle?: string;
  sourceUrl?: string; // e.g., GitHub PR link
  hypeScore?: number; // From AI analysis (1-10)
  scheduledFor?: string; // ISO Date
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Endpoints (Add Authentication Headers if Needed)
- **List Drafts**: `GET /api/drafts` → `{ success: true, drafts: Draft[] }`
- **Get Draft**: `GET /api/drafts/:id` → `{ success: true, draft: Draft }`
- **Create Draft**: `POST /api/drafts` → Body: `{ content, platform, sourceUrl? }` → `{ success: true, draft: Draft }`
- **Update Draft**: `PATCH /api/drafts/:id` → Body: Partial<Draft> → `{ success: true, draft: Draft }`
- **Delete Draft**: `DELETE /api/drafts/:id` → `{ success: true }`
- **Schedule Post**: `POST /api/schedule` → Body: `{ draftId, scheduledFor }` → `{ success: true }`
- **Publish Post**: `POST /api/publish` → Body: `{ draftId }` → `{ success: true, publishedUrl? }`
- **Health Check**: `GET /api/health`
- **New: Get Events**: `GET /api/events` → Recent GitHub events with AI results.

Handle errors uniformly: `{ success: false, error: string }`. Use TanStack Query's error boundaries.

## Implementation Steps for the Agent

1. **Project Setup**: Run `npx create-next-app@latest` with TypeScript. Install shadcn/ui (`npx shadcn-ui@latest init`), Tailwind, React Query, React Hook Form, Zod, Lucide, etc.
2. **API Client**: Create `/lib/api.ts` with typed fetch wrappers (using `ofetch` or Axios). Include error handling and auth tokens.
3. **Custom Hooks**: In `/hooks/`:
   - `useDrafts()`: Query for list, with polling option.
   - `useDraft(id)`: Single fetch.
   - Mutations: `useCreateDraft()`, `useUpdateDraft()`, `useDeleteDraft()` with optimistic updates and invalidation (e.g., `queryClient.invalidateQueries({ queryKey: ['drafts'] })`).
4. **Components Library**: In `/components/`:
   - `DraftCard`: Card with content preview, badges (status, platform), actions (edit, delete).
   - `DraftEditor`: Form with React Hook Form, Zod resolver. Include AI regenerate button (POST to backend AI endpoint).
   - `KanbanBoard`: Columns for statuses, draggable cards.
   - `PlatformIcon`: Map platform to Lucide icons (e.g., Bird for Twitter).
   - `ToastProvider`: For success/error messages.
5. **Pages & Routing**: Use App Router (`/app/`).
   - `/app/dashboard`: Stats + Kanban.
   - `/app/drafts/[id]`: Editor page (or modal via dynamic import).
   - Error pages: Custom 404, loading states.
6. **Syncing & Optimism**: Use React Query for auto-refetch on focus. For real-time, implement WebSocket in `/lib/ws.ts` listening to backend events (e.g., via Socket.io).
7. **Testing & Polish**: Add unit tests for hooks (React Testing Library). Ensure mobile responsiveness with Tailwind breakpoints. Optimize images/icons for performance.

## Future Considerations (Notes for UI)
- **Weekly Digest**: Add a tab in Dashboard for low-hype items queued for digests. Future API: `GET /api/digest` to fetch/approve.
- **Analytics**: Integrate post performance (e.g., views/likes from platforms) via backend callbacks.
- **AI Enhancements**: In-editor AI suggestions for emojis, hashtags, or A/B variants.
- **Multi-Repo Support**: Allow managing multiple GitHub repos.
- **Security**: Validate all inputs, handle API rate limits, use HTTPS.
- **Scalability**: Lazy-load components, use Infinite Scroll for long lists.
- **Accessibility Audit**: Run Lighthouse after implementation.