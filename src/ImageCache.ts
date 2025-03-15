import * as path from '@std/path';
import { crypto } from '@std/crypto';
import { expandGlob } from '@std/fs';
import { encodeBase64 } from '@std/encoding';

export class LocallyCachedImage {
    /** Local file name. Most likely hash of the file contents, SHA-1 */
    fileName = 'ADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF.png';
    fileBin = 'DE';
    digest = '';
    mimetype = '';
    static readonly cacheLocation = path.join(Deno.cwd(), 'filecache');
    /** Internal use only: number of digits to use when binning the hashes. */
    private static readonly binsize = 1;

    constructor(hash: string) {
        this.digest = hash;
        this.fileBin = hash.slice(0, LocallyCachedImage.binsize);
        this.fileName = hash.slice(LocallyCachedImage.binsize);
    }

    path() {
        const basepath = path.join(LocallyCachedImage.cacheLocation, this.fileBin, this.fileName);
        if (this.mimetype == '') {
            return basepath + '*';
        } else {
            const [_, subtype] = this.mimetype.split('/');
            return `${basepath}.${subtype}`;
        }
    }

    /** Save a remote file to the local disk and return the local cache information */
    static async saveNew(img: Response): Promise<LocallyCachedImage> {
        if (!img.ok) {
            throw new Error('Server returned error: ' + img.status);
        }

        const [type, subtype] = img.headers.get('content-type')!.split('/');

        if (type != 'image') {
            throw new Deno.errors.InvalidData('File is not an image! Refusing to download');
        }

        const [hashStream, saveStream] = img.body!.tee();

        const digestStr = Array.from(
            new Uint8Array(await crypto.subtle.digest('SHA-1', hashStream)),
        ).map((byte) => ('0' + byte.toString(16)).slice(-2))
            .join('')
            .toUpperCase();

        let tempfile;
        try {
            const lci = new LocallyCachedImage(digestStr);
            // Recursively create the cache bin (this will also create the cache folder if needed)
            await Deno.mkdir(path.dirname(lci.path()), { recursive: true });
            lci.mimetype = `${type}/${subtype}`;
            tempfile = await Deno.open(lci.path(), {
                write: true,
                read: true,
                createNew: true,
            });
            // previous statement will throw if file already exists
            await saveStream.pipeTo(tempfile.writable);
        } catch {
            // File already exists, don't write to it.
        }
        return LocallyCachedImage.hydrate(digestStr);
    }

    static async hydrate(hash: string): Promise<LocallyCachedImage> {
        const cachedImage = new LocallyCachedImage(hash);
        const matches = await Array.fromAsync(expandGlob(cachedImage.path()));
        if (matches.length == 0) {
            throw new Deno.errors.NotFound('Could not rehydrate from local cache ' + hash);
        }
        const [_, ext] = matches[0].name.split('.');
        cachedImage.mimetype = `image/${ext}`;

        return cachedImage;
    }

    /**
     * @returns the contents of the file as a Base64 `data:` URI.
     */
    public async asBase64Uri(): Promise<string> {
        if (this.mimetype == '') {
            throw new Error('File not hydrated');
        }
        const content = await Deno.readFile(this.path());
        return `data:${this.mimetype};base64,${encodeBase64(content)}`;
    }
}
