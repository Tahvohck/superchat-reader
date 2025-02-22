import { DonationMessage, DonationProvider, ProviderConfig } from '@app/DonationProvider.ts';
import { Combine } from '@app/util.ts';

/**
 * Central point for managing all chat providers.
 */
export class ProviderManager {
    private readonly providers = new Map<string, DonationProvider>();
    private config!: ProviderManagerConfig;

    public async init() {
        this.config = await ProviderConfig.load(ProviderManagerConfig);
    }

    public register(
        provider: DonationProvider,
    ) {
        if (this.providers.has(provider.id)) throw new Error(`Provider ${provider.name} (${provider.id}) already registered.`);
        // if we find a new provider, assume we want it enabled by default.
        if (!this.config[provider.id]) this.config[provider.id] = true;
        this.providers.set(provider.id, provider);
    }

    public async activate(id: string): Promise<boolean> {
        const provider = this.providers.get(id);
        if (!provider) return false;
        return await provider.activate();
    }

    public async activateAll() {
        for (const provider of this.getActiveProviders()) {
            const success = await provider.activate();
            if (!success) {
                console.error(`Failed to activate provider ${provider.name} (${provider.id}).`);
            }
        }
    }

    public async deactivateAll() {
        for (const provider of this.getActiveProviders()) {
            const success = await provider.deactivate();
            if (!success) {
                console.error(`Failed to deactivate provider ${provider.name} (${provider.id}).`);
            }
        }
    }

    public async deactivate(id: string): Promise<boolean> {
        const provider = this.providers.get(id);
        if (!provider) return false;
        this.config[id] = false;
        return await provider.deactivate();
    }

    public getActiveProviders(): DonationProvider[] {
        return Array.from(this.providers.values()).filter(provider => this.config[provider.id]);
    }

    // TODO: we need to figure out how exactly to handle config menus.
    // Do we configure providers as they're loaded, store the ConfigurationBuilders, and append the HTML immediately, or do we configure them on-the-fly?

    public readAll(): Combine<DonationMessage> {
        const combine = new Combine<DonationMessage>();

        for (const provider of this.getActiveProviders()) {
            combine.add(provider.id, provider.process());
        }

        return combine;
    }
}



class ProviderManagerConfig extends ProviderConfig {
    constructor() {
        super("providers.json")
    }
}

// this is a *kind of* ugly hack to make computed types work with interface merging.
// we want to use ProviderConfig for automatic saving, but index restrictions on classes are too strict and there's no good way to trap nested objects.
// so this will have to do.
type ProviderManagerConfigMapped = { [key: string]: boolean };
interface ProviderManagerConfig extends ProviderManagerConfigMapped {}