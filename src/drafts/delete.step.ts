import type { ApiRouteConfig, Handlers } from "motia";

export const config: ApiRouteConfig = {
    name: 'DeleteDraft',
    type: 'api',
    path: '/draft/:id',
    method: 'DELETE',
    description: 'Delete a draft',
    emits: [],
    flows: ['draft-flow']
}

export const handler: Handlers['DeleteDraft'] = async (req, { state, logger, emit }) => {
    const id = req.pathParams.id;
    const draft = await state.get('drafts', id);

    if (draft) {
        await state.delete('drafts', id);
        logger.info('Draft deleted successfully', { draft });
    } else {
        logger.info('Draft not found', { id });
    }

    return {
        status: 200,
        body: {
            success: true,
            draft
        }
    };
}
