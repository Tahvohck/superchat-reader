import { CurrencyCodeRecord } from 'currency-codes';
import { LocallyCachedImage } from '@/ImageCache.ts';
import { join } from '@std/path/join';

export interface DonationProvider {
    readonly name: string;
    readonly version: string;
    /** Activate the provider. Return value indicates success. */
    activate(): Promise<boolean>;
    /** Deactivate the provider. Return value indicates success. */
    deactivate(): Promise<boolean>;
    /**
     * Wait for new messages from the provider. Implemented via an ansynchronus generator style.
     */
    process(): AsyncGenerator<DonationMessage>;
    configure(): void;
}

export interface DonationMessage {
    message: string | LocallyCachedImage;
    messageType: 'text' | 'image';
    donationAmount: number;
    donationCurrency: CurrencyCodeRecord;
    donationClass: DonationClass;
    author: string; // Visible username
    authorID?: string; // If provided by platform
    authorAvatar?: LocallyCachedImage; // reference to on-disk cache instead of storing multiple times
}

export function donationMessageToString(dm: DonationMessage) {
    let str = `${dm.author}: ${dm.donationAmount} ${dm.donationCurrency.currency}`;
    str += '\n';
    str += `${dm.message}`;
    return str;
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

/**
 * Base class for all provider configs.
 * 
 * @example
 * ```ts
 * class ExampleConfig extends ProviderConfig {
 *      public example = "Hello World!";
 *      public another = 123;
 * }
 * 
 * const config = await ProviderConfig.load("example.json", ExampleConfig);
 * 
 * // Setting a property automatically causes a synchronous save.
 * config.example = "Goodbye World!";
 * ```
 */
export class ProviderConfig {
    constructor(protected savePath: string) {
        return new Proxy(this, {
            set: (target, prop, value) => {
                Reflect.set(target, prop, value);
                target.save();
                return true;
            }
        });
    }

    /**
     * Save the config to disk at the path specified by `savePath`.
     * This is automatically called every time a property is set.
     */
    public save(): void {
        const copy = structuredClone(this);
        Reflect.deleteProperty(copy, "savePath");

        const savePath = join(Deno.cwd(), "config", this.savePath);

        // ensure config folder exists
        Deno.mkdirSync(join(Deno.cwd(), "config"));
        Deno.writeTextFileSync(savePath, JSON.stringify(copy));
    }

    /**
     * Load the config from disk at the path specified by `savePath`.
     * 
     * Constructing a config class directly without going through `load` will lead to unexpected behaviour.
     * @param savePath Path to load config from
     * @param constructor Config class to construct
     **/
    public static async load<T>(savePath: string, constructor: new (savePath: string) => T): Promise<T> {
        try {
            const json = JSON.parse(await Deno.readTextFile(savePath));
            const config = new constructor(savePath);
            
            for (const [key, value] of Object.entries(json)) {
                Reflect.set(config as object, key, value);
            }

            return config;
        } catch {
            // file doesn't exist or old JSON is corruped; we wanna create a new config instead.
            return new constructor(savePath);
        }
    }
}