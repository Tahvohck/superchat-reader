import { DonationMessage, DonationProvider } from '@app/DonationProvider.ts';
import { getProgramConfig } from '@app/MainConfig.ts';
import { EventEmitter } from 'node:events';
import { ConfigurationBuilder } from './ConfigurationBuilder.ts';

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
    private readonly providers = new Map<string, DonationProvider>();
    private readonly configurations = new Map<string, ConfigurationBuilder>();
    private config!: Awaited<ReturnType<typeof getProgramConfig>>;

    public async init() {
        this.config = await getProgramConfig();
    }

    /**
     * @throws {ProviderNotFound} if the supplied provider isn't {@link ProviderManager.register | register}ed.
     */
    public toggle(providerId: string): boolean {
        const { enabledProviders } = this.config;

        if (!(providerId in enabledProviders)) {
            throw new ProviderNotFound(providerId);
        }

        enabledProviders[providerId] = !enabledProviders[providerId];
        return this.config.enabledProviders[providerId];
    }

    /**
     * @throws {ProviderNotFound} if the supplied provider isn't {@link ProviderManager.register | register}ed.
     */
    public isEnabled(providerId: string): boolean {
        if (!(providerId in this.config.enabledProviders)) {
            throw new ProviderNotFound(providerId);
        }
        return this.config.enabledProviders[providerId];
    }

    public getStream(): ProviderMessageStream {
        return new ProviderMessageStream(this.getEnabledProviders());
    }

    public async register(
        provider: DonationProvider,
    ) {
        if (this.providers.has(provider.id)) {
            throw new Error(`Provider ${provider.name} (${provider.id}) already registered.`);
        }

        // if we find a new provider, assume we want it enabled by default.
        if (typeof this.config.enabledProviders[provider.id] !== 'boolean') {
            this.config.enabledProviders[provider.id] = true;
        }
        this.providers.set(provider.id, provider);

        if (typeof provider.init === 'function') {
            const config = new ConfigurationBuilder();
            await provider.init(config);
            this.configurations.set(provider.id, config);
        }
    }

    private getEnabledProviders() {
        const providers = [];
        for (const provider of this.providers.values()) {
            if (this.config.enabledProviders[provider.id]) {
                providers.push(provider);
            }
        }
        return providers;
    }

    public getConfiguration(provider: string): ConfigurationBuilder | undefined {
        return this.configurations.get(provider);
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

    constructor(private readonly factories: DonationProvider[]) {
        super();

        this.controller.signal.addEventListener('abort', () => {
            this.emit('aborted');
        });
    }

    /**
     * Start the message stream. Message events can already start being emitted before the returned promise resolves, so it's
     * recommended you add your listeners *before* calling this method.
     */
    public async start() {
        await Promise.all(
            this.factories.map(async (factory) => {
                const reader = await factory.createReader(this.controller.signal);
                reader.on('message', (message) => this.emit('message', message));
            }),
        );
    }

    public abort(reason?: string) {
        this.controller.abort(reason);
        this.removeAllListeners('message');
    }
}
