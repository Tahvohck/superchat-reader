import { DemoProvider } from '@app/chat_providers/Demo.ts';
import { YouTubeFactory } from '@app/chat_providers/youtube/YouTubeProvider.ts';
import { ProviderManager } from '@app/ProviderManager.ts';
import { loadCCCache } from '@app/CurrencyConversion.ts';
import { getProgramConfig } from '@app/MainConfig.ts';
import { donationMessageToString } from './DonationProvider.ts';

await loadCCCache();

const manager = new ProviderManager();
const config = await getProgramConfig();

await manager.init();

if (config.debug) {
    manager.register(new DemoProvider());
} else {
    manager.register(new YouTubeFactory());
}

const messageCap = 10;

console.log(`Printing ${messageCap} total debug messages.`);

console.log('---------------- DEBUG MESSAGES ----------------');

const stream = manager.getStream();

let i = 0;
stream.on('message', (message) => {
    console.log(donationMessageToString(message));

    if (++i >= messageCap) {
        stream.abort();
    }
});

stream.on('aborted', () => {
    console.log('\nDone.');
});

await stream.start();
