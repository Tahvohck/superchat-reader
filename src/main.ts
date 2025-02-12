import { DemoProvider } from '@/chat_providers/Demo.ts';
import { donationMessageToString } from '@/DonationProvider.ts';


const prov = new DemoProvider();
prov.activate();
setTimeout(() => {
    prov.deactivate();
}, 5000);

for await (const m of prov.process()) {
    console.log(`${donationMessageToString(m)}`);
}

console.log('Program complete');
