import EventEmitter from 'node:events';
import { CurrencyCodeRecord } from 'currency-codes';
import { ConfigurationBuilder } from '@app/ConfigurationBuilder.ts';
import { LocallyCachedImage } from '@app/ImageCache.ts';

export type DonationReaderEventMap = {
    message: [DonationMessage];
    finished: [];
};

// DonationReaders only need to support `on("message", ...)` and `on("finished", ...)`, so we don't really want to
// force them to implement the entire EventEmitter interface.
export type EventEmitterListenOnly<T extends Record<keyof T, unknown[]>> = Pick<EventEmitter<T>, 'on'>;

/**
 * A `DonationReader` represents a single stream of donation events that can be invalidated at any point.
 * See {@link DonationProvider.createReader | createReader} for more info.
 */
export interface DonationReader extends EventEmitterListenOnly<DonationReaderEventMap> {}

/**
 * Entry type of a platform module that sticks around for the entire program's duration. Ideally this should be dependency-free.
 */
export interface DonationProvider<T extends DonationReader = DonationReader> {
    readonly id: string;
    readonly version: string;
    readonly name: string;
    /**
     * Create a reader according to the current state of the provider. If the state of the provider changes (i.e., settings are changed),
     * this function may be called again.
     * @param signal tells the reader to stop processing messages. This can either happen when the program shuts down, the user stops all readers, or configuration is rebuilt.
     */
    createReader(signal: AbortSignal): T | Promise<T>;
    init?(configurator: ConfigurationBuilder): void | Promise<void>;
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
