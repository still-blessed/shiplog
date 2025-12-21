import type { CronConfig, Handlers } from "motia";
import { WeeklyQueueItem, Draft } from "../types";
import { GeminiClient } from "../lib/gemini";
import { randomUUID } from "node:crypto";

export const config: CronConfig = {
    name: 'GenerateWeeklyDigest',
    type: 'cron',
    cron: '0 12 * * 5', // Every Friday at 12:00 PM
    description: 'Generates a weekly digest of minor updates',
    emits: ['draft.created'],
    flows: ['draft-flow'],
};

export const handler: Handlers['GenerateWeeklyDigest'] = async (event, { state, logger, emit }) => {
    logger.info('Weekly Digest Generator started.');

    // 1. Get queued items
    // Assuming 'weekly_queue' is where we stored them in analyze-pr.step.ts
    // Note: In analyze-pr.step.ts, we did `state.set('weekly_queue', itemId, queueItem)`
    // So we can use `state.getGroup` to get all of them.
    const queueMap = await state.getGroup<WeeklyQueueItem>('weekly_queue');
    const queueItems = Object.values(queueMap);

    if (queueItems.length === 0) {
        logger.info('No items in weekly queue. Skipping digest.');
        return { status: 200, body: { processed: 0 } };
    }

    logger.info(`Found ${queueItems.length} items for the digest.`);

    // 2. Generate Summary with AI
    const ai = new GeminiClient(logger);

    // Format items for the prompt
    const itemsText = queueItems.map(item => `- ${item.prTitle} (by @${item.contributor})`).join('\n');

    // We'll reuse the `generatePost` method or allow a raw prompt. 
    // Since `GeminiClient` is currently tailored for specific tasks, let's use `generatePost` 
    // but frame the input as the "content" to be rewritten.

    const context = `
    Here is a list of minor updates from this week:
    ${itemsText}
    
    Write a "Weekly Progress" social media post summarizing these changes. 
    Highlight that the community is active. Mention the contributors.
    `;

    const digestContent = await ai.generatePost(context, 'twitter');

    // 3. Create Draft
    const draftId = randomUUID();
    const newDraft: Draft = {
        id: draftId,
        content: digestContent,
        platform: 'twitter',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        suggestedContent: digestContent // It's already AI generated
    };

    await state.set<Draft>('drafts', draftId, newDraft);

    // 4. Clear/Archive Queue
    // We can delete them from the 'weekly_queue' group
    for (const item of queueItems) {
        await state.delete('weekly_queue', item.id);
    }

    logger.info('Weekly digest draft created and queue cleared.', { draftId });

    await emit({
        topic: 'draft.created',
        data: newDraft
    });

    return {
        status: 200,
        body: {
            success: true,
            draftId
        }
    };
};
