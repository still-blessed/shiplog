import type { EventConfig, Handlers } from "motia";
import { Draft } from "../types";
import { GeminiClient } from "../lib/gemini";

export const config: EventConfig = {
    name: 'ProcessDrafts',
    type: 'event',
    subscribes: ['draft.created'],
    emits: ['draft.refined'],
    description: 'Refines draft content using AI',
    flows: ['draft-flow'],
}

export const handler: Handlers['ProcessDrafts'] = async (input: any, { logger, state, emit }) => {
    const draft = input as Draft;

    // Only process if it doesn't already have suggested content (avoid loops)
    // if (draft.suggestedContent !== null) {
    //     return { status: 200, body: { skipped: true } };
    // }

    logger.info("Refining draft content...", { draftId: draft.id });

    const ai = new GeminiClient(logger);

    // Generate better content
    const refinedContent = await ai.generatePost(draft.content, draft.platform);

    if (refinedContent === draft.content) {
        logger.info("Content unchanged by AI", { draftId: draft.id });
        return { status: 200, body: { refined: false } };
    }

    // Update Draft
    const updatedDraft: Draft = {
        ...draft,
        suggestedContent: refinedContent,
        updatedAt: new Date().toISOString()
    };

    await state.set('drafts', draft.id, updatedDraft);

    logger.info("Draft refined with AI suggestions", { draftId: draft.id });

    await emit({
        topic: 'draft.refined',
        data: updatedDraft
    });

    return {
        status: 200,
        body: {
            success: true,
            draft: updatedDraft
        }
    };
};