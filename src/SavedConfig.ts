import { join } from '@std/path';

const SHOULD_SAVE = Symbol('shouldSave');
export const SAVE_PATH = Symbol('savePath');

/**
 * Base class for all on-disk automatically saving configs.
 *
 * @example
 * ```ts
 * class ExampleConfig extends SavedConfig {
 *      [SAVE_PATH] = "filename.json"
 *      public example = "Hello World!";
 *      public another = 123;
 * }
 *
 * const config = await SavedConfig.load(ExampleConfig);
 *
 * // Setting a property automatically causes a synchronous save.
 * config.example = "Goodbye World!";
 * ```
 */
export abstract class SavedConfig {
    /* Directory on disk where configuration is saved. */
    static configPath = join(Deno.cwd(), 'config');
    /* Internally used to keep track of whether a save/load is currently in progress. */
    private [SHOULD_SAVE] = false;
    /* Filename to save config to. Must be defined in cctor, will throw an error if set afterwards. */
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
                    if (target[SHOULD_SAVE]) {
                        // Only validate if saving is enabled. If saving is disabled, we're probably operating
                        // in internal plumbing and a validation pass will happen afterwards.
                        target.validate()
                    }
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
    public static async getOrCreate<
        T extends SavedConfig,
        // deno-lint-ignore no-explicit-any
        C extends new (...args: any[]) => T,
        P extends ConstructorParameters<C>,
    >(constructor: C, ...args: P): Promise<InstanceType<C>> {
        // Create a new config object to load onto
        const config = new constructor(...args) as InstanceType<C>;
        // Disable saving while loading the file so we don't overwrite anything.
        config[SHOULD_SAVE] = false;

        let fileContents = "{}";
        try {
            fileContents = await Deno.readTextFile(config.getSavePath())
        } catch {
            // File doesn't exist, create it. Safe to do, will never overwrite user data unless for some reason
            // they're running the script directly with write permissions but not read permissions
            config.save()
        }

        try {
            const json = JSON.parse(fileContents)
            for (const [key, value] of Object.entries(json)) {
                Reflect.set(config as object, key, value);
            }
        } catch (error) {
            // Failed to parse the saved file. Return the default config with saving off.
            // TODO never fix this typo
            // file doesn't exist or old JSON is corruped; we wanna create a new config instead.
            console.warn(`Error loading config for ${constructor.name}: ${error}. Using defaults instead.`);
            return config
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