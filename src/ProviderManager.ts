import {
    DonationEventEmitter,
    DonationEventListener,
    DonationEventMap,
    DonationMessage,
    DonationProvider,
} from '@app/DonationProvider.ts';
import { getProgramConfig, ProgramConfig } from '@app/MainConfig.ts';
import { EventEmitter } from 'node:events';
import { ConfigurationBuilder } from './ConfigurationBuilder.ts';
import { forwardEvents, splitEmitter } from './util.ts';

/**
 * Indicates that a requested provider was not registered.
 */
export class ProviderNotFound extends Error {
    constructor(id: string) {
        super(`Provider with ID ${id} not found.`);
    }
}

/**
 * Indicates that a requested provider is not enabled.
 */
export class ProviderNotEnabled extends Error {
    constructor(id: string) {
        super(`Provider with ID ${id} is not enabled.`);
    }
}

/**
 * Central point for managing all chat providers.
 */
// TODO: figure out semantics for enabling/disabling providers (at runtime).
export class ProviderManager extends EventEmitter<{ message: [DonationMessage] }> {
    async [Symbol.asyncDispose]() {
        await this.destroy();
    }

    private readonly providers = new Map<string, ProviderState>();
    private config!: ProgramConfig;

    public async init() {
        this.config = await getProgramConfig();
    }

    private getProvider(providerId: string): ProviderState {
        if (!this.providers.has(providerId)) {
            throw new ProviderNotFound(providerId);
        }
        return this.providers.get(providerId)!;
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

        const data = new ProviderState(this, provider);
        await data.init();
        this.providers.set(provider.id, data);
    }

    private getEnabledProviders() {
        const providers = [];
        for (const provider of this.providers.values()) {
            if (this.config.enabledProviders[provider.provider.id]) {
                providers.push(provider);
            }
        }
        return providers;
    }

    /**
     * Start a provider.
     * @throws {ProviderNotFound} if the supplied provider isn't {@link ProviderManager.register | register}ed.
     */
    public async start(providerId: string): Promise<void> {
        const provider = this.getProvider(providerId);
        await provider.start();
    }

    public async startEnabled(): Promise<void> {
        for (const provider of this.getEnabledProviders()) {
            await provider.start();
        }
    }

    /**
     * Stop a provider.
     * @throws {ProviderNotFound} if the supplied provider isn't {@link ProviderManager.register | register}ed.
     */
    public async stop(providerId: string): Promise<void> {
        const provider = this.getProvider(providerId);
        await provider.stop();
    }

    public async stopAll(): Promise<void> {
        for (const provider of this.providers.values().filter((p) => p.started)) {
            await provider.stop();
        }
    }

    public getConfiguration(provider: string): ConfigurationBuilder | undefined {
        return this.providers.get(provider)?.configuration;
    }

    public async destroy(): Promise<void> {
        await this.stopAll();
        for (const provider of this.providers.values()) {
            await provider.provider.destroy?.();
        }
    }
}

export class AlreadyStartedError extends Error {
    constructor(providerId: string) {
        super(`Provider with ID ${providerId} has already been started.`);
    }
}

export class NotStartedError extends Error {
    constructor(providerId: string) {
        super(`Provider with ID ${providerId} has not been started.`);
    }
}

/**
 * Holds state for a registered provider. This automatically manages event forwarding and start/stop state.
 */
export class ProviderState {
    private _started: boolean = false;
    public readonly configuration: ConfigurationBuilder = new ConfigurationBuilder();
    private readonly listener: DonationEventListener;
    private readonly emitter: DonationEventEmitter;
    private callbacks?: Record<string, (...args: unknown[]) => void>;

    public get started() {
        return this._started;
    }

    constructor(private readonly manager: ProviderManager, public readonly provider: DonationProvider) {
        const [emitter, listener] = splitEmitter(new EventEmitter<DonationEventMap>());
        this.emitter = emitter;
        this.listener = listener;
    }

    public async init() {
        return await this.provider.init(this.configuration, this.emitter);
    }

    public async start() {
        if (this._started) {
            throw new AlreadyStartedError(this.provider.id);
        }

        this.callbacks = forwardEvents(
            this.listener,
            this.manager,
            ['message'],
        ) as Record<string, (...args: unknown[]) => void>;

        await this.provider.start();
        this._started = true;
    }

    public async stop() {
        if (!this._started) {
            throw new NotStartedError(this.provider.id);
        }

        await this.provider.stop();
        for (const [event, callback] of Object.entries(this.callbacks ?? {})) {
            this.listener.off(event as keyof DonationEventMap, callback);
        }
        this.callbacks = undefined;
        this._started = false;
    }
}
