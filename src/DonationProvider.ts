import { CurrencyCodeRecord } from 'currency-codes';
import { ConfigurationBuilder } from '@app/ConfigurationBuilder.ts';
import { LocallyCachedImage } from '@app/ImageCache.ts';
import EventEmitter from 'node:events';

export type DonationEventMap = {
    message: [DonationMessage];
    finished: [];
};

export function splitEmitter<T extends Record<string, unknown[]>>(emitter: EventEmitter<T>) {
    return [
        new EventEmitterOnly<T>(emitter),
        new EventListenerOnly<T>(emitter),
    ] as const;
}

export type DonationEventEmitter = EventEmitterOnly<DonationEventMap>;
export type DonationEventListener = EventListenerOnly<DonationEventMap>;

class EventListenerOnly<T extends Record<string, unknown[]> = Record<string, unknown[]>> {
    constructor(private readonly emitter: EventEmitter<T>) {}

    public on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this {
        //deno-lint-ignore no-explicit-any
        this.emitter.on(event as any, listener as any);
        return this;
    }

    public off<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this {
        //deno-lint-ignore no-explicit-any
        this.emitter.off(event as any, listener as any);
        return this;
    }
}

class EventEmitterOnly<T extends Record<string, unknown[]> = Record<string, unknown[]>> {
    constructor(private readonly emitter: EventEmitter<T>) {}

    public emit<K extends keyof T>(event: K, ...args: T[K]): boolean {
        //deno-lint-ignore no-explicit-any
        return this.emitter.emit(event as any, ...args as any);
    }
}

export interface DonationProvider {
    readonly id: string;
    readonly version: string;
    readonly name: string;
    /**
     * Called *once* at program startup to initialize the provider.
     * @param configuration register configuration options here.
     * @param emitter emit message donation events here. You likely want to store this emitter for later use. It is only valid to emit events after `start` has been called.
     */
    init(configuration: ConfigurationBuilder, emitter: DonationEventEmitter): void | Promise<void>;
    start(): void | Promise<void>;
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
