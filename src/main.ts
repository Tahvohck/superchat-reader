import { DemoProvider } from '@/chat_providers/Demo.ts';
import { donationMessageToString } from '@/DonationProvider.ts';
import { convert, loadCCCache } from '@/currency_cache.ts';
import { code } from 'currency-codes';

await loadCCCache()
const usdToPhp = convert(1, code('USD'), code('PHP'))

console.log(`1 USD is ${usdToPhp} PHP`);

const prov = new DemoProvider();
prov.activate();
setTimeout(() => {
    prov.deactivate();
}, 5000);

for await (const m of prov.process()) {
    console.log(`${donationMessageToString(m)}`);
}

console.log('Program complete');
