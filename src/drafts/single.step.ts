import type { ApiRouteConfig, Handlers } from "motia";
import { Draft } from "../types";

export const config: ApiRouteConfig = {
    name: 'SingleDraft',
    type: 'api',
    path: '/draft/:id',
    method: 'GET',
    description: 'Get a single draft',
    emits: []
}

export const handler: Handlers['SingleDraft'] = async (req, { state, logger }) => {
    const id = req.pathParams.id;
    const draft = await state.get<Draft>('drafts', id);
    logger.info('Draft retrieved successfully', { draft });
    return {
        status: 200,
        body: {
            success: true,
            draft
        }
    };
}