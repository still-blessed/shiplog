import type { EventConfig, Handlers } from "motia";
import { GeminiClient } from "../lib/gemini";
import { GithubPRMergedPayload, Draft, WeeklyQueueItem, AnalyzedEvent } from "../types";
import { randomUUID } from "node:crypto";

export const config: EventConfig = {
    name: 'AnalyzePR',
    type: 'event',
    subscribes: ['github.pr_merged'],
    emits: ['draft.created', 'item.queued'],
    description: 'Analyzes merged PRs to decide if they should be posted or queued',
    flows: ['github-flow'],
}

export const handler: Handlers['AnalyzePR'] = async (input, { logger, emit, state }) => {
    const payload = input as GithubPRMergedPayload;

    logger.info("payload received", payload)

    logger.info("Analyzing PR for content potential", { title: payload.title });

    // Initialize AI Client
    const ai = new GeminiClient(logger);

    // Analyze PR
    const analysis = await ai.analyzePR(payload.title, payload.body, payload.comments, payload.files);
    logger.info("AI Analysis Complete", { analysis });

    // Store Analyzed Event
    const eventId = randomUUID();
    const analyzedEvent: AnalyzedEvent = {
        id: eventId,
        title: payload.title,
        type: 'pr',
        hypeScore: analysis.hypeScore,
        analysis,
        createdAt: new Date().toISOString(),
        sourceUrl: payload.url
    };
    await state.set('recent_events', eventId, analyzedEvent);

    // Decision Logic
    if (analysis.hypeScore >= 7) {
        // High Score -> Create Draft immediately
        const draftId = randomUUID();
        
        let content = `🚀 ${analysis.category}: ${payload.title}\n\n`;
        if (analysis.summary) {
            content += `${analysis.summary}\n\n`;
        } else {
            content += `${payload.body || ''}\n\n`;
        }
        
        if (analysis.codeSnippets && analysis.codeSnippets.length > 0) {
            content += `Check out this code:\n\`\`\`\n${analysis.codeSnippets[0]}\n\`\`\`\n\n`;
        }
        
        content += `Check it out: ${payload.url}`;

        const newDraft: Draft = {
            id: draftId,
            content,
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
            title: payload.title,
            contributor: payload.contributor,
            date: new Date().toISOString(),
            type: 'pr'
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
