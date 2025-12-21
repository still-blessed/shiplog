import type { EventConfig, Handlers } from "motia";
import { GeminiClient } from "../lib/gemini";
import { GithubIssuePayload, GithubReleasePayload, GithubMilestonePayload, Draft, WeeklyQueueItem, AnalyzedEvent } from "../types";
import { randomUUID } from "node:crypto";

export const config: EventConfig = {
    name: 'AnalyzeActivity',
    type: 'event',
    subscribes: ['github.issue_closed', 'github.release_published', 'github.milestone_closed'],
    emits: ['draft.created', 'item.queued'],
    description: 'Analyzes GitHub activity (issues, releases, milestones) for content potential',
    flows: ['github-flow'],
}

export const handler: Handlers['AnalyzeActivity'] = async (input, { logger, emit, state, topic }) => {
    const ai = new GeminiClient(logger);
    let analysis: any;
    let sourceUrl = '';
    let contributor = '';
    let title = '';
    let type: WeeklyQueueItem['type'] = 'issue';

    if (topic === 'github.issue_closed') {
        const p = input as GithubIssuePayload;
        logger.info("Analyzing Issue", { title: p.title });
        analysis = await ai.analyzeIssue(p.title, p.body, p.comments, p.labels, p.state);
        sourceUrl = p.url;
        contributor = p.author;
        title = p.title;
        type = 'issue';
    } else if (topic === 'github.release_published') {
        const p = input as GithubReleasePayload;
        logger.info("Analyzing Release", { tag: p.tagName });
        analysis = await ai.analyzeRelease(p.tagName, p.name, p.body);
        sourceUrl = p.url;
        contributor = p.author;
        title = p.name || p.tagName;
        type = 'release';
    } else if (topic === 'github.milestone_closed') {
        const p = input as GithubMilestonePayload;
        logger.info("Analyzing Milestone", { title: p.title });
        analysis = await ai.analyzeMilestone(p.title, p.description, p.dueDate || '', p.closedIssues, p.openIssues + p.closedIssues);
        sourceUrl = p.url;
        contributor = ''; // Milestones are usually team efforts
        title = p.title;
        type = 'milestone';
    }

    if (!analysis) return;

    // Store Analyzed Event
    const eventId = randomUUID();
    const analyzedEvent: AnalyzedEvent = {
        id: eventId,
        title,
        type,
        hypeScore: analysis.hypeScore,
        analysis,
        createdAt: new Date().toISOString(),
        sourceUrl
    };
    await state.set('recent_events', eventId, analyzedEvent);

    logger.info("AI Analysis Complete", { analysis });

    if (analysis.hypeScore >= 6) {
        const draftId = randomUUID();
        let content = `📢 ${analysis.category}: ${title}\n\n`;
        if (analysis.summary) {
            content += `${analysis.summary}\n\n`;
        }
        if (analysis.keyHighlights && analysis.keyHighlights.length > 0) {
            content += `Highlights:\n${analysis.keyHighlights.join('\n')}\n\n`;
        }
        content += `Link: ${sourceUrl}`;

        const newDraft: Draft = {
            id: draftId,
            content,
            platform: 'twitter',
            status: 'draft',
            sourceUrl,
            contributorHandle: contributor,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await state.set('drafts', draftId, newDraft);
        logger.info("Draft created.", { draftId });
        await emit({ topic: 'draft.created', data: newDraft });
    } else {
        const itemId = randomUUID();
        const queueItem: WeeklyQueueItem = {
            id: itemId,
            title,
            contributor: contributor || 'Team',
            date: new Date().toISOString(),
            type
        };
        await state.set('weekly_queue', itemId, queueItem);
        logger.info("Added to weekly queue.", { itemId });
        await emit({ topic: 'item.queued', data: queueItem });
    }
};
