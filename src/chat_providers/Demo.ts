import {
    DonationClass,
    DonationMessage,
    DonationProvider,
    DonationProviderEvents,
    ProviderFactory,
} from '@app/DonationProvider.ts';
import { SAVE_PATH, SavedConfig } from '@app/SavedConfig.ts';
import { AbortableEventEmitter } from '@app/util.ts';
import generateWords from '@biegomar/lorem';
import { code } from 'currency-codes';

export class DemoProvider extends AbortableEventEmitter<DonationProviderEvents> implements DonationProvider {
    messages: DonationMessage[] = [];
    active = false;
    immediateMessage = false;
    interval: number;
    constructor(signal: AbortSignal, private readonly config: DemoConfig) {
        super(signal);

        this.interval = setInterval(() => {
            if (this.signal.aborted) {
                clearInterval(this.interval);
                return;
            }
            this.emit('message', this.generateMessage());
        }, this.config.delay);
    }

    generateMessage() {
        this.immediateMessage = false;
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

        return message;
    }
}

export class DemoFactory implements ProviderFactory<DemoProvider> {
    public readonly id = 'demo';
    public readonly name = 'Demo Provider';
    public readonly version = '1.0';

    private config?: DemoConfig;

    async createProvider(signal: AbortSignal): Promise<DemoProvider> {
        const config = this.config ?? await SavedConfig.getOrCreate(DemoConfig);
        return new DemoProvider(signal, config);
    }
}

class DemoConfig extends SavedConfig {
    [SAVE_PATH] = 'demo.json';
    demoUsername = 'Demo User';
    minWords = 5;
    maxWords = 25;
    delay = 1000;
    constantStream = false;

    override validate() {
        if (this.minWords >= this.maxWords) {
            throw new Error(this.constructor.name + ': minWords must be < maxword');
        }
        if (this.delay < 100) {
            throw new Error(this.constructor.name + ': Delay < 100ms is too fast. Refusing.');
        }
    }
}
