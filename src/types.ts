export type DraftStatus = 'draft' | 'scheduled' | 'published';
export type Platform = 'twitter' | 'linkedin' | 'discord';

export interface Draft {
    id: string;
    content: string; // Markdown supported
    platform: Platform;
    status: DraftStatus;

    contributorHandle?: string; // e.g., "@user"
    sourceUrl?: string; // Link to the PR
    scheduledFor?: string;
    suggestedContent?: string;
    publishedAt?: string;

    createdAt: string;
    updatedAt: string;
}

export interface WeeklyQueueItem {
    id: string;
    prTitle: string;
    contributor: string;
    date: string;
}

// GitHub Webhook Payloads
export interface GithubPRMergedPayload {
    title: string;
    body: string;
    url: string;
    contributor: string;
    repository: string;
    mergedAt: string;
}

export interface GithubReleasePayload {
    tagName: string;
    name: string;
    body: string;
    url: string;
    author: string;
    repository: string;
    publishedAt: string;
}