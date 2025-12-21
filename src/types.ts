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

export interface AnalyzedEvent {
    id: string;
    title: string;
    type: 'pr' | 'issue' | 'release' | 'milestone';
    hypeScore: number;
    analysis: any;
    createdAt: string;
    sourceUrl: string;
}

export interface WeeklyQueueItem {
    id: string;
    title: string;
    contributor: string;
    date: string;
    type?: 'pr' | 'issue' | 'release' | 'milestone';
}

// GitHub Webhook Payloads
export interface GithubPRMergedPayload {
    title: string;
    body: string;
    url: string;
    contributor: string;
    repository: string;
    mergedAt: string;
    comments?: string[];
    files?: { name: string; patch?: string }[];
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

export interface GithubIssuePayload {
    title: string;
    body: string;
    url: string;
    number: number;
    state: 'open' | 'closed';
    labels: string[];
    comments: string[];
    author: string;
    repository: string;
    updatedAt: string;
}

export interface GithubMilestonePayload {
    title: string;
    description: string;
    url: string;
    state: 'open' | 'closed';
    dueDate: string | null;
    openIssues: number;
    closedIssues: number;
    repository: string;
    updatedAt: string;
}