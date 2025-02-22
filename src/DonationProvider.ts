import { CurrencyCodeRecord } from 'currency-codes';
import { LocallyCachedImage } from '@/ImageCache.ts';
import * as path from '@std/path';
import { crypto } from '@std/crypto/crypto';
import UISnippets from '@/UISnippets/dir.ts';
import { WebUI } from 'https://deno.land/x/webui@2.5.3/mod.ts';

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
    configure(cb: ConfigurationBuilder): void;
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
    private elements: ConfigElementBase[] = [];

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
    addSlider(
        label: string,
        min: number,
        max: number,
        step = 1,
        defaultVal: number | null = null,
        callback: (newValue: number) => void,
    ) {
        this.elements.push(new ConfigSlider(label, min, max, step, defaultVal, callback));
    }

    /**
     * Add a textboxt to the configuration panel, where the user can input any text
     * TODO: Probably make validate just a regex
     * @param label The text to display next to the textbox
     * @param defaultVal The default value of the textbox
     * @param callback The function to call when the value changes, after validation
     * @param validate The function to call when the value changes, to validate the new value
     */
    addTextBox(
        label: string,
        defaultVal: string,
        callback: (newValue: string) => void,
        validate: (newValue: string) => string = (v) => v,
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

    bind(wui: WebUI): void {
        for (const elem of this.elements) {
            elem.bind(wui);
        }
    }
}

/** Possible types of configuration elements */
enum ConfigTypes {
    base = 'base',
    checkbox = 'checkbox',
    slider = 'slider',
    textbox = 'textbox',
    button = 'button',
}

const CheckboxHtmlSnippet = await (await UISnippets.load('checkbox.html')).text();
const ButtonHtmlSnippet = await (await UISnippets.load('button.html')).text();
const SliderHtmlSnippet = await (await UISnippets.load('slider.html')).text();
const TextboxHtmlSnippet = await (await UISnippets.load('textbox.html')).text();

/** Items that all elements in the configuration panel share */
abstract class ConfigElementBase {
    /** Element type */
    abstract readonly type: ConfigTypes;
    abstract readonly snippet: string
    readonly replacementKeys: { [x: string]: string | number };
    readonly replacementRegex: RegExp;
    /** Unique ID to assign to webUI bindings */
    readonly callbackIdentifier;
    /** Function to be called when the element is interacted with */
    // deno-lint-ignore ban-types
    abstract readonly callback: Function;

    /**
     * @param label Element label, typically displayed next to the element
     * @param replaceObject
     */
    constructor(label: string, replaceObject: { [x: string]: string | number } = {}) {
        this.callbackIdentifier = crypto.randomUUID().replaceAll('-', '_');
        replaceObject['callbackID'] = this.callbackIdentifier;
        replaceObject['label'] = label;
        this.replacementKeys = replaceObject;
        const innerRegex = Object.keys(this.replacementKeys).join('|');
        this.replacementRegex = new RegExp(`{(${innerRegex})}`, 'gi');
    }

    /** Render the element to HTML */
    render(): string {
        return this.snippet.replaceAll(this.replacementRegex, (str) => {
            str = str.replaceAll(/[{}]/g, '');
            return String(this.replacementKeys[str]!);
        });
    }

    abstract bind(wui: WebUI): void;
}

/** Dynamically handled checkbox for configuration */
export class ConfigCheckbox extends ConfigElementBase {
    type = ConfigTypes.checkbox;
    snippet = CheckboxHtmlSnippet;

    constructor(label: string, readonly callback: (newValue: boolean) => void) {
        super(label);
    }

    bind(wui: WebUI): void {
        wui.bind(`checked_${this.callbackIdentifier}`, ({ arg }) => {
            const checkStatus = arg.boolean(0);
            this.callback(checkStatus);
        });
    }
}

/** Dynamically handled slider for configuration */
export class ConfigSlider extends ConfigElementBase {
    type = ConfigTypes.slider;
    snippet = SliderHtmlSnippet;

    constructor(
        label: string,
        readonly min: number,
        readonly max: number,
        readonly step: number,
        readonly defaultVal: number | null,
        readonly callback: (newValue: number) => void,
    ) {
        if (min >= max) {
            throw new Deno.errors.InvalidData(`Min must be less than max [${min} !< ${max}]`);
        }
        if (!defaultVal) {
            defaultVal = min;
        }
        super(label, { min, max, step, defaultVal });
    }

    bind(wui: WebUI): void {
        wui.bind(`slider_${this.callbackIdentifier}`, ({ arg }) => {
            const value = arg.number(0);
            this.callback(value);
        });
    }
}

/** Dynamically handled textbox for configuration */
export class ConfigTextBox extends ConfigElementBase {
    type = ConfigTypes.textbox;
    snippet = TextboxHtmlSnippet;

    constructor(
        label: string,
        readonly defaultVal: string,
        readonly callback: (newValue: string) => void,
        readonly validate: (newValue: string) => string,
    ) {
        super(label, {
            defaultVal,
        });
    }

    bind(wui: WebUI): void {
        wui.bind(`textbox_${this.callbackIdentifier}`, ({ arg }) => {
            this.callback(arg.string(0));
        });
    }
}

/** Dynamically handled button for configuration */
export class ConfigButton extends ConfigElementBase {
    override type = ConfigTypes.button;
    snippet = ButtonHtmlSnippet;

    constructor(label: string, readonly callback: () => void) {
        super(label);
    }

    bind(wui: WebUI): void {
        wui.bind(this.callbackIdentifier, this.callback);
    }
}

if (import.meta.main) {
    const cb = new ConfigurationBuilder();
    cb.addButton('click here to boop', () => {
        console.log('BOOP');
    });
    cb.addCheckbox('check', (newVal) => {
        console.log(newVal);
    });
    cb.addSlider('slider', 0, 10, 1, undefined, (newVal) => {
        console.log(newVal);
    });
    cb.addTextBox('Type here!', 'pls', (str) => {
        console.log(str);
    });
    const win = new WebUI();
    const html = `<html><head><script src="webui.js"></script></head>
            <body>
                ${cb.build()}
            </body>
        </html>`;
    cb.bind(win);
    // We don't care about errors
    win.show(html).catch(() => {});

    await WebUI.wait();
}
