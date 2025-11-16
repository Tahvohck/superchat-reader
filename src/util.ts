//@ts-types=npm:@node/events
import EventEmitter from 'node:events';

export const sleep = (ms: number): Promise<void> => {
    return new Promise((res) => setTimeout(res, ms));
};

// deno-lint-ignore no-explicit-any
export type Constructor<T> = new (...args: any[]) => T;

export class AbortableEventEmitter<T extends Record<keyof T, unknown[]>> extends EventEmitter<T> {
    constructor(protected readonly signal: AbortSignal) {
        super();
    }
}
