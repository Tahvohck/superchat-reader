import { ConfigurationBuilder } from '@app/ConfigurationBuilder.ts';
import { DonationClass, DonationMessage, DonationProvider } from '@app/DonationProvider.ts';
import { ProviderConfig, SAVE_PATH } from '@app/ProviderConfig.ts'
import { sleep } from '@app/util.ts';
import generateWords from '@biegomar/lorem';
import { code } from 'currency-codes';
import { join } from '@std/path/join';
import { assertThrows } from '@std/assert/throws';

export class DemoProvider implements DonationProvider {
    readonly name = 'Demo Provider';
    readonly version = '1.0';

    messages: DonationMessage[] = [];
    active = false;

    config!: DemoConfig;

    async activate() {
        this.config = await ProviderConfig.load(DemoConfig)
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
            await sleep(this.config.delay);
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

    configure(cb: ConfigurationBuilder): void {
    }
}

class DemoConfig extends ProviderConfig{
    [SAVE_PATH] = "demo.json";
    demoUsername = 'Demo User';
    minWords = 5;
    maxWords = 25;
    delay = 1000;

    override validate() {
        if (this.minWords >= this.maxWords) {
            throw new Error(this.constructor.name + ": minWords must be < maxword")
        }
        if (this.delay < 100) {
            throw new Error(this.constructor.name + ": Delay < 100ms is too fast. Refusing.")
        }
    }
}

const testPrefix = "DemoProvider:"
Deno.test(`${testPrefix} Setup`, () => {
    ProviderConfig.configPath = join(Deno.cwd(), 'test-output')
    const savedFile = join(ProviderConfig.configPath, new DemoConfig()[SAVE_PATH])
    try {
        Deno.removeSync(savedFile)
    } catch {
        // failing to remove the file is fine (it might not exist yet)
    }
})

Deno.test(`${testPrefix} configuration file automatic creation`, async ()=> {
    await DemoConfig.load(DemoConfig)
})

Deno.test(`${testPrefix} configuration file loading`, async ()=> {
    await DemoConfig.load(DemoConfig)
})

Deno.test(`${testPrefix} configuration file saving`, async ()=> {
    const config = await DemoConfig.load(DemoConfig);
    const savedFile = join(ProviderConfig.configPath, config[SAVE_PATH])
    Deno.removeSync(savedFile)
    config.save()
    // confirm the file exists
    Deno.lstatSync(savedFile)
})

Deno.test(`${testPrefix} configuration fails validation`, async () => {
    const config = await DemoConfig.load(DemoConfig)
    assertThrows(() => {
        config.maxWords = config.minWords - 1  
    })
})

Deno.test(`${testPrefix} Can activate DemoProvider`, async () => {
    const prov = new DemoProvider()
    await prov.activate()
})

Deno.test(`${testPrefix} Teardown`, () => {
    Deno.removeSync(ProviderConfig.configPath, {recursive: true})
})