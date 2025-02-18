import { DemoProvider } from '@/chat_providers/Demo.ts';
import { donationMessageToString } from '@/DonationProvider.ts';
import { CurrencyAPIResponse } from '@/currency_cache.ts';
import * as path from '@std/path'

let currency_conversion_cache: CurrencyAPIResponse;
const currency_conversion_cache_filename = path.join(Deno.cwd(), "filecache", "currency_cache.json");
const currency_conversion_api = "https://open.er-api.com/v6/latest/USD"
try {
    // Try to open the file. 
    Deno.openSync(currency_conversion_cache_filename).close()
} catch {
    // File doesn't exist, download it.
    update_currency_cache()
}

// Load the cache. If the cache is out of date, redownload it.
currency_conversion_cache = JSON.parse(Deno.readTextFileSync(currency_conversion_cache_filename))
if (new Date(currency_conversion_cache.time_next_update_utc) < new Date()) {
    update_currency_cache()
    console.log("Currency cache out of date. Updating.")
    currency_conversion_cache = JSON.parse(Deno.readTextFileSync(currency_conversion_cache_filename))
}

console.log(`1 USD is ${1 * currency_conversion_cache.rates.PHP} PHP`)


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
    using file = await Deno.open(currency_conversion_cache_filename, {
        create: true,
        write: true
    })
    const resp = await fetch(currency_conversion_api)
    if (resp.status != 200) {
        throw new Deno.errors.NotFound("Could not connect to currency conversion API")
    }
    await resp.body!.pipeTo(file.writable)
}
