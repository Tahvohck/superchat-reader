let unShadowedStyleSheet
document.addEventListener("DOMContentLoaded", () => {
    unShadowedStyleSheet = document.getElementById("config-styles")
    customElements.define("config-button", ConfigBuilderButton)
    customElements.define("config-checkbox", ConfigBuilderCheckbox)
    customElements.define("config-slider", ConfigBuilderSlider)
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
        const shadow = this.attachShadow({mode: "closed"})
        const style = new CSSStyleSheet()
        for (const rule of unShadowedStyleSheet.sheet.cssRules) {
            style.insertRule(rule.cssText)
        }
        shadow.adoptedStyleSheets = [style]

        // Now set up the custom element
        const {uuid, label} = getMultipleAttributes(this, "uuid", "label")
        const button = document.createElement("button")

        button.innerText = label
        button.setAttribute("id", uuid)
        button.addEventListener('click', globalThis[uuid])
        shadow.appendChild(button)
    }
}

class ConfigBuilderCheckbox extends HTMLElement {
    connectedCallback() {
        // get the shadow root prepared with styles
        const shadow = this.attachShadow({mode: "closed"})
        const style = new CSSStyleSheet()
        for (const rule of unShadowedStyleSheet.sheet.cssRules) {
            style.insertRule(rule.cssText)
        }
        shadow.adoptedStyleSheets = [style]

        // Now set up the custom element
        const {uuid, value} = getMultipleAttributes(this, "uuid", "value")
        const text = this.getAttribute("label")
        if (!uuid) {
            throw new Error("Custom checkbox must have a UUID")
        }
        const label = document.createElement("label")
        const checkbox = document.createElement("input")

        // Set up label
        label.setAttribute("for", uuid)
        label.innerText = text
        
        // Set up checkbox
        checkbox.type = "checkbox"
        checkbox.classList += " checkbox"
        checkbox.id = uuid
        checkbox.checked = value == "true"
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
        const shadow = this.attachShadow({mode: "closed"})
        const style = new CSSStyleSheet()
        for (const rule of unShadowedStyleSheet.sheet.cssRules) {
            style.insertRule(rule.cssText)
        }
        shadow.adoptedStyleSheets = [style]

        // Now set up the custom element
        const {
            uuid, label: labelText,
            min, max, step, value
        } = getMultipleAttributes(this, "uuid", "label", "min", "max", "step", "value")

        if (!uuid) {
            throw new Error("Custom slider must have a UUID")
        }
        const preLabel = document.createElement("label")
        const slider = document.createElement("input")
        const valLabel = document.createElement("label")

        // Text label setup
        preLabel.setAttribute("for", uuid)
        preLabel.innerText = labelText ?? "NO LABEL"

        // Slider setup
        slider.type = "range"
        slider.classList += "slider"
        slider.min = min
        slider.max = max
        slider.step = step
        slider.setAttribute("value", value)
        slider.addEventListener('input', () => {
            valLabel.innerText = slider.value
            globalThis[`slider_${uuid}`](slider.value)
        })

        // Value label setup
        valLabel.setAttribute("for", uuid)
        valLabel.innerText = value
        valLabel.classList += " slider-display"

        // Add child nodes
        shadow.appendChild(preLabel)
        shadow.appendChild(valLabel)
        shadow.appendChild(slider)
    }
}
