import { CurrencyCodeRecord } from 'currency-codes';
import { LocallyCachedImage } from '@/ImageCache.ts';
import { join } from '@std/path/join';
import { assertEquals } from '@std/assert/equals';

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
 *      constructor(public readonly hello: string) {
 *
 *      }
 *
 *      public example = "Hello World!";
 *      public another = 123;
 * }
 *
 * const config = await ProviderConfig.load(ExampleConfig, "hi!");
 *
 * // Setting a property automatically causes a synchronous save.
 * config.example = "Goodbye World!";
 * ```
 */
export class ProviderConfig {
    static configPath = join(Deno.cwd(), 'config');

    /**
     * Internally used to keep track of whether a save/load is currently in progress.
     */
    private shouldSave = false;

    constructor(protected savePath: string) {
        return new Proxy(this, {
            set: (target, prop, value) => {
                target[prop as keyof typeof target] = value;
                if (prop === 'shouldSave') return true;
                if (target.shouldSave) target.save();
                return true;
            },
        });
    }

    /**
     * Save the config to disk at the path specified by `savePath`.
     * This is automatically called every time a property is set.
     */
    public save(): void {
        this.shouldSave = false;
        const copy = structuredClone(this);
        Reflect.deleteProperty(copy, 'savePath');
        Reflect.deleteProperty(copy, 'shouldSave');

        const savePath = this.getSavePath();

        // ensure config folder exists
        Deno.mkdirSync(ProviderConfig.configPath, { recursive: true });
        Deno.writeTextFileSync(savePath, JSON.stringify(copy));
        this.shouldSave = true;
    }

    private getSavePath(): string {
        return join(ProviderConfig.configPath, this.savePath);
    }

    /**
     * Load the config from disk, or create a new one if it doesn't exist.
     *
     * Constructing a config class directly without going through `load` will lead to unexpected behaviour.
     * @param savePath Path to load config from
     * @param constructor Config class to construct
     */
    public static async load<
        T extends ProviderConfig,
        // deno-lint-ignore no-explicit-any
        C extends new (...args: any[]) => T,
        P extends ConstructorParameters<C>,
    >(constructor: C, ...args: P): Promise<InstanceType<C>> {
        const config = new constructor(...args) as InstanceType<C>;
        config.shouldSave = false;

        try {
            const savePath = config.getSavePath();

            const json = JSON.parse(await Deno.readTextFile(savePath));

            for (const [key, value] of Object.entries(json)) {
                Reflect.set(config as object, key, value);
            }

            config.shouldSave = true;

            return config;
        } catch (error) {
            // file doesn't exist or old JSON is corruped; we wanna create a new config instead.
            console.warn(`Error loading config for ${constructor.name}: ${error}. Using defaults instead.`);
            config.shouldSave = true;
            return config;
        }
    }
}


class TestConfig extends ProviderConfig {
    public test = 'Hello, world!';
    public unchanged = 'unchanged';

    constructor() {
        super('test.json');
    }
}

Deno.test({
    name: 'ProviderConfig: save',
    fn: async () => {
        const config = await ProviderConfig.load(TestConfig);

        config.test = "tested";

        // @ts-expect-error accessing private method for testing reasons
        const configPath = config.getSavePath();
        
        const configFile = JSON.parse(await Deno.readTextFile(configPath));

        assertEquals(configFile.savePath, undefined);
        assertEquals(configFile.test, 'tested', 'value in config file does not reflect changed value.');
        assertEquals(configFile.unchanged, 'unchanged', 'value in config file does not reflect unchanged value.');

        // cleanup
        await Deno.remove(configPath);
    },
});

Deno.test({
    name: 'ProviderConfig: load',
    fn: async () => {
        const exampleConfig = {
            test: "tested",
        };

        const configPath = join(ProviderConfig.configPath, 'test.json');
        await Deno.writeTextFile(configPath, JSON.stringify(exampleConfig));

        const config = await ProviderConfig.load(TestConfig);

        assertEquals(config.test, exampleConfig.test, "property with default value not overwritten by config file.");
        assertEquals(config.unchanged, 'unchanged', "property that's not part of the config file changed.");

        await Deno.remove(configPath);
    }
});

Deno.test({
    name: 'ProviderConfig: construct with additional arguments',
    fn: async () => {
        class TestConfig extends ProviderConfig {
            constructor(public readonly thing: number) {
                super("test.json");
            }
        }

        // @ts-expect-error should give a compile error for wrong/missing constructor arguments
        await ProviderConfig.load(TestConfig);
        // @ts-expect-error should give a compile error for wrong/missing constructor arguments
        await ProviderConfig.load(TestConfig, "hello, world!");

        const config = await ProviderConfig.load(TestConfig, 1);
        assertEquals(config.thing, 1, "argument not passed to constructor.");
    }
});