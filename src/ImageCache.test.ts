import { LocallyCachedImage } from '@app/ImageCache.ts';
import * as path from '@std/path';

// TODO: Make these actual tests instead of just an import

if (import.meta.main) {
    const saveNewTests = [
        'https://httpbin.org/image/png', // various types of image
        'https://httpbin.org/image/jpeg', // various types of image
        'https://httpbin.org/image/svg', // various types of image
        'https://httpbin.org/image/webp', // various types of image
        'https://httpbin.org', // Not an image
        'https://httpbin.org/status/404', // Not a 200 OK response
    ];
    const hydrateTests: string[] = [
        'DEADBEFF',
    ];

    for (const url of saveNewTests) {
        try {
            const lci = await LocallyCachedImage.saveNew(await fetch(url));
            hydrateTests.push(path.basename(lci.digest));
            console.log(path.relative(Deno.cwd(), lci.path()));
        } catch (e) {
            console.log((e as Error).message);
        }
    }

    for (const filename of hydrateTests) {
        try {
            const lci = await LocallyCachedImage.hydrate(filename);
            console.log(path.relative(Deno.cwd(), lci.path()));
            await Deno.remove(lci.path());
        } catch (e) {
            console.log((e as Error).message);
        }
    }
}
