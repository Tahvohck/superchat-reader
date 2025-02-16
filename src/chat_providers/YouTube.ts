import { DonationMessage, DonationProvider, ProviderConfig } from '@/DonationProvider.ts';
// this is temporary while I finish up chat support in youtube.js before I push it to npm - Eats
import { ScrapingClient } from "https://raw.githubusercontent.com/Mampfinator/youtube.js/chat-scraper/src/scraping/ScrapingClient.ts";
import { ChatClient } from "https://raw.githubusercontent.com/Mampfinator/youtube.js/chat-scraper/src/scraping/ChatClient.ts";

export class YouTubeDonationProvider implements DonationProvider  {
    name = "YouTube";
    version = "0.0.1";

    private readonly client: ScrapingClient;
    private config!: YouTubeConfig;

    constructor() {
        this.client = new ScrapingClient();
    }
    
    async activate(): Promise<boolean> {
        try {
            this.config = await ProviderConfig.load("youtube.json", YouTubeConfig);
            await this.client.init();
            return true;
        } catch {
            return false;
        }
    }

    async deactivate(): Promise<boolean> {
        return true;
    }

    async *process(): AsyncGenerator<DonationMessage> {
        if (!this.config.streamId) {
            throw new Error("Stream ID not set.");
        }

        const chat: ChatClient = await this.client.chat(this.config.streamId!);

        for await (const message of chat.read()) {
            // TODO: convert to DonationMessage
            yield this.toDonationMessage(message);
        }
    }

    private toDonationMessage(_message: unknown): DonationMessage {
        // TODO
        return {} as DonationMessage;
    }

    configure(): void {
        // TODO
    }

}

export class YouTubeConfig extends ProviderConfig {
    public streamId?: string;
}