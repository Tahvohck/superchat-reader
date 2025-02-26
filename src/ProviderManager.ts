import { DonationMessage, DonationProvider } from '@app/DonationProvider.ts';
import { Combine } from '@app/util.ts';
import { SAVE_PATH, SavedConfig } from '@app/SavedConfig.ts';

/**
 * Central point for managing all chat providers.
 */
export class ProviderManager {
    private readonly providers = new Map<string, DonationProvider>();
    private config!: ProviderManagerConfig;
    private combine = new Combine<DonationMessage>();

    public async init() {
        this.config = await SavedConfig.getOrCreate(ProviderManagerConfig);
    }

    public register(
        provider: DonationProvider,
    ) {
        if (this.providers.has(provider.id)) {
            throw new Error(`Provider ${provider.name} (${provider.id}) already registered.`);
        }
        // if we find a new provider, assume we want it enabled by default.
        if (!this.config.enabled[provider.id]) this.config.enabled[provider.id] = true;
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
        this.config.enabled[id] = false;
        this.combine.remove(id);
        return await provider.deactivate();
    }

    public getActiveProviderIds(): string[] {
        return Object.entries(this.config.enabled).filter(([_, isActive]) => isActive).map(([id, _]) => id);
    }

    /**
     * Read all donation messages from all active providers. If a provider is activated/deactivated while
     * reading, the stream will be updated automatically.
     */
    public readAll(): Combine<DonationMessage> {
        return this.combine;
    }
}

class ProviderManagerConfig extends SavedConfig {
    [SAVE_PATH] = "providers.json";

    public readonly enabled: Record<string, boolean> = {};
}
