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
        const unShadowedStyleSheet = document.getElementById("config-button")
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

document.addEventListener("DOMContentLoaded", () => {
    customElements.define("config-button", ConfigBuilderButton)
})