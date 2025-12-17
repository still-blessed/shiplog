import type { ApiRouteConfig, Handlers } from "motia";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Draft } from "../types";

export const config: ApiRouteConfig = {
    name: 'CreateDraft',
    type: 'api',
    path: '/draft/create',
    method: 'POST',
    description: 'Creates a new draft',
    emits: ['draft.created'],
    flows: ['draft-flow'],
    bodySchema: z.object({
        content: z.string().min(1, "Content is required"),
        platform: z.enum(['twitter', 'linkedin', 'discord']).default('twitter'),
    }),
}

// Handler to recieve the request and emit the event
export const handler: Handlers['CreateDraft'] = async (req, { emit, state, logger }) => {
    // we expect the content and the platfrm the draft is for
    const { content, platform } = req.body;
    const draftId = randomUUID();

    //create a new draft
    const newDraft: Draft = {
        id: draftId,
        content,
        platform,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    await state.set('drafts', draftId, newDraft);

    logger.info('Draft created successfully', { draftId });

    emit({
        topic: 'draft.created',
        data: newDraft
    });

    return {
        status: 200,
        body: {
            success: true,
            draft: newDraft
        }
    };
}

