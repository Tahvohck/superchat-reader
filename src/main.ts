import { DonationMessage } from '@/DonationProvider.ts';
import { DemoProvider } from '@/chat_providers/Demo.ts';

const dm2 = new DonationMessage();

console.log(`${dm2}`);

const prov = new DemoProvider();
prov.activate();
setTimeout(() => {
    prov.deactivate();
}, 5000);

console.log('--------------------');
console.log('----Test message----');
const m1 = (await prov.process().next()).value!;
console.log(`${m1}`);
console.log('--------------------');
console.log('--------------------');

for await (const m of prov.process()) {
    console.log(`${m}`);
}

console.log('Program complete');
