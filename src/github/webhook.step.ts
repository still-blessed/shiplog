import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

export const config: ApiRouteConfig = {
    name: 'GithubWebhook',
    type: 'api',
    path: '/webhooks/github',
    method: 'POST',
    description: 'Receives webhooks from GitHub for PR merges and releases',
    emits: ['github.pr_merged', 'github.release_published'],
    flows: ['github-flow'],
    bodySchema: z.object({
        action: z.string().optional(),
        pull_request: z.object({
            merged: z.boolean().optional(),
            title: z.string(),
            body: z.string().nullable(),
            html_url: z.string(),
            user: z.object({
                login: z.string(),
            }),
        }).optional(),
        release: z.object({
            tag_name: z.string(),
            name: z.string().nullable(),
            body: z.string().nullable(),
            html_url: z.string(),
            author: z.object({
                login: z.string(),
            }),
        }).optional(),
        repository: z.object({
            full_name: z.string(),
        }),
    }),
};

export const handler: Handlers['GithubWebhook'] = async (req, { emit, logger }) => {
    // Get the event type from GitHub headers
    const eventType = req.headers['x-github-event'] as string;

    logger.info('GitHub webhook received', {
        eventType,
        repository: req.body.repository?.full_name
    });

    // Handle Pull Request events
    if (eventType === 'pull_request' && req.body.action === 'closed' && req.body.pull_request?.merged) {
        const pr = req.body.pull_request;

        logger.info('PR merged event detected', {
            title: pr.title,
            contributor: pr.user.login,
            url: pr.html_url
        });

        await emit({
            topic: 'github.pr_merged',
            data: {
                title: pr.title,
                body: pr.body || '',
                url: pr.html_url,
                contributor: pr.user.login,
                repository: req.body.repository.full_name,
                mergedAt: new Date().toISOString(),
            }
        });

        return {
            status: 200,
            body: {
                success: true,
                message: 'PR merged event processed',
                event: 'github.pr_merged'
            }
        };
    }

    // Handle Release events
    if (eventType === 'release' && req.body.action === 'published' && req.body.release) {
        const release = req.body.release;

        logger.info('Release published event detected', {
            tagName: release.tag_name,
            name: release.name,
            author: release.author.login
        });

        await emit({
            topic: 'github.release_published',
            data: {
                tagName: release.tag_name,
                name: release.name || release.tag_name,
                body: release.body || '',
                url: release.html_url,
                author: release.author.login,
                repository: req.body.repository.full_name,
                publishedAt: new Date().toISOString(),
            }
        });

        return {
            status: 200,
            body: {
                success: true,
                message: 'Release published event processed',
                event: 'github.release_published'
            }
        };
    }

    // Unhandled event type
    logger.info('Unhandled GitHub event', { eventType, action: req.body.action });

    return {
        status: 200,
        body: {
            success: true,
            message: `Event type '${eventType}' acknowledged but not processed`,
            event: null
        }
    };
};
