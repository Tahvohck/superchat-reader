import {
    DonationClass,
    DonationMessage,
    DonationProvider,
    DonationProviderEvents,
    ProviderFactory,
} from '@app/DonationProvider.ts';
import { SAVE_PATH, SavedConfig } from '@app/SavedConfig.ts';
import { ScrapingClient } from 'youtube.js';
import { ChatMessage, MessageType } from 'youtube.js/dist/scraping/ChatClient.js';
import { LocallyCachedImage } from '@app/ImageCache.ts';
import { code } from 'currency-codes';
import { getCurrencyCodeFromString } from '@app/CurrencyConversion.ts';
import { DenoOrchestrator } from '@app/chat_providers/youtube/DenoOrchestrator.ts';
import { AbortableEventEmitter } from '../../util.ts';

const CLASS_LOOKUP = {
    4280191205: DonationClass.Blue,
    4278248959: DonationClass.LightBlue,
    4280150454: DonationClass.Green,
    4294953512: DonationClass.Yellow,
    4294278144: DonationClass.Orange,
    4290910299: DonationClass.Magenta,
    4293271831: DonationClass.Red,
} as Record<number, DonationClass>;

export class YouTubeDonationProvider extends AbortableEventEmitter<DonationProviderEvents> implements DonationProvider {
    private client!: ScrapingClient;

    constructor(signal: AbortSignal, private readonly config: YouTubeConfig) {
        super(signal);
    }

    async activate(): Promise<boolean> {
        try {
            this.client = new ScrapingClient({
                useOrchestrator: new DenoOrchestrator(),
            });

            await this.client.init();

            return true;
        } catch {
            return false;
        }
    }

    async *process(): AsyncGenerator<DonationMessage> {
        if (!this.config.streamId) {
            throw new Error('Stream ID not set.');
        }

        const chat = await this.client.chat(this.config.streamId!);

        for await (const message of chat.read()) {
            if (this.signal.aborted) {
                return;
            }
            yield await this.toDonationMessage(message);
        }
    }

    public async start() {
        for await (const message of this.process()) {
            this.emit('message', message);
        }

        this.emit('finished');
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

                donationMessage.donationAmount = parseFloat(
                    message.currencyString.replaceAll(/[^0-9,\.]/, '').replaceAll(',', '.'),
                );

                const currencyCode = getCurrencyCodeFromString(message.currencyString);
                if (!currencyCode) {
                    console.error(`Unknown currency code: ${message.currencyString}`);
                    donationMessage.donationCurrency = code('USD')!;
                } else {
                    donationMessage.donationCurrency = currencyCode;
                }

                donationMessage.donationClass = CLASS_LOOKUP[message.backgroundColor];
                break;
            }
            case MessageType.SuperSticker: {
                donationMessage.message = await LocallyCachedImage.saveNew(await fetch(message.sticker));
                donationMessage.messageType = 'image';
                // FIXME: youtube.js doesn't support donation amounts for stickers yet. This is an oversight and will be fixed soon:tm:.
                donationMessage.donationAmount = parseFloat(
                    message.currencyString.replaceAll(/[^0-9,\.]/, '').replaceAll(',', '.'),
                );
                donationMessage.donationCurrency = getCurrencyCodeFromString(message.currencyString);
                donationMessage.donationClass = CLASS_LOOKUP[message.backgroundColor];
                break;
            }
        }

        return donationMessage as DonationMessage;
    }
}

export class YouTubeFactory implements ProviderFactory {
    public readonly id: string = 'youtube';
    public readonly version: string = '0.0.1';
    public readonly name: string = 'YouTube';

    private config!: YouTubeConfig;

    public async createProvider(signal: AbortSignal): Promise<YouTubeDonationProvider> {
        const config = this.config = this.config ?? await SavedConfig.getOrCreate(YouTubeConfig);
        const provider = new YouTubeDonationProvider(signal, config);
        return provider;
    }
}

export class YouTubeConfig extends SavedConfig {
    [SAVE_PATH] = 'youtube.json';
    public streamId?: string;
}
