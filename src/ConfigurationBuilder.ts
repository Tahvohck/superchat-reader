import { crypto } from '@std/crypto/crypto';
import UISnippets from '@app/UISnippets/dir.ts';
import { WebUI } from 'https://deno.land/x/webui@2.5.3/mod.ts';

// TODO: rework how passed options are merged with defaults. This should also include some validation (maybe with zod?).

export class ConfigurationBuilder {
    private elements: ConfigElementBase[] = [];

    /**
     * Adds a checkbox to the configuration panel.
     * @param label The text to display next to the checkbox
     * @param callback A function to be called when the value changes
     */
    addCheckbox(label: string, options: CheckboxOptions): this {
        this.elements.push(new ConfigCheckbox(label, options));
        return this;
    }

    /**
     * Add a slider with min and max values to the configuration panel
     * @param label The text to display next to the slider
     * @param min Minimum value
     * @param max Maximum value
     * @param callback The function to call when the value changes
     */
    addSlider(label: string, options: SliderOptions): this {
        this.elements.push(new ConfigSlider(label, options));
        return this;
    }

    /**
     * Add a textboxt to the configuration panel, where the user can input any text
     * TODO: Probably make validate just a regex
     * @param label The text to display next to the textbox
     * @param defaultVal The default value of the textbox
     * @param callback The function to call when the value changes, after validation
     * @param validate The function to call when the value changes, to validate the new value
     */
    addTextBox(label: string, options: Omit<StringboxOptions, 'type'>): this {
        this.elements.push(new ConfigTextBox(label, { ...options, type: 'text' }));
        return this;
    }

    /**
     * Add a textboxt to the configuration panel, where the user can input any text
     * TODO: Probably make validate just a regex
     * @param label The text to display next to the textbox
     * @param defaultVal The default value of the textbox
     * @param callback The function to call when the value changes, after validation
     * @param validate The function to call when the value changes, to validate the new value
     */
    addNumberBox(label: string, options: Omit<NumberboxOptions, 'type'>): this {
        this.elements.push(new ConfigTextBox(label, { ...options, type: 'number' }));
        return this;
    }

    /**
     * Add a clickable button to the configuration panel
     * @param label The text to display on the button
     * @param callback The function to call when the button is clicked
     */
    addButton(label: string, options: ButtonOptions): this {
        this.elements.push(new ConfigButton(label, options));
        return this;
    }

    /**
     * Build the configuration panel for display
     * @returns An HTML string for rendering
     */
    render(): string {
        let content = '<div>';
        for (const elem of this.elements) {
            const { tagName, attr } = elem.build();
            let tagStr = `<${tagName} `;
            for (const [name, value] of Object.entries(attr)) {
                tagStr += `${name}="${value}" `;
            }
            tagStr += `></${tagName}>`;
            content += tagStr;
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

// #region element interfaces
interface CheckboxOptions {
    readonly callback?: (checkState: boolean) => void;
    readonly startValue?: boolean;
}
interface SliderOptions {
    readonly callback?: (newVal: number) => void;
    readonly range?: [number, number];
    readonly step?: number;
    readonly startValue?: number;
}

type InputBoxOptionsBase = {
    placeholder?: string;
};

interface StringboxOptions extends InputBoxOptionsBase {
    callback?: (value: string) => void;
    type?: 'text';
    startValue?: string;
}

interface NumberboxOptions extends InputBoxOptionsBase {
    callback?: (value: number) => void;
    type: 'number';
    startValue?: number;
}

type TextboxOptions = StringboxOptions | NumberboxOptions;

interface ButtonOptions {
    callback?: () => void;
}
type ElementOptions = CheckboxOptions | SliderOptions | TextboxOptions | ButtonOptions;
// #endregion

type BuildReturnType = { tagName: string; attr: Record<string, string | number | boolean> };
/** Items that all elements in the configuration panel share */
abstract class ConfigElementBase {
    /** Unique ID to assign to webUI bindings */
    readonly callbackIdentifier;
    abstract options: ElementOptions;

    /**
     * @param label Element label, typically displayed next to the element
     * @param replaceObject Map of key-value pairs to replace inside the snippet. {label} and {callbackID} are
     * automatically provided.
     */
    constructor(readonly label: string) {
        this.callbackIdentifier = crypto.randomUUID().replaceAll('-', '_');
    }

    /** Render the element to tag metadata */
    abstract build(): BuildReturnType;
    abstract bind(wui: WebUI): void;
}

// #region Configuration Elements
/** Dynamically handled checkbox for configuration */
class ConfigCheckbox extends ConfigElementBase {
    readonly options: Required<CheckboxOptions> = {
        startValue: false,
        callback: console.log,
    };

    constructor(label: string, options: CheckboxOptions) {
        super(label);
        Object.assign(this.options, options);
    }

    build(): BuildReturnType {
        return {
            tagName: 'config-checkbox',
            attr: {
                label: this.label,
                uuid: this.callbackIdentifier,
            },
        };
    }

    bind(wui: WebUI): void {
        wui.bind(`checked_${this.callbackIdentifier}`, ({ arg }) => {
            const checkStatus = arg.boolean(0);
            this.options.callback(checkStatus);
        });
    }
}

/** Dynamically handled slider for configuration */
class ConfigSlider extends ConfigElementBase {
    readonly options: Required<SliderOptions> = {
        callback: console.log,
        range: [0, 10],
        step: 1,
        startValue: 5,
    };

    constructor(label: string, options: SliderOptions) {
        super(label);
        Object.assign(this.options, options);
        const [min, max] = this.options.range;
        if (min >= max) {
            throw new Deno.errors.InvalidData(`Min must be less than max [${min} !< ${max}]`);
        }
    }

    build(): BuildReturnType {
        return {
            tagName: 'config-slider',
            attr: {
                label: this.label,
                uuid: this.callbackIdentifier,
                min: this.options.range[0],
                max: this.options.range[1],
                step: this.options.step,
                startValue: this.options.startValue,
            },
        };
    }

    bind(wui: WebUI): void {
        wui.bind(`slider_${this.callbackIdentifier}`, ({ arg }) => {
            const value = arg.number(0);
            this.options.callback(value);
        });
    }
}

/** Dynamically handled textbox for configuration */
class ConfigTextBox extends ConfigElementBase {
    readonly options: TextboxOptions = {
        callback: console.log,
        type: 'text',
    };

    constructor(label: string, options: TextboxOptions) {
        super(label);
        Object.assign(this.options, options);
    }

    build(): BuildReturnType {
        return {
            tagName: 'config-textbox',
            attr: {
                label: this.label,
                uuid: this.callbackIdentifier,
                value: this.options.startValue ?? '',
                placeholder: this.options.placeholder ?? '',
                type: this.options.type ?? 'text',
            },
        };
    }

    bind(wui: WebUI): void {
        wui.bind(`textbox_${this.callbackIdentifier}`, ({ arg }) => {
            if (this.options.type === 'number') {
                this.options.callback?.(arg.number(0));
            } else {
                this.options.callback?.(arg.string(0));
            }
        });
    }
}

/** Dynamically handled button for configuration */
class ConfigButton extends ConfigElementBase {
    override readonly options: Required<ButtonOptions> = {
        callback: () => {
            console.log(`Boop ${this.callbackIdentifier}`);
        },
    };

    constructor(label: string, options: ButtonOptions) {
        super(label);
        Object.assign(this.options, options);
    }

    build() {
        return {
            tagName: 'config-button',
            attr: {
                uuid: this.callbackIdentifier,
                label: this.label,
            },
        };
    }

    bind(wui: WebUI): void {
        wui.bind(this.callbackIdentifier, this.options.callback);
    }
}
// #endregion

if (import.meta.main) {
    const cb = new ConfigurationBuilder();
    const win = new WebUI();
    const builderScript = await (await UISnippets.load('config-custom-elements.html')).text();

    cb.addButton('click here to boop', {})
        .addCheckbox('check', {})
        .addSlider('slider', {
            range: [2, 20],
            startValue: 12,
            step: 2,
        })
        .addTextBox('Type here!', {})
        .addNumberBox('Number here!', {})
        .addButton('Click to exit', {
            callback: () => {
                win.close();
            },
        });

    const html = `<html>
            <body>
                ${cb.render()}
                ${builderScript}
                <script src="webui.js" defer></script>
            </body>
        </html>`;
    cb.bind(win);
    // We don't care about errors
    win.show(html).catch(() => {});

    await WebUI.wait();
    console.log('exit program');
}
