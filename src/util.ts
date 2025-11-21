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

export type DefaultEvents = {
    // deno-lint-ignore no-explicit-any
    error: [any];
};

export class EventListenerOnly<T extends Record<string, unknown[]> = Record<string, unknown[]>> {
    constructor(private readonly emitter: EventEmitter<T>) {}

    public on<K extends keyof (T & DefaultEvents)>(
        event: K,
        listener: (...args: (T & DefaultEvents)[K]) => void,
    ): this {
        //deno-lint-ignore no-explicit-any
        this.emitter.on(event as any, listener as any);
        return this;
    }

    public off<K extends keyof (T & DefaultEvents)>(
        event: K,
        listener: (...args: (T & DefaultEvents)[K]) => void,
    ): this {
        //deno-lint-ignore no-explicit-any
        this.emitter.off(event as any, listener as any);
        return this;
    }
}

export class EventEmitterOnly<T extends Record<string, unknown[]> = Record<string, unknown[]>> {
    constructor(private readonly emitter: EventEmitter<T>) {}

    public emit<K extends keyof (T & DefaultEvents)>(event: K, ...args: (T & DefaultEvents)[K]): boolean {
        //deno-lint-ignore no-explicit-any
        return this.emitter.emit(event as any, ...args as any);
    }
}

/**
 * Splits an {@link EventEmitter} into an emitter-only and listener-only part.
 */
export function splitEmitter<T extends Record<string, unknown[]>>(emitter: EventEmitter<T>) {
    return [
        new EventEmitterOnly<T>(emitter),
        new EventListenerOnly<T>(emitter),
    ] as const;
}

/**
 * Forward events from one emitter to another.
 * @returns An object mapping event names to the registered callback functions for use with {@link EventEmitter.off} on the source.
 */
// the typings here are incredibly messy, but fixing that would require redoing all the EventEmitter typings in the split versions above, which is not worth the effort right now.
export function forwardEvents<
    E1 extends Record<string | number | symbol, unknown[]>,
    E2 extends Record<string | number | symbol, unknown[]>,
    A extends ((keyof E1 & keyof E2) | 'error')[],
>(
    source: EventEmitter<E1> | EventListenerOnly<E1>,
    target: EventEmitter<E2> | EventEmitterOnly<E2>,
    events: A,
): { [K in A[number]]: (...args: unknown[]) => void } {
    const callbacks = {} as { [K in A[number]]: (...args: unknown[]) => void };

    for (const event of events) {
        const callback = (...args: E1[typeof event]) => {
            // deno-lint-ignore no-explicit-any -- EventEmitter typings are a little funky.
            (target.emit as any)(event as any, ...args as any);
        };

        // deno-lint-ignore no-explicit-any
        (source.on as any)(event as any, callback as any);
        callbacks[event] = callback as unknown as (...args: unknown[]) => void;
    }

    return callbacks;
}
