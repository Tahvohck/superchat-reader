import { DemoProvider } from '@app/chat_providers/Demo.ts';
import { YouTubeDonationProvider } from '@app/chat_providers/YouTube.ts';
import { ProviderManager } from '@app/ProviderManager.ts';
import { loadCCCache } from '@app/CurrencyConversion.ts';
import { WebUI } from 'https://deno.land/x/webui@2.5.3/mod.ts';
import UISnippets from '@app/UISnippets/dir.ts';
import { ConfigurationBuilder } from '@app/ConfigurationBuilder.ts';

await loadCCCache();
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

const manager = new ProviderManager();

await manager.init();

const isProduction = Deno.env.get('NODE_ENV') === 'production';

if (!isProduction) {
    manager.register(new DemoProvider());
} else {
    manager.register(new YouTubeDonationProvider());
}

await manager.activateAll();

const messageCap = 4;

console.log(`Printing ${messageCap} total debug messages.`);

console.log('---------------- DEBUG MESSAGES ----------------');

let i = 0;
for await (const message of manager.readAll()) {
    if (i++ > messageCap) break;
    if (message.messageType !== 'text') continue;
    console.log(`${message.author}: ${message.message}`);
}

await WebUI.wait()

console.log('Program complete');
