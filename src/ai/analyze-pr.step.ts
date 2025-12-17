import type { EventConfig, Handlers } from "motia";
import { GeminiClient } from "../lib/gemini";
import { GithubPRMergedPayload, Draft, WeeklyQueueItem } from "../types";
import { randomUUID } from "node:crypto";

export const config: EventConfig = {
    name: 'AnalyzePR',
    type: 'event',
    subscribes: ['github.pr_merged'],
    emits: ['draft.created', 'item.queued'],
    description: 'Analyzes merged PRs to decide if they should be posted or queued',
    flows: ['github-flow'],
}

export const handler: Handlers['AnalyzePR'] = async (event, { logger, emit, state }) => {
    const payload = event.data as GithubPRMergedPayload;

    logger.info("Analyzing PR for content potential", { title: payload.title });

    // Initialize AI Client
    const ai = new GeminiClient(logger);

    // Analyze PR
    const analysis = await ai.analyzePR(payload.title, payload.body);
    logger.info("AI Analysis Complete", { analysis });

    // Decision Logic
    if (analysis.hypeScore >= 7) {
        // High Score -> Create Draft immediately
        const draftId = randomUUID();
        const newDraft: Draft = {
            id: draftId,
            content: `🚀 New Feature: ${payload.title}\n\n${payload.body || ''}\n\nCheck it out: ${payload.url}`,
            platform: 'twitter', // Default
            status: 'draft',
            sourceUrl: payload.url,
            contributorHandle: payload.contributor,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await state.set('drafts', draftId, newDraft);

        logger.info("High hype score! Draft created.", { draftId });

        await emit({
            topic: 'draft.created',
            data: newDraft
        });

    } else {
        // Low Score -> Add to Weekly Queue
        const itemId = randomUUID();
        const queueItem: WeeklyQueueItem = {
            id: itemId,
            prTitle: payload.title,
            contributor: payload.contributor,
            date: new Date().toISOString(),
        };

        // We'll store queue items in a list or collection
        // 'weekly_queue' can be a list ID, but Motia K/V usually stores items individually
        // To scan them later, we might want to prefix the key or use a different 'bucket' concept if available.
        // Assuming 'weekly_queue' usage similar to drafts.
        await state.set('weekly_queue', itemId, queueItem);

        logger.info("Hype score low. Added to weekly queue.", { itemId });

        // Optional: Emit event for observability
        await emit({
            topic: 'item.queued', // We didn't define this in types but it's useful
            data: queueItem
        });
    }

    return {
        status: 200,
        body: {
            success: true,
            analysis
        }
    };
};
