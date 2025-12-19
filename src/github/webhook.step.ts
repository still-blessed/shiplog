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
            url: z.string(),
            number: z.number(),
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

        // Fetch comments and files
        let comments: string[] = [];
        let files: { name: string; patch?: string }[] = [];

        try {
            if (process.env.GITHUB_TOKEN) {
                const headers = {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Shiplog-Bot'
                };

                const reviewCommentsUrl = `${pr.url}/comments`;
                const issueCommentsUrl = pr.url.replace('/pulls/', '/issues/') + '/comments';
                const filesUrl = `${pr.url}/files`;

                const [reviewCommentsRes, issueCommentsRes, filesRes] = await Promise.all([
                    fetch(reviewCommentsUrl, { headers }),
                    fetch(issueCommentsUrl, { headers }),
                    fetch(filesUrl, { headers })
                ]);

                if (reviewCommentsRes.ok) {
                    const data = await reviewCommentsRes.json() as any[];
                    comments.push(...data.map((c: any) => `[Review] ${c.user.login}: ${c.body}`));
                }
                if (issueCommentsRes.ok) {
                    const data = await issueCommentsRes.json() as any[];
                    comments.push(...data.map((c: any) => `[Comment] ${c.user.login}: ${c.body}`));
                }
                if (filesRes.ok) {
                    const data = await filesRes.json() as any[];
                    files = data.map((f: any) => ({ name: f.filename, patch: f.patch }));
                }
            }
        } catch (e) {
            logger.error("Failed to fetch PR details", { error: e });
        }

        await emit({
            topic: 'github.pr_merged',
            data: {
                title: pr.title,
                body: pr.body || '',
                url: pr.html_url,
                contributor: pr.user.login,
                repository: req.body.repository.full_name,
                mergedAt: new Date().toISOString(),
                comments,
                files
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
    logger.warn('Unhandled GitHub event', { eventType, action: req.body.action });

    return {
        status: 200,
        body: {
            success: true,
            message: `Event type '${eventType}' acknowledged but not processed`,
            event: null
        }
    };
};
