import type { ApiRouteConfig, Handlers } from "motia";
import { Draft } from "../types";
import { z } from "zod";

export const config: ApiRouteConfig = {
    name: 'UpdateDraft',
    type: 'api',
    path: '/draft/:id',
    method: 'PATCH',
    description: 'Update a draft',
    emits: ['draft.updated'],
    flows: ['draft-flow'],
    bodySchema: z.object({
        content: z.string().optional(),
        platform: z.enum(['twitter', 'linkedin', 'discord']).optional(),
        scheduledFor: z.string().datetime().optional(),
    }),
}

export const handler: Handlers['UpdateDraft'] = async (req, { state, logger, emit }) => {
    const id = req.pathParams.id;
    const { content, platform, scheduledFor } = req.body;
    const draft = await state.get<Draft>('drafts', id);

    if (!draft) {
        return {
            status: 404,
            body: {
                success: false,
                message: 'Draft not found'
            }
        };
    }

    const updatedDraft = {
        ...draft,
        ...(content && { content }),
        ...(platform && { platform }),
        ...(scheduledFor && { scheduledFor }),
        updatedAt: new Date().toISOString(),
    };

    await state.set<Draft>('drafts', id, updatedDraft);

    logger.info('Draft updated successfully', { updatedDraft });

    await emit({
        topic: 'draft.updated',
        data: updatedDraft
    });

    return {
        status: 200,
        body: {
            success: true,
            draft: updatedDraft
        }
    };
}