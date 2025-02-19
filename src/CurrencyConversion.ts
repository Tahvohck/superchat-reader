import * as path from '@std/path';
import { code } from 'currency-codes';
import type { CurrencyCodeRecord } from 'currency-codes';
import { assertEquals, assertGreater} from '@std/assert'

let     currency_conversion_cache: CurrencyAPIResponse
const   currency_conversion_cache_filename = path.join(Deno.cwd(), 'filecache', 'currency_cache.json');
const   currency_conversion_api = 'https://open.er-api.com/v6/latest/USD';
// TODO: This needs to be attributed per TOS <a href="https://www.exchangerate-api.com">Rates By Exchange Rate API</a>
// The attribution is present in the console, but will need to be present in the GUI once present as well.

if (import.meta.main) {
    await loadCCCache()
    const php = convertCurrency(1, code('USD'), code('PHP'))
    const usdToArs = convertCurrency(1, code('USD'), code('ARS'))
    const phpToYen = convertCurrency(100, code('PHP'), code('JPY'))
    const yenToUSD = convertCurrency(100, code('JPY'))
    console.log(`  1 USD is ${php} PHP`)
    console.log(`  1 USD is ${usdToArs} ARS`)
    console.log(`100 PHP is ${phpToYen} JPY`)
    console.log(`100 JPY is ${yenToUSD} USD`)
}


/**
 * Loads the currency conversion cache from disk if available. If not, loads it from the API.
 * If the cache is out of date, updates it.
 */
export async function loadCCCache() {
    if (!await isAvailable()) { await update_currency_cache() }
    console.log("Rates By Exchange Rate API: https://www.exchangerate-api.com")
    currency_conversion_cache = JSON.parse(await Deno.readTextFile(currency_conversion_cache_filename));
    console.log(
        "Next cache update due at: " + 
        new Date(currency_conversion_cache.time_next_update_utc)
    )
    // Return early if not out of date
    if (!isOutOfDate()) { return }
    // otherwise update the cache and reload it
    console.log("CC Cache out of date, reloading.")
    await update_currency_cache()
    currency_conversion_cache = JSON.parse(await Deno.readTextFile(currency_conversion_cache_filename));
}

/**
 * Convert input currency amount from one currency to another.
 * @param amount Source currency amount
 * @param from Source currency CodeRecord
 * @param to Destination currency CodeRecord (default USD)
 * @returns The converted amount
 */
export function convertCurrency(
    amount: number, from?: CurrencyCodeRecord, to: CurrencyCodeRecord = code('USD')!
): number {
    if (!currency_conversion_cache) { 
        throw new Deno.errors.BadResource("Currency cache has not yet been initialized.")
    }
    if (!from || !to) {
        throw new Deno.errors.InvalidData("Currency Code must be valid, not undefined")
    }

    const factor = 10 ** to.digits

    const toUSD =   currency_conversion_cache.rates[from.code]
    const fromUSD = currency_conversion_cache.rates[to.code]
    // Double check that we got the rates. Both use ISO 4217 so we should be fine, but it might happen.
    if (!toUSD || !fromUSD) {
        throw new Deno.errors.InvalidData(`Either From [${from.code}] or To [${to.code}] currency is invalid in cache`)
    }

    // Conversion works by converting to USD and then to the target currency, since the cache is in terms of ratios to
    // USD (to avoid pulling a bunch of hits against the API)
    amount /= toUSD
    amount *= fromUSD
    // use Math.floor because conversions are gonna take money, not give extra
    amount = Math.floor(amount * factor) /  factor
    return amount
}

/** Checks if the cache is out of date. */
function isOutOfDate(): boolean {
    if (!currency_conversion_cache) {
        throw new Deno.errors.BadResource("Currency Cache was never loaded.")
    }
    return new Date() > new Date(currency_conversion_cache.time_next_update_utc)
}

/** Checks if the cache file is present. */
async function isAvailable(): Promise<boolean> {
    try {
        await Deno.lstat(currency_conversion_cache_filename)
        return true
    } catch {
        return false
    }
}

/** Update the currency cache json from Exchange Rate API  */
async function update_currency_cache() {
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

interface CurrencyAPIResponse {
    result: string;
    provider: string;
    documentation: string;
    terms_of_use: string;
    time_last_update_unix: number;
    time_last_update_utc: string;
    time_next_update_unix: number;
    time_next_update_utc: string;
    time_eol_unix: number;
    base_code: string;
    rates: Rates;
}
interface Rates {
    [x: string]: number | null;
    USD: number;
    AED: number;
    AFN: number;
    ALL: number;
    AMD: number;
    ANG: number;
    AOA: number;
    ARS: number;
    AUD: number;
    AWG: number;
    AZN: number;
    BAM: number;
    BBD: number;
    BDT: number;
    BGN: number;
    BHD: number;
    BIF: number;
    BMD: number;
    BND: number;
    BOB: number;
    BRL: number;
    BSD: number;
    BTN: number;
    BWP: number;
    BYN: number;
    BZD: number;
    CAD: number;
    CDF: number;
    CHF: number;
    CLP: number;
    CNY: number;
    COP: number;
    CRC: number;
    CUP: number;
    CVE: number;
    CZK: number;
    DJF: number;
    DKK: number;
    DOP: number;
    DZD: number;
    EGP: number;
    ERN: number;
    ETB: number;
    EUR: number;
    FJD: number;
    FKP: number;
    FOK: number;
    GBP: number;
    GEL: number;
    GGP: number;
    GHS: number;
    GIP: number;
    GMD: number;
    GNF: number;
    GTQ: number;
    GYD: number;
    HKD: number;
    HNL: number;
    HRK: number;
    HTG: number;
    HUF: number;
    IDR: number;
    ILS: number;
    IMP: number;
    INR: number;
    IQD: number;
    IRR: number;
    ISK: number;
    JEP: number;
    JMD: number;
    JOD: number;
    JPY: number;
    KES: number;
    KGS: number;
    KHR: number;
    KID: number;
    KMF: number;
    KRW: number;
    KWD: number;
    KYD: number;
    KZT: number;
    LAK: number;
    LBP: number;
    LKR: number;
    LRD: number;
    LSL: number;
    LYD: number;
    MAD: number;
    MDL: number;
    MGA: number;
    MKD: number;
    MMK: number;
    MNT: number;
    MOP: number;
    MRU: number;
    MUR: number;
    MVR: number;
    MWK: number;
    MXN: number;
    MYR: number;
    MZN: number;
    NAD: number;
    NGN: number;
    NIO: number;
    NOK: number;
    NPR: number;
    NZD: number;
    OMR: number;
    PAB: number;
    PEN: number;
    PGK: number;
    PHP: number;
    PKR: number;
    PLN: number;
    PYG: number;
    QAR: number;
    RON: number;
    RSD: number;
    RUB: number;
    RWF: number;
    SAR: number;
    SBD: number;
    SCR: number;
    SDG: number;
    SEK: number;
    SGD: number;
    SHP: number;
    SLE: number;
    SLL: number;
    SOS: number;
    SRD: number;
    SSP: number;
    STN: number;
    SYP: number;
    SZL: number;
    THB: number;
    TJS: number;
    TMT: number;
    TND: number;
    TOP: number;
    TRY: number;
    TTD: number;
    TVD: number;
    TWD: number;
    TZS: number;
    UAH: number;
    UGX: number;
    UYU: number;
    UZS: number;
    VES: number;
    VND: number;
    VUV: number;
    WST: number;
    XAF: number;
    XCD: number;
    XDR: number;
    XOF: number;
    XPF: number;
    YER: number;
    ZAR: number;
    ZMW: number;
    ZWL: number;
}

interface CurrencySymbol {
    [x: string] : string | null
}
const CurrencySymbolMap = (await import('@/CurrencyMap.json', {with: {type: 'json'}})).default as CurrencySymbol
export function getCurrencyCodeFromString(str: string) {
    const replaceRegex = /\s*[\d.,]+\s*/
    const iso4217 = /[a-zA-Z]{3}/
    const currencySymbol = str.replace(replaceRegex, "")

    if (iso4217.test(currencySymbol)) {
        return code(currencySymbol.toUpperCase())
    }
    return code(CurrencySymbolMap[currencySymbol]?.toUpperCase() ?? "")
}

Deno.test("Currency Code Test", () => {
    assertEquals(getCurrencyCodeFromString("CA$1")?.code, "CAD")
    assertEquals(getCurrencyCodeFromString("$1")?.code, "USD")
    assertEquals(getCurrencyCodeFromString("A$1")?.code, "AUD")
    assertEquals(getCurrencyCodeFromString("PhP1")?.code, "PHP")
    assertEquals(getCurrencyCodeFromString("¥ 10000")?.code, "JPY")
    assertEquals(getCurrencyCodeFromString("10000 ¥")?.code, "JPY")
})

Deno.test("Able to load cache", async () => {
    await loadCCCache()
    assertEquals(null != currency_conversion_cache, true)
})

Deno.test("ARS is weaker than USD", async () => {
    if (!currency_conversion_cache) {
        await loadCCCache()
    }
    const usdAmount = 1
    const arsAmount = convertCurrency(usdAmount, code('USD'), code('ARS'))
    assertGreater(arsAmount, usdAmount)
})

Deno.test("USD number is smaller than JPY", async () => {
    if (!currency_conversion_cache) {
        await loadCCCache()
    }
    const jpyAmount = 100
    const usdAmount = convertCurrency(jpyAmount, code('JPY'))
    assertGreater(jpyAmount, usdAmount)
})