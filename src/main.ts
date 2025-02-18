import { DemoProvider } from '@/chat_providers/Demo.ts';
import { donationMessageToString } from '@/DonationProvider.ts';
import { CurrencyAPIResponse } from '@/currency_cache.ts';
import * as path from '@std/path';

let currency_conversion_cache: CurrencyAPIResponse;
const currency_conversion_cache_filename = path.join(Deno.cwd(), 'filecache', 'currency_cache.json');
const currency_conversion_api = 'https://open.er-api.com/v6/latest/USD';
try {
    // Try to open the file.
    Deno.openSync(currency_conversion_cache_filename).close();
} catch {
    // File doesn't exist, download it.
    await update_currency_cache();
}

// Load the cache. If the cache is out of date, redownload it.
// TODO: This needs to be attributed per TOS <a href="https://www.exchangerate-api.com">Rates By Exchange Rate API</a>
currency_conversion_cache = JSON.parse(Deno.readTextFileSync(currency_conversion_cache_filename));
if (new Date(currency_conversion_cache.time_next_update_utc) < new Date()) {
    console.log('Currency cache out of date. Updating.');
    try {
        await update_currency_cache();
    } catch {
        console.warn("Cache update failed. Will try to use stale data if possible.")
    }
    currency_conversion_cache = JSON.parse(Deno.readTextFileSync(currency_conversion_cache_filename));
}

console.log(`1 USD is ${1 * currency_conversion_cache.rates.PHP} PHP`);

const prov = new DemoProvider();
prov.activate();
setTimeout(() => {
    prov.deactivate();
}, 5000);

for await (const m of prov.process()) {
    console.log(`${donationMessageToString(m)}`);
}

console.log('Program complete');

async function update_currency_cache() {
    console.log("Rates By Exchange Rate API: https://www.exchangerate-api.com")
    await Deno.mkdir(path.dirname(currency_conversion_cache_filename), { recursive: true });
    const resp = await fetch(currency_conversion_api);
    if (resp.status == 429) {
        console.error("Too many requests to conversion API. Wait 20 minutes and try again.")
        throw new Deno.errors.ConnectionRefused("Too many requests to currency conversion API (how?)")
    }
    if (resp.status != 200) {
        throw new Deno.errors.NotFound('Could not connect to currency conversion API');
    }

    using file = await Deno.open(currency_conversion_cache_filename, {
        create: true,
        write: true,
    });
    await resp.body!.pipeTo(file.writable);
}
