import { DemoProvider } from '@app/chat_providers/Demo.ts';
import { donationMessageToString } from '@app/DonationProvider.ts';
import { convertCurrency, loadCCCache } from '@app/CurrencyConversion.ts';
import { code } from 'currency-codes';
import { WebUI } from 'https://deno.land/x/webui@2.5.3/mod.ts';
import UISnippets from '@app/UISnippets/dir.ts';
import { ConfigurationBuilder } from '@app/ConfigurationBuilder.ts';

await loadCCCache()
const usdToPhp = convertCurrency(1, code('USD'), code('PHP'))

console.log(`1 USD is ${usdToPhp} PHP`);

let mainWindowHtml = await (await UISnippets.load('index.html')).text()
const mainWindowCss = await (await UISnippets.load('index.css')).text()

mainWindowHtml = mainWindowHtml.replace(/\s*css-builtin {.*?}/, mainWindowCss)


const mainWindow = new WebUI()
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

const prov = new DemoProvider();
prov.activate();
setTimeout(() => {
    prov.deactivate();
}, 5000);

for await (const m of prov.process()) {
    console.log(`${donationMessageToString(m)}`);
}

await WebUI.wait()

console.log('Program complete');
