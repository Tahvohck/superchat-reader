import { assertEquals } from '@std/assert/equals';
import { assert } from '@std/assert/assert';

export const sleep = (ms: number): Promise<void> => {
    return new Promise((res) => setTimeout(res, ms));
};


/**
 * Combines multiple async iterables into one, while also allowing you to remove or add iterables during use.
 * 
 * When any iterable is exhausted, it is automatically removed. When there are no more iterables to process. the iterator ends.
 */
export class Combine<T> implements AsyncIterable<T> {
    async *[Symbol.asyncIterator](): AsyncGenerator<T> {
        const promises = new Map();
        
        for (const [key, iterator] of this.iterables.entries()) {
            promises.set(key, iterator.next().then(result => [key, result]));
        }
        while (promises.size > 0) {
            const iterables = new Set(this.iterables.keys());
            for (const iteratorId of promises.keys()) {
                iterables.delete(iteratorId)
            }

            if (iterables.size > 0) {
                for (const iteratorId of iterables) {
                    promises.set(iteratorId, this.iterables.get(iteratorId)!.next().then(result => [iteratorId, result]));
                }
            }

            const [iteratorId, result] = await Promise.race(promises.values());
            promises.delete(iteratorId);
            
            // we only want to yield items for iterators we still care about, and we only want to yield actual items.
            // the most common case for a value being undefined is a generator function that does not have a return statement,
            // so we special case that but don't care about other `undefined` values.
            if ((!result.done && result.value !== undefined) && this.iterables.has(iteratorId)) {
                yield result.value;
                promises.set(iteratorId, this.iterables.get(iteratorId)!.next().then(result => [iteratorId, result]));
            }

            // a `return` in a generator function yields whatever is return with done: true, so we handle
            // the value *before* removing the iterator.
            if (result.done) {
                this.remove(iteratorId);
            }
        }
    }

    private readonly iterables: Map<string, AsyncIterator<T>> = new Map();

    public add(key: string, iterable: AsyncIterator<T>): this {
        this.iterables.set(key, iterable);
        return this;
    }

    public remove(key: string): AsyncIterator<T> | undefined {
        const iterable = this.iterables.get(key);
        this.iterables.delete(key);
        return iterable;
    }
}

async function *generate<T>(delay: number, ...items: T[]): AsyncGenerator<T> {
    while (items.length > 0) {
        await sleep(delay);
        yield items.shift()!;
    }
}

const collect = async <T>(iterator: AsyncIterable<T>) => {
    const out = [];

    for await (const item of iterator) {
        out.push(item);
    }

    return out;
}

Deno.test({
    name: "Combine: preserves item order",
    async fn() {
        const combine = new Combine<number>();

        combine.add("generate1", generate(100, 1, 2, 3, 5));
        combine.add("generate2", generate(350, 4, 6));

        const result = await collect(combine);

        for (let i = 0; i < result.length; i++) {
            assertEquals(result[i], i+1);
        }
    }
});

Deno.test({
    name: "Combine: iterators are removed and added while running",
    async fn() {
        const combine = new Combine<number>();

        combine.add("generate1", generate(10, 1, 2, 3));

        const items = [];

        for await (const item of combine) {
            items.push(item);

            if (items.length === 2) {
                combine.add("generate2", generate(50, 4, 5, 6));
            }

            // implementation detail: because of how `generate` works, a `done: true` is yielded only after all its elements are exhausted.
            if (items.length === 4) {
                //@ts-expect-error accessing internal property for testing
                const generate1 = combine.iterables.get("generate1");
                assert(!generate1, "iterable not removed when exhausted");
            }
        }

        assertEquals(items.length, 6);
    }
});
