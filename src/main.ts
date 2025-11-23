import { DemoProvider } from '@app/chat_providers/Demo.ts';
import { YouTubeProvider } from '@app/chat_providers/youtube/YouTubeProvider.ts';
import { ProviderManager } from '@app/ProviderManager.ts';
import { loadCCCache } from '@app/CurrencyConversion.ts';
import { getProgramConfig } from '@app/MainConfig.ts';
import { donationMessageToString } from './DonationProvider.ts';

await loadCCCache();

const manager = new ProviderManager();
const config = await getProgramConfig();

await manager.init();

if (config.debug) {
    await manager.register(new DemoProvider());
} else {
    await manager.register(new YouTubeProvider());
}

const messageCap = 10;

console.log(`Printing ${messageCap} total debug messages.`);

console.log('---------------- DEBUG MESSAGES ----------------');

let i = 0;
manager.on('message', async (message) => {
    console.log(donationMessageToString(message));
    if (++i >= messageCap) {
        await manager.destroy();
        console.log('----------------- END OF DEBUG -----------------');
    }
});

await manager.startEnabled();
