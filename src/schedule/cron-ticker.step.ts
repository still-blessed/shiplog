import type { CronConfig, Handlers } from "motia";
import { Draft } from "../types";

export const config: CronConfig = {
    name: 'CronTicker',
    type: 'cron',
    cron: '*/10 * * * *', // Every 10 minutes
    description: 'Checks for scheduled posts that are due',
    emits: ['post.due'],
    flows: ['draft-flow'],
};

export const handler: Handlers['CronTicker'] = async (event, { state, logger, emit }) => {
    logger.info('Cron ticker started: Checking for due posts...');

    // Get all drafts
    const drafts = await state.getGroup<Draft>('drafts');
    const now = new Date();

    // Filter for scheduled posts that are past their due time
    const duePosts = Object.values(drafts).filter(draft => {
        return draft.status === 'scheduled' &&
            draft.scheduledFor &&
            new Date(draft.scheduledFor) <= now;
    });

    logger.info(`Found ${duePosts.length} due posts.`);

    for (const post of duePosts) {
        logger.info(`Emitting post.due for draft ${post.id}`, { title: post.content.substring(0, 20) });

        // Optimistically update status to 'processing' to avoid double-sends 
        // if the next cron hits before publishing is done (though Motia handles this well usually)
        // For MVP, we'll keep it simple and just emit. The publisher should update the status.

        await emit({
            topic: 'post.due',
            data: post
        });
    }

    return {
        status: 200,
        body: {
            success: true,
            processed: duePosts.length
        }
    };
};
