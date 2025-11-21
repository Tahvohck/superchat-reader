import { CurrencyCodeRecord } from 'currency-codes';
import { ConfigurationBuilder } from '@app/ConfigurationBuilder.ts';
import { LocallyCachedImage } from '@app/ImageCache.ts';
import { EventEmitterOnly, EventListenerOnly } from './util.ts';

export type DonationEventMap = {
    message: [DonationMessage];
    finished: [];
};

export type DonationEventEmitter = EventEmitterOnly<DonationEventMap>;
export type DonationEventListener = EventListenerOnly<DonationEventMap>;

export interface DonationProvider {
    /**
     * A unique identifier for this provider.
     */
    readonly id: string;
    /**
     * Human-readable name for this provider. This should be descriptive, but doesn't have to be unique.
     */
    readonly name: string;
    readonly version: string;
    /**
     * Called *once* at program startup to initialize the provider.
     * @param configuration register configuration options here.
     * @param emitter emit message donation events here. You likely want to store this emitter for later use. It is only valid to emit events after `start` has been called.
     */
    init(configuration: ConfigurationBuilder, emitter: DonationEventEmitter): void | Promise<void>;
    /**
     * Start listening for donations. After this is called, donation messages can be emitted via the emitter provided in {@link DonationProvider.init | init}
     */
    start(): void | Promise<void>;
    /**
     * Stop listening for donations. After this is called, no further donation messages should be emitted.
     */
    stop(): void | Promise<void>;
    /**
     * Called when the provider is being destroyed, either at program exit or when the provider is being unloaded.
     */
    destroy?(): void | Promise<void>;
}

export type MessageType = 'text' | 'image';

type DonationMessageBase = {
    donationAmount: number;
    donationCurrency: CurrencyCodeRecord;
    donationClass: DonationClass;
    author: string; // Visible username
    authorID?: string; // If provided by platform
    authorAvatar?: LocallyCachedImage; // reference to on-disk cache instead of storing multiple times
};

interface DonationTextMessage extends DonationMessageBase {
    messageType: 'text';
    message: string;
}

interface DonationImageMessage extends DonationMessageBase {
    messageType: 'image';
    message: LocallyCachedImage;
}

export type DonationMessage = DonationTextMessage | DonationImageMessage;

export function donationMessageToString(dm: DonationMessage) {
    let str = `${dm.author}: ${dm.donationAmount} ${dm.donationCurrency.currency}`;
    str += '\n';
    str += `${dm.message}`;
    return str;
}

export enum DonationClass {
    Blue = 'Blue',
    LightBlue = 'LightBlue',
    Green = 'Green',
    Yellow = 'Yellow',
    Orange = 'Orange',
    Magenta = 'Magenta',
    Red = 'Red',
}
