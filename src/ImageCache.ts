import * as path from '@std/path';
import { crypto } from '@std/crypto';
import { expandGlob } from '@std/fs';

export class LocallyCachedImage {
    /** Local file name. Most likely hash of the file contents, SHA-1 */
    localFileName = 'DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF.png';
    static readonly cacheLocation = path.join(Deno.cwd(), 'filecache');

    /** Save a remote file to the local disk and return the local cache information */
    static async saveNew(img: Response): Promise<LocallyCachedImage> {
        if (!img.ok) {
            throw new Error('Server returned error: ' + img.status);
        }

        const localcache = new LocallyCachedImage();
        const [type, subtype] = img.headers.get('content-type')!.split('/');

        if (type != 'image') {
            throw new Deno.errors.InvalidData('File is not an image! Refusing to download');
        }
        await Deno.mkdir(this.cacheLocation, { recursive: true });

        const [hashStream, saveStream] = img.body!.tee();

        const digestStr = Array.from(
            new Uint8Array(await crypto.subtle.digest('SHA-1', hashStream)),
        ).map((byte) => ('0' + byte.toString(16)).slice(-2))
            .join('')
            .toUpperCase();

        const cachefileName = path.join(this.cacheLocation, `${digestStr}.${subtype}`);
        localcache.localFileName = cachefileName;

        let tempfile;
        try {
            tempfile = await Deno.open(cachefileName, {
                write: true,
                read: true,
                create: true,
                createNew: true,
            });
        } catch {
            // File already exists, don't write to it.
            return LocallyCachedImage.hydrate(digestStr);
        }

        await saveStream.pipeTo(tempfile.writable);

        localcache.localFileName = cachefileName;
        //throw new Error("Not yet implented");
        return localcache;
    }

    static async hydrate(hash: string): Promise<LocallyCachedImage> {
        const cachedImage = new LocallyCachedImage();
        const cacheFileGlob = path.join(this.cacheLocation, hash) + '*';
        const matches = await Array.fromAsync(expandGlob(cacheFileGlob));
        if (matches.length == 0) {
            throw new Deno.errors.NotFound('Could not rehydrate from local cache ' + hash);
        }
        cachedImage.localFileName = matches[0].path;

        return cachedImage;
    }
}

if (import.meta.main) {
    const foo = await fetch('https://upload.wikimedia.org/wikipedia/en/1/1e/Baseball_%28crop%29.jpg');
    const lci = await LocallyCachedImage.saveNew(foo);
    console.log(lci);
}
