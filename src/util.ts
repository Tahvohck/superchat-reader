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

            if (result.done) {
                this.remove(iteratorId);
            } else if (this.iterables.has(iteratorId)){
                yield result.value;
                promises.set(iteratorId, this.iterables.get(iteratorId)!.next().then(result => [iteratorId, result]));
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
