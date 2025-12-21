import type { ApiRouteConfig, Handlers } from "motia";
import { Draft, AnalyzedEvent } from "../types";

export const config: ApiRouteConfig = {
    name: 'GetStats',
    type: 'api',
    path: '/stats',
    method: 'GET',
    description: 'Get dashboard statistics',
    emits: []
}

export const handler: Handlers['GetStats'] = async (req, { state }) => {
    const drafts = await state.getGroup<Draft>('drafts');
    const events = await state.getGroup<AnalyzedEvent>('recent_events');
    
    const draftList = Object.values(drafts);
    const eventList = Object.values(events);

    return {
        status: 200,
        body: {
            activeDrafts: draftList.filter(d => d.status === 'draft').length,
            scheduled: draftList.filter(d => d.status === 'scheduled').length,
            published: draftList.filter(d => d.status === 'published').length,
            analyzedEvents: eventList.length,
        }
    };
}
