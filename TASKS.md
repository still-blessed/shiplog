## ROLE
You are a Senior Backend Engineer specializing in the "Motia" framework. We are building a hackathon project called "ShipLog" for MotiaHack '25.

## PROJECT GOAL
ShipLog is a "CI/CD for Personal Branding" tool. It allows developers to draft social media posts (in Markdown) or auto-generate them from GitHub commits, then schedule and publish them to Twitter/LinkedIn.
The core architecture is "Event-Driven." The Frontend pushes data, and Motia Workflows handle the processing asynchronously.

## YOUR TASK
We need to implement the core logic using Motia's "Steps" and "State" features. Focus on clean, strict TypeScript code.

## TECH STACK & CONSTRAINTS
- Framework: Motia (Node.js/TypeScript SDK).
- Data Storage: Use Motia's built-in `state` (Key-Value store) for simplicity and speed. Do not set up an external SQL DB yet.
- Architecture: 
  1. API Steps (receive HTTP requests).
  2. Event Steps (react to topics like `draft.created`).
  3. Scheduled Tasks (Cron jobs for posting).

## CRITICAL INSTRUCTIONS
- Use strict typing for request bodies and event payloads.
- Ensure `config` objects are exported correctly for Motia to register the steps.
- Use `logger.info()` generously so we can see the workflow in the terminal.

## CURRENT OBJECTIVES
Phase 1: Foundation & Data (The "Brain")
Goal: Can we save and retrieve data using Motia's State?

[x] Define Data Interfaces (types.ts)

Create TypeScript interfaces for your data so the whole app is type-safe.

Draft: { id, content, platform, status, scheduledFor, createdAt }

GithubPayload: Structure of the webhook coming from GitHub.

[x] Step: Create Draft (API)

File: src/drafts/create.step.ts

Type: api (POST /drafts)

Action: Receives JSON, creates a Draft object, saves to state.set('drafts', id, data), and emits draft.created.

[x] Step: List Drafts (API)

File: src/drafts/list.step.ts

Type: api (GET /drafts)

Action: Reads state.scan('drafts') and returns the array of drafts to the frontend.

[ ] Step: Delete/Update Draft (API)

File: src/drafts/update.step.ts

Type: api (PATCH/DELETE /drafts/:id)

Action: Allows you to edit a typo or delete a bad idea from the frontend.

Phase 2: The GitHub Automation (The "Cool Factor")
Goal: A git push automatically creates a social post draft.

[ ] Step: GitHub Webhook Receiver (API)

File: src/integrations/github-webhook.ts

Type: api (POST /webhooks/github)

Action:

Validates the request (security check).

Parses the commit message (e.g., "feat: added login page").

Constructs a draft object.

Crucial: Emits draft.created (reusing the event from Phase 1 so it triggers the AI refiner automatically).

Phase 3: AI Intelligence (The "Polish")
Goal: Raw inputs (like commit messages) get turned into engaging posts.

[ ] Integration Helper: OpenAI

File: src/lib/openai.ts

Action: Simple function to call GPT-4o-mini or GPT-3.5.

Prompt: "You are a tech influencer. Rewrite this raw git commit into a 280-character exciting update for Twitter: [Commit Message]"

[ ] Step: AI Refiner (Event)

File: src/processors/refine-content.ts

Type: event (Subscribes to draft.created)

Logic:

Check if draft.source === 'github'.

If yes, pass content to lib/openai.ts.

Update the draft in state with the new "suggested" content.

Emit draft.refined.

Phase 4: The Scheduler (The "Set & Forget")
Goal: Posts go out automatically at specific times.

[ ] Step: Schedule Post (API)

File: src/schedule/set-time.step.ts

Type: api (POST /schedule)

Action: Updates a draft's status to scheduled and sets scheduledFor timestamp in the State.

[ ] Step: The Clock (Cron Job)

File: src/schedule/cron-ticker.step.ts

Type: cron (Every 10 minutes)

Action:

Scans all drafts where status === 'scheduled'.

Checks if scheduledFor <= new Date().

If match found: Emits post.due for that specific ID.

Phase 5: The Publisher (The Output)
Goal: Actually sending data to Twitter/LinkedIn.

[ ] Integration Helper: LinkedIn/Twitter

File: lib/social-api.ts

Action: Functions to post to the respective APIs.

Hackathon Tip: If OAuth is too hard, use a library like twitter-api-v2 with developer keys, or mock this step if API approval takes too long (Judges usually accept "mocked" final API calls if the logic leading up to it is real).

[ ] Step: Publish Post (Event)

File: src/publishers/publish.ts

Type: event (Subscribes to post.due)

Action:

Retrieves the draft.

Calls lib/social-api.ts.

On success: Updates status to published.

On fail: Updates status to failed (so you can retry).