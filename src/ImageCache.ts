export class LocallyCachedImage {
    /** Hash of the file contents, SHA-1*/
    localFileName = 'DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF';
    /** Original file name on remote server to avoid downloading multiple times. */
    remoteFileName = '';

    /** Save a remote file to the local disk and return the local cache information */
    static async SaveNew(img: Response): Promise<LocallyCachedImage> {
        if (!img.ok) {
            throw new Error('Server returned error: ' + img.status);
        }

        const localcache = new LocallyCachedImage();
        const [type, subtype] = img.headers.get('content-type')!.split('/');

        if (type != 'image') {
            throw new Error('File is not an image! Refusing to download');
        }

        const tempfilename = await Deno.makeTempFile({
            prefix: 'superchat-',
            suffix: `.${subtype}`,
        });
        const tempfile = await Deno.open(tempfilename, {
            write: true,
            read: true,
        });

        img.body!.pipeTo(tempfile.writable);
        tempfile.close();

        localcache.remoteFileName = new URL(img.url).pathname;
        localcache.localFileName = tempfilename;
        //throw new Error("Not yet implented");
        return localcache;
    }
}
