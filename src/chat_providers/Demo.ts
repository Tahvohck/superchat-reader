import {
    DonationClass,
    DonationMessage,
    DonationProvider,
    DonationReader,
    DonationReaderEventMap,
} from '@app/DonationProvider.ts';
import { ConfigurationBuilder } from '@app/ConfigurationBuilder.ts';
import { SAVE_PATH, SavedConfig } from '@app/SavedConfig.ts';
import { AbortableEventEmitter } from '@app/util.ts';
import generateWords from '@biegomar/lorem';
import { code } from 'currency-codes';

export class DemoReader extends AbortableEventEmitter<DonationReaderEventMap> implements DonationReader {
    messages: DonationMessage[] = [];
    active = false;
    immediateMessage = false;
    interval: number;
    constructor(signal: AbortSignal, private readonly config: DemoConfig) {
        super(signal);

        signal.addEventListener('abort', () => {
            clearInterval(this.interval);
        });

        this.interval = setInterval(() => {
            this.emit('message', this.generateMessage());
        }, this.config.delay);
    }

    public sendImmediate() {
        this.emit('message', this.generateMessage());
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

export class DemoProvider implements DonationProvider<DemoReader> {
    public readonly id = 'demo';
    public readonly name = 'Demo Provider';
    public readonly version = '1.0';

    private lastReader?: DemoReader;

    private config!: DemoConfig;

    createReader(signal: AbortSignal): DemoReader {
        const reader = this.lastReader = new DemoReader(signal, this.config);
        return reader;
    }

    async init(configBuilder: ConfigurationBuilder) {
        this.config = await SavedConfig.getOrCreate(DemoConfig);

        // This is not currently best practice as I see it.
        // Ideally, with the provider rewrite, settings on readers should be static
        // and instead config changes should just trigger construction of a brand new reader.
        configBuilder.addTextBox(
            'Username',
            {
                value: this.config.demoUsername,
                type: 'text',
                callback: (newVal) => {
                    this.config.demoUsername = newVal;
                },
            },
        ).addTextBox(
            'Minimum Words',
            {
                value: this.config.minWords,
                type: 'number',
                callback: (newVal) => {
                    const newMin = Number(newVal);
                    if (!Number.isNaN(newMin) && newMin < this.config.maxWords && newMin > 0) {
                        this.config.minWords = newMin;
                    }
                },
            },
        ).addTextBox(
            'Maximum Words',
            {
                value: this.config.maxWords,
                type: 'number',
                callback: (newVal) => {
                    const newMax = Number(newVal);
                    if (!Number.isNaN(newMax) && newMax > this.config.minWords && newMax < 100) {
                        this.config.maxWords = newMax;
                    }
                },
            },
        ).addCheckbox(
            'Constant messages',
            {
                value: this.config.constantStream,
                callback: (state) => {
                    this.config.constantStream = state;
                },
            },
        ).addSlider(
            // FIXME: currently broken since moving to `setInterval` implementation.
            // this should be easier to fix by just making this an invalidating option.
            'Message Delay (ms)',
            {
                range: [250, 10_000],
                step: 250,
                value: this.config.delay,
                callback: (newVal) => {
                    this.config.delay = newVal;
                },
            },
        ).addButton(
            'Send message',
            {
                callback: () => {
                    this.lastReader?.sendImmediate();
                },
            },
        );
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
