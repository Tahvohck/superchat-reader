import * as embedder from 'jsr:@nfnitloop/deno-embedder';
import { parseArgs } from '@std/cli/parse-args';
import { sleep } from '@/util.ts';

const options = {
    importMeta: import.meta,

    mappings: [
        {
            sourceDir: '../UISnippets',
            destDir: 'UISnippets',
        },
    ],
};

if (import.meta.main) {
    const args: string[] = [];
    const flags = parseArgs(Deno.args, {
        boolean: ['loop'],
        alias: {
            'L': 'loop',
        },
        unknown: (arg, _key, str) => {
            if (arg) {
                args.push(arg);
            }
            if (str) {
                args.push(str as string);
            }
            return false;
        },
    });
    if (flags.loop) {
        while (true) {
            await sleep(1000);
        }
    } else {
        await embedder.main({ options, args });
    }
}
