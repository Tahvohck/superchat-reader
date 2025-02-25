import { join } from '@std/path/join';
import { assertEquals } from '@std/assert/equals';

const SHOULD_SAVE = Symbol('shouldSave');
export const SAVE_PATH = Symbol('savePath');

/**
 * Base class for all on-disk automatically saving configs.
 *
 * @example
 * ```ts
 * class ExampleConfig extends SavedConfig {
 *      constructor(public readonly hello: string) {
 *
 *      }
 *
 *      public example = "Hello World!";
 *      public another = 123;
 * }
 *
 * const config = await SavedConfig.load(ExampleConfig, "hi!");
 *
 * // Setting a property automatically causes a synchronous save.
 * config.example = "Goodbye World!";
 * ```
 */
export abstract class SavedConfig {
    static configPath = join(Deno.cwd(), 'config');

    /**
     * Internally used to keep track of whether a save/load is currently in progress.
     */
    private [SHOULD_SAVE] = false;
    /**
     * Filename to save config to. Readonly is enforced at Proxy-set level, it must be defined at the class level.
     */
    protected abstract [SAVE_PATH]: string;

    constructor() {
        return new Proxy(this, {
            set: (target, prop, value) => {
                // Enforce CCTOR-only setting of SAVE_PATH
                if (target[SAVE_PATH] && prop == SAVE_PATH) {
                    throw new Error("Setting [SAVE_PATH] not allowed outside of cctor")
                }
                // Store the current value.
                const oldvalue = target[prop as keyof typeof target]
                try {
                    // Set the value (can't forget to do that)
                    target[prop as keyof typeof target] = value;
                    target.validate()
                } catch (e) {
                    // Validation failed. Reset to old value, print the error to the console, and return false
                    target[prop as keyof typeof target] = oldvalue
                    console.error((e as Error).message)
                    return false
                }
                // Symbol keys can't be persisted to disk, and they're used for internal state tracking as well. So we ignore them as save candidates.
                if (typeof prop === 'symbol') return true;
                if (target[SHOULD_SAVE]) target.save();
                return true;
            },
        });
    }

    /**
     * Save the config to disk at the path specified by `savePath`.
     * This is automatically called every time a property is set.
     */
    public save(): void {
        const savePath = this.getSavePath();

        // ensure config folder exists
        Deno.mkdirSync(SavedConfig.configPath, { recursive: true });
        Deno.writeTextFileSync(savePath, JSON.stringify(this, undefined, 2));
    }

    private getSavePath(): string {
        return join(SavedConfig.configPath, this[SAVE_PATH]);
    }

    /**
     * Load the config from disk, or create a new one if it doesn't exist.
     *
     * Constructing a config class directly without going through `load` will lead to unexpected behaviour.
     * @param savePath Path to load config from
     * @param constructor Config class to construct
     */
    public static async load<
        T extends SavedConfig,
        // deno-lint-ignore no-explicit-any
        C extends new (...args: any[]) => T,
        P extends ConstructorParameters<C>,
    >(constructor: C, ...args: P): Promise<InstanceType<C>> {
        // Create a new config object to load onto
        const config = new constructor(...args) as InstanceType<C>;
        const savePath = config.getSavePath();
        // Disable saving while loading the file so we don't overwrite anything.
        config[SHOULD_SAVE] = false;

        try {
            const json = JSON.parse(await Deno.readTextFile(savePath));
            for (const [key, value] of Object.entries(json)) {
                Reflect.set(config as object, key, value);
            }
        } catch (error) {
            // TODO never fix this typo
            // file doesn't exist or old JSON is corruped; we wanna create a new config instead.
            console.warn(`Error loading config for ${constructor.name}: ${error}. Using defaults instead.`);
            config.save()
        }
        config.validate()

        // We're done setting up, re-enable saving.
        config[SHOULD_SAVE] = true;
        return config;
    }

    /**
     * Check that the config file is valid. Throw an error if not.
     */
    validate() {
        // Default validate doesn't actually do anything
    }
}


class TestConfig extends SavedConfig {
    [SAVE_PATH] = 'test.json';
    public test = 'Hello, world!';
    public unchanged = 'unchanged';
}

Deno.test({
    name: 'ProviderConfig: save',
    fn: async () => {
        const config = await SavedConfig.load(TestConfig);

        config.test = 'tested';

        // @ts-expect-error accessing private method for testing reasons
        const configPath = config.getSavePath();

        const configFile = JSON.parse(await Deno.readTextFile(configPath));

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
            test: 'tested',
        };

        const configPath = join(SavedConfig.configPath, 'test.json');
        await Deno.writeTextFile(configPath, JSON.stringify(exampleConfig));

        const config = await SavedConfig.load(TestConfig);

        assertEquals(config.test, exampleConfig.test, 'property with default value not overwritten by config file.');
        assertEquals(config.unchanged, 'unchanged', "property that's not part of the config file changed.");

        await Deno.remove(configPath);
    },
});

Deno.test({
    name: 'ProviderConfig: construct with additional arguments',
    fn: async () => {
        class TestConfig extends SavedConfig {
            [SAVE_PATH] = 'test.json';
            constructor(public readonly thing: number) {
                super();
            }
        }

        // @ts-expect-error should give a compile error for wrong/missing constructor arguments
        await SavedConfig.load(TestConfig);
        // @ts-expect-error should give a compile error for wrong/missing constructor arguments
        await SavedConfig.load(TestConfig, 'hello, world!');

        const config = await SavedConfig.load(TestConfig, 1);
        assertEquals(config.thing, 1, 'argument not passed to constructor.');
    },
});