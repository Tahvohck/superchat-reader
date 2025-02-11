import { code } from 'currency-codes';

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

export class LocallyCachedImage {
    /** Hash of the file contents, SHA-1*/
    localFileName = 'DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF';
    /** Original file name on remote server to avoid downloading multiple times. */
    remoteFileName = '';

    /** Save a remote file to the local disk and return the local cache information */
    static async SaveNew(img: Response): Promise<LocallyCachedImage> {
        if (!img.ok) {
            throw new Error('Server returned error: ' + img.status);
        }

        const localcache = new LocallyCachedImage();
        const [type, subtype] = img.headers.get('content-type')!.split('/');

        if (type != 'image') {
            throw new Error('File is not an image! Refusing to download');
        }

        const tempfilename = await Deno.makeTempFile({
            prefix: 'superchat-',
            suffix: `.${subtype}`,
        });
        const tempfile = await Deno.open(tempfilename, {
            write: true,
            read: true,
        });

        img.body!.pipeTo(tempfile.writable);
        tempfile.close();

        localcache.remoteFileName = new URL(img.url).pathname;
        localcache.localFileName = tempfilename;
        //throw new Error("Not yet implented");
        return localcache;
    }
}
