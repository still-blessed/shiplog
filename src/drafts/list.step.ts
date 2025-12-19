import type { ApiRouteConfig, Handlers } from "motia";
import { Draft } from "../types";

export const config: ApiRouteConfig = {
    name: 'ListDrafts',
    type: 'api',
    path: '/drafts',
    method: 'GET',
    description: 'List all draft',
    emits: []
}

export const handler: Handlers['ListDrafts'] = async (req, { state, logger }) => {
    // gets all the drafts from the stored state
    const drafts = await state.getGroup<Draft>('drafts');

    logger.info('Drafts retrieved successfully', { drafts });

    return {
        status: 200,
        body: {
            success: true,
            drafts
        }
    };
}