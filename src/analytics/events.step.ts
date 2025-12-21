import type { ApiRouteConfig, Handlers } from "motia";
import { AnalyzedEvent } from "../types";

export const config: ApiRouteConfig = {
    name: 'GetRecentEvents',
    type: 'api',
    path: '/events',
    method: 'GET',
    description: 'Get recent analyzed events',
    emits: []
}

export const handler: Handlers['GetRecentEvents'] = async (req, { state }) => {
    const events = await state.getGroup<AnalyzedEvent>('recent_events');
    // Sort by date desc
    const sortedEvents = Object.values(events).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
        status: 200,
        body: {
            success: true,
            events: sortedEvents
        }
    };
}
