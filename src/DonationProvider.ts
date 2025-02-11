import { code } from 'currency-codes';
import { LocallyCachedImage } from '@/ImageCache.ts';

export interface IDonationProvider {
    readonly name: string;
    readonly version: string;
    /**
     * Activate the provider. Return value indicates success.
     */
    activate(): boolean;
    /**
     * Deactivate the provider. Return value indicates success.
     */
    deactivate(): boolean;
    /**
     * Wait for new messages from the provider.
     */
    process(): AsyncGenerator<DonationMessage>;
    configure(): void;
}

export class DonationMessage {
    message = 'Placeholder message';
    messageType: 'text' | 'image' = 'text';
    donationAmount = 0;
    donationCurrency = code('USD')!;
    donationClass = DonationClass.Blue;
    author = 'Sample Donator'; // Visible username
    authorID?: string; // If provided by platform
    authorAvatar?: LocallyCachedImage; // reference to on-disk cache instead of storing multiple times

    toString(): string {
        let str = `${this.author}: ${this.donationAmount} ${this.donationCurrency.currency}`;
        str += '\n';
        str += `${this.message}`;
        return str;
    }
}

export enum DonationClass {
    Blue,
    Light_Blue,
    Green,
    Yellow,
    Orange,
    Magenta,
    Red1,
    Red2,
    Red3,
    Red4,
    Red5,
}
