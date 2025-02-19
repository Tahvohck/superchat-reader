import { CurrencyCodeRecord } from 'currency-codes';
import { LocallyCachedImage } from '@/ImageCache.ts';
import * as path from '@std/path';
import { crypto } from '@std/crypto/crypto';
import UISnippets from '@/UISnippets/dir.ts'
import { WebUI } from "https://deno.land/x/webui@2.5.3/mod.ts";

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
    configure(cb: ConfigurationBuilder): ConfigurationBuilder;
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
            },
        });
    }

    /**
     * Save the config to disk at the path specified by `savePath`.
     * This is automatically called every time a property is set.
     */
    public save(): void {
        const copy = structuredClone(this);
        Reflect.deleteProperty(copy, 'savePath');

        const savePath = path.join(Deno.cwd(), 'config', this.savePath);

        // ensure config folder exists
        Deno.mkdirSync(path.join(Deno.cwd(), 'config'));
        Deno.writeTextFileSync(savePath, JSON.stringify(copy));
    }

    /**
     * Load the config from disk at the path specified by `savePath`.
     *
     * Constructing a config class directly without going through `load` will lead to unexpected behaviour.
     * @param savePath Path to load config from
     * @param constructor Config class to construct
     */
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

//TODO: Probably this is complex enough that it should be moved to its own file
export class ConfigurationBuilder {
    private elements: (ConfigElement | ConfigElementBase)[] = [];

    /**
     * Adds a checkbox to the configuration panel.
     * @param label The text to display next to the checkbox
     * @param callback A function to be called when the value changes
     */
    addCheckbox(label: string, callback: (newValue: boolean) => void) {
        this.elements.push(new ConfigCheckbox(label, callback));
    }

    /**
     * Add a slider with min and max values to the configuration panel
     * @param label The text to display next to the slider
     * @param min Minimum value
     * @param max Maximum value
     * @param callback The function to call when the value changes
     */
    addSlider(label: string, min: number, max: number, callback: (newValue: number) => void) {
        this.elements.push(new ConfigSlider(label, min, max, callback));
    }

    /**
     * Add a textboxt to the configuration panel, where the user can input any text
     * TODO: Probably make validate just a regex
     * @param label The text to display next to the textbox
     * @param defaultVal The default value of the textbox
     * @param callback The function to call when the value changes, after validation
     * @param validate The function to call when the value changes, to validate the new value
     */
    addTextBox<T extends string | number>(
        label: string,
        defaultVal: T,
        callback: (newValue: T) => void,
        validate: (vewValue: T) => T,
    ) {
        this.elements.push(new ConfigTextBox(label, defaultVal, callback, validate));
    }

    /**
     * Add a clickable button to the configuration panel
     * @param label The text to display on the button
     * @param callback The function to call when the button is clicked
     */
    addButton(label: string, callback: () => void) {
        this.elements.push(new ConfigButton(label, callback));
    }

    /**
     * Build the configuration panel for display
     * @returns An HTML string for rendering
     */
    build(): string {
        let content = '<div>';
        for (const elem of this.elements) {
            content += elem.render();
        }
        content += '</div>';

        return content;
    }
}

/** Items that all elements in the configuration panel share */
interface ConfigElement {
    /** Element type */
    readonly type: ConfigTypes;
    /** Element label, typically displayed next to the element */
    readonly label: string;
    /** Render the element to HTML */
    render(): string;
    /** Function to be called when the element is interacted with */
    callback(...args: unknown[]): void;
    /** Unique ID to assign to webUI bindings */
    readonly callbackIdentifier: string
}

/** Possible types of configuration elements */
enum ConfigTypes {
    base = 'base',
    checkbox = 'checkbox',
    slider = 'slider',
    textbox = 'textbox',
    button = 'button',
}

const CheckboxHtmlSnippet = await (await UISnippets.load('checkbox.html')).text()
const ButtonHtmlSnippet = await (await UISnippets.load('button.html')).text()

abstract class ConfigElementBase {
    /** Element type */
    abstract readonly type: ConfigTypes
    /** Element label, typically displayed next to the element */
    readonly label
    readonly replacementKeys: {[x: string]: string};
    readonly replacementRegex: RegExp;
    /** Unique ID to assign to webUI bindings */
    readonly callbackIdentifier;
    /** Function to be called when the element is interacted with */
    callback: (...args: unknown[]) => unknown;

    // Ignore that the function isn't specific enough here, child classes will be more specific
    // deno-lint-ignore no-explicit-any
    constructor(label: string, callback: (...args: any[]) => any, replaceObject: {[x: string]: string} = {}) {
        this.label = label
        this.callback = callback
        this.callbackIdentifier = crypto.randomUUID().replaceAll("-","_")
        replaceObject['callbackID'] = this.callbackIdentifier
        replaceObject['label'] = label
        this.replacementKeys = replaceObject
        const innerRegex = Object.keys(this.replacementKeys).join("|")
        this.replacementRegex = new RegExp(`{(${innerRegex})}`, "gi")
    }

    /** Render the element to HTML */
    render(): string {
        let snippet;
        switch (this.type) {
            case ConfigTypes.base: {
                throw new Error("Base config type is not renderable!")
            }
            case ConfigTypes.checkbox: {
                snippet = CheckboxHtmlSnippet
                break
            }
            case ConfigTypes.slider: {
                throw new Error("Not yet implemented")
            }
            case ConfigTypes.textbox: {
                throw new Error("Not yet implemented")
            }
            case ConfigTypes.button: {
                snippet = ButtonHtmlSnippet
            }
        }
        return snippet.replaceAll(this.replacementRegex,
            (str) => {
                str = str.replaceAll(/[{}]/g, "")
                return this.replacementKeys[str]!
            }
        )
    }

    abstract bind(wui: WebUI): void;
}


/** Dynamically handled checkbox for configuration */
export class ConfigCheckbox implements ConfigElement {
    type = ConfigTypes.checkbox;
    readonly callbackIdentifier = crypto.randomUUID().replace("-","_")
    label;
    callback: (newVal: boolean) => void;

    constructor(label: string, callback: (newValue: boolean) => void) {
        this.label = label;
        this.callback = callback;
    }

    render(): string {
        throw new Error('Not Implemented');
    }
}

/** Dynamically handled slider for configuration */
export class ConfigSlider implements ConfigElement {
    type = ConfigTypes.slider;
    readonly callbackIdentifier = crypto.randomUUID().replace("-","_")
    label;
    min: number;
    max: number;
    callback: (newVal: number) => void;

    constructor(label: string, min: number, max: number, onchange: (newValue: number) => void) {
        if (min >= max) {
            throw new Deno.errors.InvalidData(`Min must be less than max [${min} !< ${max}]`);
        }
        this.label = label;
        this.min = min;
        this.max = max;
        this.callback = onchange;
    }

    render(): string {
        throw new Error('Not Implemented');
    }
}

/** Dynamically handled textbox for configuration */
export class ConfigTextBox<T extends string | number> implements ConfigElement {
    type = ConfigTypes.textbox;
    readonly callbackIdentifier = crypto.randomUUID().replace("-","_")
    label;
    value: T;
    callback: (newVal: T) => void;
    validate: (newVal: T) => T;

    constructor(label: string, defaultVal: T, onChange: (newValue: T) => void, validate: (newValue: T) => T) {
        this.label = label;
        this.value = defaultVal;
        this.callback = onChange;
        this.validate = validate;
    }

    render(): string {
        throw new Error('Not Implemented');
    }
}

/** Dynamically handled button for configuration */
export class ConfigButton extends ConfigElementBase {
    override type = ConfigTypes.button;
    declare callback: () => void;

    constructor(label: string, callback: () => void) {
        super(label, callback)
    }

    bind(wui: WebUI): void {
        wui.bind(this.callbackIdentifier, this.callback)
    }
}
