import { ConfigurationBuilder } from '@app/ConfigurationBuilder.ts';
import {
    DonationClass,
    DonationMessage,
    DonationProvider,
} from '@app/DonationProvider.ts';
import { SavedConfig, SAVE_PATH } from '@app/SavedConfig.ts'
import { ScrapingClient } from 'youtube.js';
import { ChatMessage, MessageType } from 'youtube.js/dist/scraping/ChatClient.js';
import { LocallyCachedImage } from '@app/ImageCache.ts';
import { code } from 'currency-codes';
import { getCurrencyCodeFromString } from '@app/CurrencyConversion.ts';

export class YouTubeDonationProvider implements DonationProvider {
    id = 'youtube';
    name = 'YouTube';
    version = '0.0.1';

    private readonly client: ScrapingClient;
    private config!: YouTubeConfig;

    // youtube.js has no internal mechanism to stop a chat reader, so we use this variable
    // to check when we should break out of the process loop.
    private shouldStop = false;
    private shouldStopPromise?: Promise<void>;
    private shouldStopResolve?: () => void;

    constructor() {
        this.client = new ScrapingClient();
    }

    async activate(): Promise<boolean> {
        try {
            this.config = await SavedConfig.getOrCreate(YouTubeConfig);
            await this.client.init();

            this.shouldStop = false;

            const { promise, resolve } = Promise.withResolvers<void>();
            this.shouldStopPromise = promise;
            this.shouldStopResolve = resolve;

            return true;
        } catch {
            return false;
        }
    }

    async deactivate(): Promise<boolean> {
        this.shouldStop = true;
        await this.shouldStopPromise;
        return true;
    }

    async *process(): AsyncGenerator<DonationMessage> {
        if (!this.config.streamId) {
            throw new Error('Stream ID not set.');
        }

        const chat = await this.client.chat(this.config.streamId!);

        for await (const message of chat.read()) {
            if (this.shouldStop) {
                this.shouldStopResolve!();
                return;
            }
            yield await this.toDonationMessage(message);
        }
    }

    private async toDonationMessage(message: ChatMessage): Promise<DonationMessage> {
        const donationMessage: Partial<DonationMessage> = {
            author: message.author.name,
            authorID: message.author.channelId,
            authorAvatar: await LocallyCachedImage.saveNew(await fetch(message.author.avatarUrl)),
        };

        switch (message.type) {
            case MessageType.Membership: {
                donationMessage.message = message.message?.simpleText ?? '';
                donationMessage.messageType = 'text';
                donationMessage.donationAmount = 0;
                donationMessage.donationCurrency = code('USD')!;
                donationMessage.donationClass = DonationClass.Green;
                break;
            }
            case MessageType.SuperChat: {
                donationMessage.message = message.message?.simpleText ?? '';
                donationMessage.messageType = 'text';
                donationMessage.donationAmount = message.amount;

                const currencyCode = getCurrencyCodeFromString(message.currency);
                if (!currencyCode) {
                    throw new Error('SHIT FUCK SHIT SHIT FUCK');
                }
                donationMessage.donationCurrency = currencyCode;
                // temporarily set to blue while we figure out details of `DonationClass`
                donationMessage.donationClass = DonationClass.Blue;
                break;
            }
            case MessageType.SuperSticker: {
                donationMessage.message = await LocallyCachedImage.saveNew(await fetch(message.sticker));
                donationMessage.messageType = 'image';
                // FIXME: youtube.js doesn't support donation amounts for stickers yet. This is an oversight and will be fixed soon:tm:.
                donationMessage.donationAmount = 0;
                donationMessage.donationCurrency = code('USD');
                // temporarily set to blue while we figure out details of `DonationClass`
                donationMessage.donationClass = DonationClass.Blue;
                break;
            }
        }

        return donationMessage as DonationMessage;
    }

    configure(cb: ConfigurationBuilder): void {
    }
}

export class YouTubeConfig extends SavedConfig {
    [SAVE_PATH] = "youtube.json"
    public streamId?: string;
}
