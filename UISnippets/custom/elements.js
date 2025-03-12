let unShadowedStyleSheet
document.addEventListener('DOMContentLoaded', () => {
    unShadowedStyleSheet = document.getElementById('config-styles')
    customElements.define('config-button', ConfigBuilderButton)
    customElements.define('config-checkbox', ConfigBuilderCheckbox)
    customElements.define('config-slider', ConfigBuilderSlider)
    customElements.define('config-textbox', ConfigBuilderTextbox)
})

/**
    * @param { HTMLElement } element
    * @param { string[] } attributes
    * @returns { Record<string, string | null> }
    */
function getMultipleAttributes(element, ...attributes) {
    const out = {};
    for (const attribute of attributes) {
        out[attribute] = element.getAttribute(attribute)
    }
    return out;
}

class ConfigBuilderButton extends HTMLElement {
    connectedCallback() {
        // get the shadow root prepared with styles
        const shadow = this.attachShadow({mode: 'closed'})
        const style = new CSSStyleSheet()
        for (const rule of unShadowedStyleSheet.sheet.cssRules) {
            style.insertRule(rule.cssText)
        }
        shadow.adoptedStyleSheets = [style]

        // Now set up the custom element
        const {uuid, label} = getMultipleAttributes(this, 'uuid', 'label')
        const button = document.createElement('button')

        button.innerText = label
        button.setAttribute('id', uuid)
        button.addEventListener('click', globalThis[uuid])
        shadow.appendChild(button)
    }
}

class ConfigBuilderCheckbox extends HTMLElement {
    connectedCallback() {
        // get the shadow root prepared with styles
        const shadow = this.attachShadow({mode: 'closed'})
        const style = new CSSStyleSheet()
        for (const rule of unShadowedStyleSheet.sheet.cssRules) {
            style.insertRule(rule.cssText)
        }
        shadow.adoptedStyleSheets = [style]

        // Now set up the custom element
        const {uuid, value} = getMultipleAttributes(this, 'uuid', 'value')
        const text = this.getAttribute('label')
        if (!uuid) {
            throw new Error('Custom checkbox must have a UUID')
        }
        const label = document.createElement('label')
        const checkbox = document.createElement('input')

        // Set up label
        label.setAttribute('for', uuid)
        label.innerText = text
        
        // Set up checkbox
        checkbox.type = 'checkbox'
        checkbox.classList += ' checkbox'
        checkbox.id = uuid
        checkbox.checked = value == 'true'
        checkbox.addEventListener('input', () => {
            globalThis[`checked_${uuid}`](checkbox.checked)
        })

        // Add child nodes
        shadow.appendChild(label)
        shadow.appendChild(checkbox)
    }
}

class ConfigBuilderSlider extends HTMLElement{
    connectedCallback() {
        // get the shadow root prepared with styles
        const shadow = this.attachShadow({mode: 'closed'})
        const style = new CSSStyleSheet()
        for (const rule of unShadowedStyleSheet.sheet.cssRules) {
            style.insertRule(rule.cssText)
        }
        shadow.adoptedStyleSheets = [style]

        // Now set up the custom element
        const {
            uuid, label: labelText,
            min, max, step, value
        } = getMultipleAttributes(this, 'uuid', 'label', 'min', 'max', 'step', 'value')

        if (!uuid) {
            throw new Error('Custom slider must have a UUID')
        }
        const preLabel = document.createElement('label')
        const slider = document.createElement('input')
        const valLabel = document.createElement('label')

        // Text label setup
        preLabel.setAttribute('for', uuid)
        preLabel.innerText = labelText ?? 'NO LABEL'

        // Slider setup
        slider.type = 'range'
        slider.classList += 'slider'
        slider.min = min
        slider.max = max
        slider.step = step
        slider.setAttribute('value', value)
        slider.addEventListener('input', () => {
            valLabel.innerText = slider.value
            globalThis[`slider_${uuid}`](slider.value)
        })

        // Value label setup
        valLabel.setAttribute('for', uuid)
        valLabel.innerText = value
        valLabel.classList += ' slider-display'

        // Add child nodes
        shadow.appendChild(preLabel)
        shadow.appendChild(valLabel)
        shadow.appendChild(slider)
    }
}

class ConfigBuilderTextbox extends HTMLElement {
    connectedCallback() {
        // get the shadow root prepared with styles
        const shadow = this.attachShadow({mode: 'closed'})
        const style = new CSSStyleSheet()
        for (const rule of unShadowedStyleSheet.sheet.cssRules) {
            style.insertRule(rule.cssText)
        }
        shadow.adoptedStyleSheets = [style]
        const {
            uuid, label, value, placeholder, type
        } = getMultipleAttributes(this, 'uuid', 'label', 'value', 'placeholder', 'type');

        if (!uuid) {
            throw new Error('Custom textbox must have a UUID')
        }

        const labelElement = document.createElement('label');
        labelElement.htmlFor = uuid;
        labelElement.innerText = label;

        const input = document.createElement('input');
        input.setAttribute('value', value);
        input.placeholder = placeholder;
        input.type = type;


        let timeout;
        let lastKey = 'Enter';
        const submit = () => {
            globalThis[`textbox_${uuid}`](input.value)
            lastKey = 'Enter';
        };

        // we don't want to spam the backend with potential save-triggers
        // so we wait for after the user has stopped typing for a while to actually send the current value.
        input.addEventListener('input', ev => {
            clearTimeout(timeout);
            timeout = setTimeout(submit, 250);
        });

        // if the user instead hits enter (to signal they're done), we manually submit immediately and
        // clear our timeout.
        const ignoreKeys = [
            'ArrowLeft',
            'ArrowRight',
            'ArrowDown',
            'ArrowUp',
            'Alt',
            'Shift',
            'Control',
        ]
        input.addEventListener('keydown', ev => {
            // ignore various control keys
            if (ignoreKeys.includes(ev.key)) {
                return
            }
            // submit if key was enter and last noticed key wasn't also enter (prevents spamming)
            if (ev.key === 'Enter' && lastKey != ev.key) {
                clearTimeout(timeout);
                submit()
            }
            // don't set last key if it doesn't match the input box type
            if (!(/\d/.test(ev.key)) && type === 'number') {
                return
            }
            lastKey = ev.key
        });
        
        shadow.appendChild(labelElement);
        shadow.appendChild(input);
    }
}
