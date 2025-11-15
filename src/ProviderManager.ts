import { DonationMessage, DonationProvider, ProviderFactory } from '@app/DonationProvider.ts';
import { getProgramConfig } from '@app/MainConfig.ts';
import { EventEmitter } from 'node:events';

/**
 * Indicates that a requested provider was not registered.
 */
export class ProviderNotFound extends Error {
    constructor(id: string) {
        super(`Provider with ID ${id} not found.`);
    }
}

/**
 * Central point for managing all chat providers.
 */
export class ProviderManager {
    private readonly providers = new Map<string, ProviderFactory<DonationProvider>>();
    private config!: Awaited<ReturnType<typeof getProgramConfig>>;

    public async init() {
        this.config = await getProgramConfig();
    }

    public toggle(providerId: string): boolean {
        this.config.enabledProviders[providerId] = !this.config.enabledProviders[providerId];
        return this.config.enabledProviders[providerId];
    }

    public getStream(): ProviderMessageStream {
        const factories = [];
        for (const factory of this.providers.values()) {
            if (this.config.enabledProviders[factory.id]) {
                factories.push(factory);
            }
        }

        return new ProviderMessageStream(factories);
    }

    public register(
        provider: ProviderFactory,
    ) {
        if (this.providers.has(provider.id)) {
            throw new Error(`Provider ${provider.name} (${provider.id}) already registered.`);
        }
        // if we find a new provider, assume we want it enabled by default.
        if (!this.config.enabledProviders[provider.id]) this.config.enabledProviders[provider.id] = true;
        this.providers.set(provider.id, provider);
    }
}

/**
 * Represents a stream of provider messages.
 *
 * @example
 * const stream = providerManager.getStream();
 * const max = 10;
 * let current = 0;
 * stream.on("message", message => {
 *     console.log(messageToString(message));
 *     if (++current > max) {
 *         stream.abort();
 *     }
 * });
 */
export class ProviderMessageStream extends EventEmitter<{ message: [DonationMessage]; aborted: [] }> {
    private readonly controller = new AbortController();

    constructor(private readonly factories: ProviderFactory[]) {
        super();

        this.controller.signal.addEventListener('abort', () => {
            this.emit('aborted');
        });
    }

    public async start() {
        const providers = await Promise.all(
            this.factories.map((factory) => factory.createProvider(this.controller.signal)),
        );

        for (const provider of providers) {
            provider.on('message', (message) => {
                this.emit('message', message);
            });
        }
    }

    public abort(reason?: string) {
        this.controller.abort(reason);
        this.removeAllListeners('message');
    }
}
