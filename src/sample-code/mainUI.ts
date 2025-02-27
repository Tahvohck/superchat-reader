import { WebUI } from 'https://deno.land/x/webui@2.5.3/mod.ts';
import UISnippets from '@app/UISnippets/dir.ts';
import { ConfigurationBuilder, getRegisteredElement } from '@app/ConfigurationBuilder.ts';


let mainWindowHtml = await (await UISnippets.load('index.html')).text()
const mainWindowCss = await (await UISnippets.load('index.css')).text()
const builderScript = await (await UISnippets.load('config-custom-elements.html')).text()

mainWindowHtml = mainWindowHtml.replace(/\s*css-builtin {.*?}/, mainWindowCss)
mainWindowHtml = mainWindowHtml.replace(/<script-config-builder \/>/, builderScript)

const mainWindow = new WebUI()
mainWindow.bind("getRegisteredElement", ({ arg }) => {
    return getRegisteredElement(arg.string(0))
})

const cb = new ConfigurationBuilder();
cb.addButton('click here to boop', () => {
    console.log('BOOP');
}).addCheckbox('check', (newVal) => {
    console.log(newVal);
}).addSlider('slider', 0, 10, 1, undefined, (newVal) => {
    console.log(newVal);
}).addTextBox('Type here!', 'pls', (str) => {
    console.log(str);
});

mainWindowHtml = mainWindowHtml.replace("<config />", cb.build())
cb.bind(mainWindow)

mainWindow.setSize(800, 400)
await mainWindow.show(mainWindowHtml)

await WebUI.wait()