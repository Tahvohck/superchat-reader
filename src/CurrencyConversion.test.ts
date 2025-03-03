import * as CCC from '@app/CurrencyConversion.ts';
import { assertEquals, assertGreater } from '@std/assert';
import { code } from 'currency-codes';
const TEST_PREFIX = 'CCC: ';

Deno.test(TEST_PREFIX + 'Able to load cache', async () => {
    await CCC.loadCCCache();
    assertEquals(CCC.isLoaded(), true);
});

Deno.test(TEST_PREFIX + 'Conversion, big number to small: JPY -> USD', async () => {
    if (!CCC.isLoaded()) {
        await CCC.loadCCCache();
    }
    const startAmount = 100;
    const finalAmount = CCC.convertCurrency(startAmount, code('JPY'), code('USD'));
    assertGreater(startAmount, finalAmount);
});

Deno.test(TEST_PREFIX + 'Conversion, small number to big: USD -> SEK', async () => {
    if (!CCC.isLoaded()) {
        await CCC.loadCCCache();
    }
    const startAmount = 1;
    const finalAmount = CCC.convertCurrency(startAmount, code('USD'), code('SEK'));
    assertGreater(finalAmount, startAmount);
});

Deno.test(TEST_PREFIX + 'ISO-4217 Abbrev extraction', () => {
    assertEquals(CCC.getCurrencyCodeFromString('CA$1')?.code, 'CAD');
    assertEquals(CCC.getCurrencyCodeFromString('$1')?.code, 'USD');
    assertEquals(CCC.getCurrencyCodeFromString('A$1')?.code, 'AUD');
    assertEquals(CCC.getCurrencyCodeFromString('PhP1')?.code, 'PHP');
    assertEquals(CCC.getCurrencyCodeFromString('¥ 10000')?.code, 'JPY');
    assertEquals(CCC.getCurrencyCodeFromString('10000 ¥')?.code, 'JPY');
});

if (import.meta.main) {
    await CCC.loadCCCache();
    const php = CCC.convertCurrency(1, code('USD'), code('PHP'));
    const usdToArs = CCC.convertCurrency(1, code('USD'), code('ARS'));
    const phpToYen = CCC.convertCurrency(100, code('PHP'), code('JPY'));
    const yenToUsd = CCC.convertCurrency(100, code('JPY'));
    console.log(`  1 USD is ${php} PHP`);
    console.log(`  1 USD is ${usdToArs} ARS`);
    console.log(`100 PHP is ${phpToYen} JPY`);
    console.log(`100 JPY is ${yenToUsd} USD`);
}
