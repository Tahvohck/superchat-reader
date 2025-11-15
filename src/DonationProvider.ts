//@ts-types=npm:@types/node
import { CurrencyCodeRecord } from 'currency-codes';
import { LocallyCachedImage } from '@app/ImageCache.ts';

export type DonationProviderEvents = {
    message: [DonationMessage];
    finished: [];
};

export interface DonationProvider {
    on(event: 'message', callback: (message: DonationMessage) => void);
    on(event: 'finished', callback: () => void);
}

export interface ProviderFactory<T extends DonationProvider = DonationProvider> {
    readonly id: string;
    readonly version: string;
    readonly name: string;
    createProvider(signal: AbortSignal): T | Promise<T>;
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
