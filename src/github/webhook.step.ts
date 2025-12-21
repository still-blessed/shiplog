import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

export const config: ApiRouteConfig = {
    name: 'GithubWebhook',
    type: 'api',
    path: '/webhooks/github',
    method: 'POST',
    description: 'Receives webhooks from GitHub for PR merges and releases',
    emits: ['github.pr_merged', 'github.release_published', 'github.issue_closed', 'github.milestone_closed'],
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
        issue: z.object({
            title: z.string(),
            body: z.string().nullable(),
            html_url: z.string(),
            url: z.string(),
            number: z.number(),
            state: z.string(),
            labels: z.array(z.object({ name: z.string() })).optional(),
            user: z.object({ login: z.string() }),
        }).optional(),
        milestone: z.object({
            title: z.string(),
            description: z.string().nullable(),
            html_url: z.string(),
            state: z.string(),
            due_on: z.string().nullable(),
            open_issues: z.number(),
            closed_issues: z.number(),
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

    // Handle Issue events (closed)
    if (eventType === 'issues' && req.body.action === 'closed' && req.body.issue) {
        const issue = req.body.issue;

        logger.info('Issue closed event detected', {
            title: issue.title,
            number: issue.number,
            user: issue.user.login
        });

        let comments: string[] = [];
        try {
            if (process.env.GITHUB_TOKEN) {
                const headers = {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Shiplog-Bot'
                };
                const commentsUrl = `${issue.url}/comments`;
                const res = await fetch(commentsUrl, { headers });
                if (res.ok) {
                    const data = await res.json() as any[];
                    comments = data.map((c: any) => `[Comment] ${c.user.login}: ${c.body}`);
                }
            }
        } catch (e) {
            logger.error("Failed to fetch issue comments", { error: e });
        }

        await emit({
            topic: 'github.issue_closed',
            data: {
                title: issue.title,
                body: issue.body || '',
                url: issue.html_url,
                number: issue.number,
                state: 'closed',
                labels: issue.labels?.map((l: any) => l.name) || [],
                comments,
                author: issue.user.login,
                repository: req.body.repository.full_name,
                updatedAt: new Date().toISOString(),
            }
        });

        return {
            status: 200,
            body: {
                success: true,
                message: 'Issue closed event processed',
                event: 'github.issue_closed'
            }
        };
    }

    // Handle Milestone events (closed)
    if (eventType === 'milestone' && req.body.action === 'closed' && req.body.milestone) {
        const milestone = req.body.milestone;

        logger.info('Milestone closed event detected', {
            title: milestone.title,
            state: milestone.state
        });

        await emit({
            topic: 'github.milestone_closed',
            data: {
                title: milestone.title,
                description: milestone.description || '',
                url: milestone.html_url,
                state: 'closed',
                dueDate: milestone.due_on,
                openIssues: milestone.open_issues,
                closedIssues: milestone.closed_issues,
                repository: req.body.repository.full_name,
                updatedAt: new Date().toISOString(),
            }
        });

        return {
            status: 200,
            body: {
                success: true,
                message: 'Milestone closed event processed',
                event: 'github.milestone_closed'
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
