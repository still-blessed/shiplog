import { Logger } from "motia";
import { GoogleGenAI } from "@google/genai";

export interface AIAnalysisResult {
    hypeScore: number; // 1-10
    category: 'Feature' | 'Fix' | 'Chore' | 'Release' | 'Issue' | 'Milestone' | 'Discussion'; // Expanded
    summary?: string; // Engaging overview
    codeSnippets?: string[]; // For code-heavy events
    keyHighlights?: string[]; // For discussion-heavy events, e.g., bullets from comments
}

export class GeminiClient {
    private apiKey: string;
    private logger: Logger;
    private client: GoogleGenAI | null = null;
    private model: string = "gemini-2.5-flash-lite";

    constructor(logger: Logger) {
        this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
        this.logger = logger;

        if (!this.apiKey) {
            this.logger.warn("GEMINI_API_KEY is not set. AI features will run in mock mode.");
        } else {
            this.client = new GoogleGenAI({ apiKey: this.apiKey });
        }
    }

    async analyzePR(title: string, body: string, comments: string[] = [], files: { name: string; patch?: string }[] = []): Promise<AIAnalysisResult> {
        if (!this.client) {
            return this.mockAnalysis('pr', title, body, comments, files);
        }
        try {
            const filesContext = files.slice(0, 5).map(f => `File: ${f.name}\nPatch:\n${(f.patch || '').slice(0, 1000)}`).join('\n\n');
            const commentsContext = comments.join('\n');
            const prompt = `
                Analyze this Pull Request for an open-source project's social media hype tool.
                Title: ${title}
                Body: ${body}
                Comments: ${commentsContext}
                Files (truncated): ${filesContext}

                Task:
                1. Dive into discussion: Identify problems solved, innovations, debates, or team excitement. Note if controversial (balanced view).
                2. Evaluate impact: User benefits? Novelty/viral potential? (e.g., AI feature = high hype; internal refactor = low).
                3. Extract 1-3 interesting code snippets with brief context (e.g., "This adds the core logic: \`\`\`code\`\`\`").
                4. Handle edges: No code? Focus on summary. Docs only? Highlight clarity improvements.
                5. Hype score (1-10): 8+ for features with appeal; 6-7 for fixes; <5 for chores. Boost for positive comments.
                6. Category: 'Feature', 'Fix', or 'Chore'—choose accurately.

                Output purely JSON:
                {
                    "hypeScore": <1-10>,
                    "category": <"Feature" | "Fix" | "Chore">,
                    "summary": <engaging, natural overview ready for social posts>,
                    "codeSnippets": <array of formatted snippets>,
                    "keyHighlights": <array of 2-4 bullets from discussion, or empty>
                }
            `;
            const response = await this.client.models.generateContent({
                model: this.model,
                contents: prompt
            });
            const text = response.text!;
            return this.parseJSON(text, { hypeScore: 5, category: 'Fix' });
        } catch (error) {
            this.logger.error("Gemini PR analysis failed", { error });
            return { hypeScore: 5, category: 'Fix' };
        }
    };

    async analyzeIssue(title: string, body: string, comments: string[] = [], labels: string[] = [], state: 'open' | 'closed' = 'open'): Promise<AIAnalysisResult> {
        if (!this.client) {
            return this.mockAnalysis('issue', title, body, comments, [], { labels, state });
        }
        try {
            const commentsContext = comments.join('\n');
            const labelsContext = labels.join(', ');
            const prompt = `
            Analyze this GitHub Issue for social media hype in an OSS project.
            Title: ${title}
            Body: ${body}
            Comments: ${commentsContext}
            Labels: ${labelsContext}
            State: ${state}

            Task:
            1. Summarize discussion: Key problems, user impacts, proposed solutions, or resolutions.
            2. Extract 2-4 highlights as bullets (e.g., user stories, debates).
            3. Hype score (1-10): High for community-driven features or quick fixes; low for minor bugs.
            4. Category: 'Feature' (enhancements), 'Fix' (bugs), 'Discussion' (general).
            5. Boost hype if closed quickly or with positive feedback.

            Output purely JSON:
            {
                "hypeScore": <1-10>,
                "category": <"Feature" | "Fix" | "Discussion">,
                "summary": <engaging overview, e.g., "Community spotted this—fixed in record time!">,
                "keyHighlights": <array of bullets>
            }
        `;
            const response = await this.client.models.generateContent({
                model: this.model,
                contents: prompt
            });
            const text = response.text!;
            return this.parseJSON(text, { hypeScore: 4, category: 'Discussion' });
        } catch (error) {
            this.logger.error("Gemini Issue analysis failed", { error });
            return { hypeScore: 4, category: 'Discussion' };
        }
    }

    async analyzeRelease(tag: string, title: string, body: string, assets: string[] = []): Promise<AIAnalysisResult> {  // assets e.g., download links
        if (!this.client) {
            return this.mockAnalysis('release', title, body, [], [], { tag, assets });
        }
        try {
            const assetsContext = assets.join(', ');
            const prompt = `
            Analyze this GitHub Release for social media announcements.
            Tag: ${tag}
            Title: ${title}
            Body/Changelog: ${body}
            Assets: ${assetsContext}

            Task:
            1. Summarize key changes: Features, fixes, impacts.
            2. Extract 2-4 highlights (e.g., "New AI integration!").
            3. Hype score (1-10): High for major versions or big features.
            4. Category: 'Release'.

            Output purely JSON:
            {
                "hypeScore": <1-10>,
                "category": "Release",
                "summary": <exciting overview, e.g., "v1.0 is here—game changer!">,
                "keyHighlights": <array of bullets>
            }
        `;
            const response = await this.client.models.generateContent({
                model: this.model,
                contents: prompt
            });
            const text = response.text!;
            return this.parseJSON(text, { hypeScore: 7, category: 'Release' });
        } catch (error) {
            this.logger.error("Gemini Release analysis failed", { error });
            return { hypeScore: 7, category: 'Release' };
        }
    }

    async analyzeMilestone(title: string, description: string, dueDate: string, completedIssues: number, totalIssues: number): Promise<AIAnalysisResult> {
        if (!this.client) {
            return this.mockAnalysis('milestone', title, description, [], [], { dueDate, completedIssues, totalIssues });
        }
        try {
            const prompt = `
            Analyze this GitHub Milestone for hype-building posts.
            Title: ${title}
            Description: ${description}
            Due Date: ${dueDate}
            Progress: ${completedIssues}/${totalIssues} issues done.

            Task:
            1. Summarize achievements and next steps.
            2. Extract highlights (e.g., "Hit 80% completion ahead of schedule!").
            3. Hype score (1-10): High for on-time completions or big milestones.
            4. Category: 'Milestone'.

            Output purely JSON:
            {
                "hypeScore": <1-10>,
                "category": "Milestone",
                "summary": <motivational overview>,
                "keyHighlights": <array of 2-3 bullets>
            }
        `;
            const response = await this.client.models.generateContent({
                model: this.model,
                contents: prompt
            });
            const text = response.text!;
            return this.parseJSON(text, { hypeScore: 6, category: 'Milestone' });
        } catch (error) {
            this.logger.error("Gemini Milestone analysis failed", { error });
            return { hypeScore: 6, category: 'Milestone' };
        }
    }

    async generatePost(content: string, platform: 'twitter' | 'linkedin' | 'discord'): Promise<string> {
        if (!this.client) {
            return `[MOCK AI] Social post for ${platform}: ${content}`;
        }

        try {
            const prompt = `
                You are a hype-building tech influencer for open-source projects. Transform this technical content into an engaging, organic social post for ${platform}. Sound natural, excited, and community-focused—vary phrasing to avoid templates. Use emojis sparingly but effectively. Include calls to action (e.g., "Star us!", "Contribute?"). Add relevant hashtags like #OpenSource #${projectName}.

                Guidelines by platform:
                - Twitter: <280 chars, punchy, teaser-style with cliffhangers.
                - LinkedIn: Professional, 200-400 chars, highlight impact for devs/sponsors.
                - Discord: Casual, conversational, invite discussion.

                Content: "${content}" // This could be the summary + snippets from analysis

                Examples:
                Input: "Fixed bug in login flow."
                Twitter output: "🚀 Just squashed a pesky login bug in Shiplog! Smoother sailing for all users. Who's ready to contribute more fixes? #OpenSource"
                LinkedIn output: "Excited to announce a key fix in our Shiplog tool—resolved a login issue that's been tripping up users. This improves reliability for OSS social management. Looking for sponsors to accelerate development!"

                Output just the post text—no extras.
            `;

            const response = await this.client.models.generateContent({
                model: this.model,
                contents: prompt
            });
            return response.text!.trim();
        } catch (error) {
            this.logger.error("Gemini generation failed", { error });
            return content;
        }
    }

    private parseJSON(text: string, fallback: any): any {
        try {
            // Clean up any markdown code blocks if present
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (e) {
            this.logger.warn("Failed to parse Gemini JSON response", { text });
            return fallback;
        }
    }

    private mockAnalysis(eventType: string, title: string, body: string, comments: string[] = [], files: { name: string; patch?: string }[] = [], additionalContext: any = {}): AIAnalysisResult {
        // Shared mock logic, adaptable per eventType
        let category: AIAnalysisResult['category'] = 'Fix';
        let hypeScore = 5;
        let keyHighlights: string[] = [];
        let codeSnippets: string[] = [];

        if (eventType === 'pr') {
            const isFeature = title.toLowerCase().includes('feat') || title.toLowerCase().includes('add');
            const isBreaking = title.toLowerCase().includes('breaking');
            category = isFeature ? 'Feature' : (title.toLowerCase().includes('fix') ? 'Fix' : 'Chore');
            hypeScore = isFeature ? 7 : 4;
            if (isBreaking) hypeScore -= 2;
            const hasExcitement = comments.some(c => c.toLowerCase().includes('awesome') || c.toLowerCase().includes('great'));
            if (hasExcitement) hypeScore += 2;
            codeSnippets = files.filter(f => f.patch).map(f => f.patch!.slice(0, 200) + '...');
            keyHighlights = comments.slice(0, 2).map(c => `- ${c.slice(0, 100)}`);
        } else if (eventType === 'issue') {
            const { labels = [], state = 'open' } = additionalContext;
            category = labels.includes('enhancement') ? 'Feature' : (labels.includes('bug') ? 'Fix' : 'Discussion');
            hypeScore = state === 'closed' ? 6 : 3;
            const hasCommunity = comments.length > 2;
            if (hasCommunity) hypeScore += 2;
            keyHighlights = comments.map((c: string) => `- Comment: ${c.slice(0, 50)}...`);
            // No codeSnippets for issues
        } else if (eventType === 'release') {
            const { tag = '', assets = [] } = additionalContext;
            category = 'Release';
            hypeScore = tag.startsWith('v') && tag.includes('.0.0') ? 9 : 7;  // Major release boost
            keyHighlights = body.split('\n').filter(line => line.startsWith('-')).slice(0, 4);
        } else if (eventType === 'milestone') {
            const { dueDate = '', completedIssues = 0, totalIssues = 0 } = additionalContext;
            category = 'Milestone';
            const progress = totalIssues > 0 ? completedIssues / totalIssues : 0;
            hypeScore = progress > 0.8 ? 8 : 5;
            keyHighlights = [`- Progress: ${Math.round(progress * 100)}%`, `- Due: ${dueDate}`];
        }

        hypeScore = Math.max(1, Math.min(10, hypeScore));
        const hasExcitement = comments.some(c => c.toLowerCase().includes('awesome') || c.toLowerCase().includes('great'));
        const summary = `${category} update: ${title}. ${hasExcitement ? 'Team is pumped!' : 'Solid progress.'}`;
        return { hypeScore, category, summary, codeSnippets, keyHighlights };
    }
}
