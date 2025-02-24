import { DemoProvider } from '@app/chat_providers/Demo.ts';
import { donationMessageToString } from '@app/DonationProvider.ts';
import { convertCurrency, loadCCCache } from '@app/CurrencyConversion.ts';
import { code } from 'currency-codes';

await loadCCCache()
const usdToPhp = convertCurrency(1, code('USD'), code('PHP'))

console.log(`1 USD is ${usdToPhp} PHP`);

const prov = new DemoProvider();
await prov.activate();
setTimeout(() => {
    prov.deactivate();
}, 5000);

for await (const m of prov.process()) {
    console.log(`${donationMessageToString(m)}`);
}

console.log('Program complete');
