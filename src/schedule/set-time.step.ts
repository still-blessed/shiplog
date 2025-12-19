import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { Draft } from "../types";

export const config: ApiRouteConfig = {
    name: 'SchedulePost',
    type: 'api',
    path: '/schedule',
    method: 'POST',
    description: 'Schedules a draft for posting',
    emits: ['draft.scheduled'],
    flows: ['draft-flow'],
    bodySchema: z.object({
        draftId: z.string().uuid(),
        scheduledFor: z.string().datetime(),
    }),
};

export const handler: Handlers['SchedulePost'] = async (req, { state, logger, emit }) => {
    const { draftId, scheduledFor } = req.body;

    // Validation: Date must be in the future
    if (new Date(scheduledFor) <= new Date()) {
        return {
            status: 400,
            body: {
                success: false,
                message: 'Scheduled date must be in the future'
            }
        };
    }

    const draft = await state.get<Draft>('drafts', draftId);

    if (!draft) {
        return {
            status: 404,
            body: {
                success: false,
                message: 'Draft not found'
            }
        };
    }

    const updatedDraft: Draft = {
        ...draft,
        status: 'scheduled',
        scheduledFor: scheduledFor,
        updatedAt: new Date().toISOString(),
    };

    await state.set<Draft>('drafts', draftId, updatedDraft);

    logger.info('Draft scheduled successfully', { draftId, scheduledFor });

    await emit({
        topic: 'draft.scheduled',
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
