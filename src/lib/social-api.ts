import { Logger } from "motia";

export class SocialAPI {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    async postToTwitter(content: string): Promise<string> {
        this.logger.info(`[SocialAPI] Posting to Twitter: "${content}"`);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return `tweet_${Date.now()}`;
    }

    async postToLinkedIn(content: string): Promise<string> {
        this.logger.info(`[SocialAPI] Posting to LinkedIn: "${content}"`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return `li_share_${Date.now()}`;
    }

    async postToDiscord(content: string): Promise<string> {
        this.logger.info(`[SocialAPI] Posting to Discord: "${content}"`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return `msg_${Date.now()}`;
    }
}
