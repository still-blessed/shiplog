import { Logger } from "motia";
import { GoogleGenAI } from "@google/genai";

export interface AIAnalysisResult {
    hypeScore: number; // 1-10
    category: 'Feature' | 'Fix' | 'Chore';
    summary?: string;
    codeSnippets?: string[];
}

export class GeminiClient {
    private apiKey: string;
    private logger: Logger;
    private client: GoogleGenAI | null = null;

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
            return this.mockAnalysis(title);
        }

        try {
            const filesContext = files.slice(0, 5).map(f => `File: ${f.name}\nPatch:\n${(f.patch || '').slice(0, 1000)}`).join('\n\n');
            const commentsContext = comments.join('\n');

            const prompt = `
                Analyze this Pull Request for a developer social media tool.
                Title: ${title}
                Body: ${body}

                Comments:
                ${commentsContext}

                Files (truncated):
                ${filesContext}

                Task:
                1. Analyze the discussion in comments and the PR body to understand the problem and solution.
                2. Identify the most interesting code snippets from the files that demonstrate the solution.
                3. Determine the hype score (1-10) and category.

                Output purely JSON in the following format (no markdown code blocks):
                {
                    "hypeScore": <number 1-10, how exciting is this for a public announcement?>,
                    "category": <"Feature" | "Fix" | "Chore">,
                    "summary": <string, detailed overview of discussion and solution>,
                    "codeSnippets": <string[], array of interesting code snippets found in the patches>
                }
            `;

            const response = await this.client.models.generateContent({
                model: "gemini-2.5-flash-lite",
                contents: prompt
            });

            const text = response.text!;

            return this.parseJSON(text, { hypeScore: 5, category: 'Fix' });
        } catch (error) {
            this.logger.error("Gemini analysis failed", { error });
            return { hypeScore: 5, category: 'Fix' };
        }
    }

    async generatePost(content: string, platform: 'twitter' | 'linkedin' | 'discord'): Promise<string> {
        if (!this.client) {
            return `[MOCK AI] Social post for ${platform}: ${content}`;
        }

        try {
            const prompt = `
                You are a tech influencer. Rewrite this raw technical content into an engaging post for ${platform}.
                Keep it under 280 characters for Twitter. Use emojis.
                
                Content: "${content}"
                
                Output just the post text.
            `;

            const response = await this.client.models.generateContent({
                model: "gemini-2.5-flash-lite",
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

    private mockAnalysis(title: string): AIAnalysisResult {
        const isFeature = title.toLowerCase().startsWith('feat') || title.toLowerCase().includes('add');
        return {
            hypeScore: isFeature ? 8 : 3,
            category: isFeature ? 'Feature' : 'Fix'
        };
    }
}
