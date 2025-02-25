import { DonationMessage, DonationProvider, ProviderConfig } from '@app/DonationProvider.ts';
import { Combine } from '@app/util.ts';

/**
 * Central point for managing all chat providers.
 */
export class ProviderManager {
    private readonly providers = new Map<string, DonationProvider>();
    private config!: ProviderManagerConfig;
    private combine = new Combine<DonationMessage>();

    public async init() {
        this.config = await ProviderConfig.load(ProviderManagerConfig);
    }

    public register(
        provider: DonationProvider,
    ) {
        if (this.providers.has(provider.id)) {
            throw new Error(`Provider ${provider.name} (${provider.id}) already registered.`);
        }
        // if we find a new provider, assume we want it enabled by default.
        if (!this.config[provider.id]) this.config[provider.id] = true;
        this.providers.set(provider.id, provider);
    }

    public async activate(id: string): Promise<boolean> {
        const provider = this.providers.get(id);
        if (!provider) return false;
        const success = await provider.activate();
        if (success) {
            this.combine.add(id, provider.process());
        }
        return success;
    }

    public async activateAll() {
        for (const provider of this.getActiveProviderIds()) {
            const success = await this.activate(provider);
            if (!success) {
                console.error(`Failed to activate provider ${provider}.`);
            }
        }
    }

    public async deactivateAll() {
        for (const provider of this.getActiveProviderIds()) {
            const success = await this.deactivate(provider);
            if (!success) {
                console.error(`Failed to deactivate provider ${provider}.`);
            }
        }
    }

    public async deactivate(id: string): Promise<boolean> {
        const provider = this.providers.get(id);
        if (!provider) return false;
        this.config[id] = false;
        this.combine.remove(id);
        return await provider.deactivate();
    }

    public getActiveProviderIds(): string[] {
        return Object.entries(this.config).filter(([_, isActive]) => isActive).map(([id, _]) => id);
    }

    /**
     * Read all donation messages from all active providers. If a provider is activated/deactivated while
     * reading, the stream will be updated automatically.
     */
    public readAll(): Combine<DonationMessage> {
        return this.combine;
    }
}

class ProviderManagerConfig extends ProviderConfig {
    constructor() {
        super('providers.json');
    }
}

// this is a *kind of* ugly hack to make computed types work with interface merging.
// we want to use ProviderConfig for automatic saving, but index restrictions on classes are too strict and there's no good way to trap nested objects.
// so this will have to do.
type ProviderManagerConfigMapped = { [key: string]: boolean };
interface ProviderManagerConfig extends ProviderManagerConfigMapped {}
