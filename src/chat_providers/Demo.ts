import { DonationMessage, IDonationProvider } from '@/DonationProvider.ts';
import { sleep } from '@/util.ts';

export class DemoProvider implements IDonationProvider {
    readonly name = 'Demo Provider';
    readonly version = '1.0';

    messages: DonationMessage[] = [];
    active = false;
    delay = 1000;

    activate(): boolean {
        this.active = true;
        console.log('Demo provider activated');
        return true;
    }

    deactivate(): boolean {
        this.active = false;
        console.log('Demo provider deactivated');
        return true;
    }

    async *process() {
        while (this.active) {
            await sleep(this.delay);
            if (!this.active) {
                return;
            }
            const message = new DonationMessage();

            // Generate a random amount and truncate it to the correct digit count
            message.donationAmount = Math.random() * 100 *
                10 ** message.donationCurrency.digits;
            message.donationAmount = Math.floor(message.donationAmount);
            message.donationAmount /= 10 ** message.donationCurrency.digits;

            yield message;
        }
    }

    configure(): void {
        throw new Error('Method not implemented.');
    }
}
