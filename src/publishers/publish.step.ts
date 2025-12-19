import type { EventConfig, Handlers } from "motia";
import { Draft } from "../types";
import { SocialAPI } from "../lib/social-api";

export const config: EventConfig = {
    name: 'PublishPost',
    type: 'event', // Subscribes to events
    subscribes: ['post.due'],
    emits: ['post.published', 'post.failed'],
    description: 'Publishes a due post to the configured platform',
    flows: ['draft-flow'],
};

export const handler: Handlers['PublishPost'] = async (event, { state, logger, emit }) => {
    const draft = event.data as Draft;
    logger.info(`Starting publish flow for draft ${draft.id}`, { platform: draft.platform });

    const social = new SocialAPI(logger);

    try {
        let externalId = '';

        switch (draft.platform) {
            case 'twitter':
                externalId = await social.postToTwitter(draft.content);
                break;
            case 'linkedin':
                externalId = await social.postToLinkedIn(draft.content);
                break;
            case 'discord':
                externalId = await social.postToDiscord(draft.content);
                break;
            default:
                logger.warn(`Unknown platform: ${draft.platform}. Defaulting to Twitter logic.`);
                externalId = await social.postToTwitter(draft.content);
        }

        // Update Draft Status to Published
        const publishedDraft: Draft = {
            ...draft,
            status: 'published',
            publishedAt: new Date().toISOString(),
        };

        await state.set<Draft>('drafts', draft.id, publishedDraft);

        logger.info(`Draft ${draft.id} published successfully!`, { externalId });

        await emit({
            topic: 'post.published',
            data: publishedDraft
        });

    } catch (error) {
        logger.error(`Failed to publish draft ${draft.id}`, { error });

        await emit({
            topic: 'post.failed',
            data: { draftId: draft.id, reason: error instanceof Error ? error.message : 'Unknown error' }
        });
    }

    return {
        status: 200,
        body: {
            success: true,
            draftId: draft.id
        }
    };
};
