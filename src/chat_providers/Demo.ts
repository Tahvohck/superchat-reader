import { DonationMessage, IDonationProvider } from '@/DonationProvider.ts';
import { sleep } from '@/util.ts';
import generateWords from '@biegomar/lorem';

export class DemoProvider implements IDonationProvider {
    readonly name = 'Demo Provider';
    readonly version = '1.0';

    messages: DonationMessage[] = [];
    active = false;
    delay = 1000;

    config = new DemoConfig();

    activate(): boolean {
        console.log(
            `Username: ${this.config.demoUsername}\n` +
                `Will generate between ${this.config.minWords} and ${this.config.maxWords} words.`,
        );
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

            message.author = this.config.demoUsername;
            message.message = generateWords(
                this.config.minWords +
                    ~~(Math.random() * (this.config.maxWords - this.config.minWords)),
            );

            yield message;
        }
    }

    configure(): void {
        throw new Error('Method not implemented.');
    }
}

class DemoConfig {
    demoUsername = 'Demo User';
    minWords = 5;
    maxWords = 25;
}
