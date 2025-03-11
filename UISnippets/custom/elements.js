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
        button.onclick = globalThis[uuid]
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
        const toggleSwitch = document.createElement("label")

        // Set up label
        label.setAttribute("for", uuid)
        label.innerText = text

        // Set up switch
        toggleSwitch.setAttribute("for", uuid)
        
        // Set up checkbox
        checkbox.type = "checkbox"
        checkbox.classList += " checkbox"
        checkbox.id = uuid
        checkbox.checked = value == "true"
        checkbox.oninput = () => {
            globalThis[`checked_${uuid}`](checkbox.checked)
        }

        // Add child nodes
        shadow.appendChild(label)
        shadow.appendChild(checkbox)
        shadow.appendChild(toggleSwitch)
    }
}

let unShadowedStyleSheet

document.addEventListener("DOMContentLoaded", () => {
    unShadowedStyleSheet = document.getElementById("config-styles")
    customElements.define("config-button", ConfigBuilderButton)
    customElements.define("config-checkbox", ConfigBuilderCheckbox)
})