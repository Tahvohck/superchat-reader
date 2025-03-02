import { crypto } from '@std/crypto/crypto';
import UISnippets from '@app/UISnippets/dir.ts';
import { WebUI } from 'https://deno.land/x/webui@2.5.3/mod.ts';

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
    addTextBox<T extends "text" | "number">(label: string, options: TextboxOptions<T>): this {
        this.elements.push(new ConfigTextBox(label, options));
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
            const {tagName, attr} = elem.build();
            let tagStr = `<${tagName} `
            for (const [name, value] of Object.entries(attr)) {
                tagStr += `${name}="${value}" `
            }
            tagStr += `></${tagName}>`
            content += tagStr
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
    readonly callback?: (checkState: boolean) => void
    readonly startValue?: boolean
}
interface SliderOptions {
    readonly callback?: (newVal: number) => void
    readonly range?: [number, number]
    readonly step?: number
    readonly startValue?: number
}
interface TextboxOptions<Type extends "text" | "number" = "text"> {
    callback?: Type extends "text" ? (value: string) => void : (value: number) => void;
    startValue?: string
    placeholder?: string
    type?: Type;
}
interface ButtonOptions {
    callback?: () => void
}
type ElementOptions = CheckboxOptions | SliderOptions | TextboxOptions | ButtonOptions
// #endregion

/** Items that all elements in the configuration panel share */
abstract class ConfigElementBase {
    /** Unique ID to assign to webUI bindings */
    readonly callbackIdentifier;
    /** Function to be called when the element is interacted with */
    // deno-lint-ignore no-explicit-any
    abstract readonly callback: (...args: any[]) => void;

    /**
     * @param label Element label, typically displayed next to the element
     * @param replaceObject Map of key-value pairs to replace inside the snippet. {label} and {callbackID} are
     * automatically provided.
     */
    constructor(readonly label: string) {
        this.callbackIdentifier = crypto.randomUUID().replaceAll('-', '_');
    }

    /** Render the element to tag metadata */
    abstract build(): {tagName: string, attr: Record<string, string | number | boolean>}
    abstract bind(wui: WebUI): void;
}

/** Dynamically handled checkbox for configuration */
export class ConfigCheckbox extends ConfigElementBase implements CheckboxOptions {
    readonly startValue = false;
    readonly callback = console.log;

    constructor(label: string, options: CheckboxOptions) {
        super(label);
        Object.assign(this, options)
    }

    build () {
        return {
            tagName: "config-checkbox", 
            attr: {
                label: this.label,
                uuid: this.callbackIdentifier
            }
        }
    }

    bind(wui: WebUI): void {
        wui.bind(`checked_${this.callbackIdentifier}`, ({ arg }) => {
            const checkStatus = arg.boolean(0);
            this.callback(checkStatus);
        });
    }
}

/** Dynamically handled slider for configuration */
export class ConfigSlider extends ConfigElementBase implements SliderOptions {
    readonly callback = console.log
    readonly range: [number, number] = [0, 10]
    readonly step = 1
    readonly startValue = 5

    constructor(
        label: string,
        options: SliderOptions
    ) {
        super(label);
        Object.assign(this, options)
        if (this.range[0] >= this.range[1]) {
            throw new Deno.errors.InvalidData(`Min must be less than max [${this.range[0]} !< ${this.range[1]}]`);
        }
    }

    build() {
        return {
            tagName: "config-slider",
            attr: {
                label: this.label,
                uuid: this.callbackIdentifier,
                min: this.range[0],
                max: this.range[1],
                step: this.step,
                startValue: this.startValue
            }
        }
    }

    bind(wui: WebUI): void {
        wui.bind(`slider_${this.callbackIdentifier}`, ({ arg }) => {
            const value = arg.number(0);
            this.callback(value);
        });
    }
}

/** Dynamically handled textbox for configuration */
export class ConfigTextBox<Type extends "text" | "number" = "text"> extends ConfigElementBase implements TextboxOptions<Type> {
    readonly callback: (value: string | number) => void = console.log;
    readonly startValue?: string;
    readonly placeholder?: string;
    readonly type: Type = "text" as Type;

    constructor(label: string, options: TextboxOptions<Type>) {
        super(label);
        Object.assign(this, options)
    }

    build () {
        return {
            tagName: "config-textbox",
            attr: {
                label: this.label,
                uuid: this.callbackIdentifier,
                value: this.startValue ?? "",
                placeholder: this.placeholder ?? "",
                type: this.type,
            }
        }
    }

    bind(wui: WebUI): void {
        wui.bind(`textbox_${this.callbackIdentifier}`, ({ arg }) => {
            if (this.type === "text") {
                this.callback(arg.string(0));
            } else {
                this.callback(arg.number(0));
            }
        });
    }
}

/** Dynamically handled button for configuration */
export class ConfigButton extends ConfigElementBase implements ButtonOptions {
    readonly callback = () => {console.log(`Boop ${this.callbackIdentifier}`)}

    constructor(label: string, options: ButtonOptions) {
        super(label);
        Object.assign(this, options)
    }

    build () {
        return {
            tagName: "button",
            attr: {
                id: this.callbackIdentifier
            }
        }
    }

    bind(wui: WebUI): void {
        wui.bind(this.callbackIdentifier, this.callback);
    }
}

if (import.meta.main) {
    const cb = new ConfigurationBuilder();
    const win = new WebUI();
    const builderScript = await (await UISnippets.load('config-custom-elements.html')).text()

    cb.addButton(   'click here to boop', {})
    .addCheckbox(   'check', {})
    .addSlider(     'slider', {
        range: [2, 20],
        startValue: 12,
        step: 2
    })
    .addTextBox(    'Type here!', {})
    .addButton(     'Click to exit', {
        callback: () => {
            win.close()
        }
    });

    const html = 
        `<html>
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
    console.log("exit program")
}