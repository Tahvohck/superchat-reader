import { ConfigurationBuilder, DonationClass, DonationMessage, DonationProvider } from '@/DonationProvider.ts';
import { sleep } from '@/util.ts';
import generateWords from '@biegomar/lorem';
import { code } from 'currency-codes';

export class DemoProvider implements DonationProvider {
    readonly name = 'Demo Provider';
    readonly version = '1.0';

    messages: DonationMessage[] = [];
    active = false;
    delay = 1000;

    config = new DemoConfig();

    activate() {
        console.log(
            `Username: ${this.config.demoUsername}\n` +
                `Will generate between ${this.config.minWords} and ${this.config.maxWords} words.`,
        );
        this.active = true;
        console.log('Demo provider activated');
        return Promise.resolve(true);
    }

    deactivate() {
        this.active = false;
        console.log('Demo provider deactivated');
        return Promise.resolve(true);
    }

    async *process() {
        while (this.active) {
            await sleep(this.delay);
            if (!this.active) {
                return;
            }
            const message: DonationMessage = {
                author: this.config.demoUsername,
                message: generateWords(
                    this.config.minWords + Math.floor(Math.random() * (this.config.maxWords - this.config.minWords)),
                ),
                donationClass: DonationClass.Blue,
                donationCurrency: code('USD')!, // USD currency exists, this will never be undefined
                donationAmount: 0,
                messageType: 'text',
            };

            // Generate a random amount and truncate it to the correct digit count
            message.donationAmount = Math.random() * 100 *
                10 ** message.donationCurrency.digits;
            message.donationAmount = Math.floor(message.donationAmount);
            message.donationAmount /= 10 ** message.donationCurrency.digits;

            yield message;
        }
    }

    configure(cb: ConfigurationBuilder): ConfigurationBuilder {
        throw new Error('Method not implemented.');
    }
}

class DemoConfig {
    demoUsername = 'Demo User';
    minWords = 5;
    maxWords = 25;
}
