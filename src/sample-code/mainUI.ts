// FIXME: rewrite for provider rework!
import { WebUI } from 'https://deno.land/x/webui@2.5.3/mod.ts';
import UISnippets from '@app/UISnippets/dir.ts';
import { ProviderManager } from '@app/ProviderManager.ts';
import { DemoProvider } from '@app/chat_providers/Demo.ts';
import { LocallyCachedImage } from '@app/ImageCache.ts';

let mainWindowHtml = await (await UISnippets.load('index.html')).text();
const mainWindowCss = await (await UISnippets.load('index.css')).text();
const builderScript = await (await UISnippets.load('config-custom-elements.html')).text();

mainWindowHtml = mainWindowHtml.replace(/\s*css-builtin {.*?}/, mainWindowCss);
mainWindowHtml = mainWindowHtml.replace(/<script-config-builder \/>/, builderScript);

const mainWindow = new WebUI();

const manager = new ProviderManager();
await manager.init();

const demoprov = new DemoProvider();

await manager.register(demoprov);

if (!manager.isEnabled('demo')) {
    manager.toggle('demo');
}

const democonfig = manager.getConfiguration('demo')!;

mainWindowHtml = mainWindowHtml.replace('<config />', democonfig.render());
democonfig.bind(mainWindow);

mainWindow.setSize(800, 400);
await mainWindow.show(mainWindowHtml);

const stream = manager.getStream();

stream.on('message', async (message) => {
    if (!mainWindow.isShown) return;
    if (message.messageType === 'text') {
        await mainWindow.script(`
            const container = document.querySelector("#message-container"); 
            container.innerHTML += \`<donation-text-message 
                author="${message.author}" 
                currency="${message.donationCurrency.code}" 
                amount="${message.donationAmount}"
            >
                ${message.message}
            </donation-text-message>\`;
        `);
    } else {
        await mainWindow.script(`
            const container = document.querySelector("#message-container");
            container.innerHTML += \`<donation-image-message
                author="${message.author}"
                currency="${message.donationCurrency.code}"
                amount="${message.donationAmount}"
                image="${await (message.message as LocallyCachedImage).asBase64Uri()}
            ></donation-image-message>\`
        `);
    }
});

await stream.start();

await WebUI.wait();

stream.abort();
