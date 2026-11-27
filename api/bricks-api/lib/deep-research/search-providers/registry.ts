/**
 * Agentic search provider registry.
 *
 * Each adapter implements lib/deep-research/search-providers/contract.ts.
 * Adapters are stubs until their implementation lands; the Orchestrator tool
 * loop and GET /api/deep-research/providers read through this registry.
 */

import type {
  ProviderLevel,
  SearchProviderAdapter,
  SearchProviderId,
} from './contract';

const notImplemented = (id: SearchProviderId): Error =>
  new Error(`Search provider "${id}" is not implemented yet`);

function stub(id: SearchProviderId, label: string, levels: ProviderLevel[]): SearchProviderAdapter {
  return {
    id,
    label,
    levels: () => levels,
    isConfigured: () => false,
    statusPayload: () => ({ id, label, configured: false, levels }),
    runSearch: async () => {
      throw notImplemented(id);
    },
  };
}

import { exaSearchProvider } from './exa';
import { firecrawlSearchProvider } from './firecrawl';
import { parallelSearchProvider } from './parallel';

const ADAPTERS: Record<SearchProviderId, SearchProviderAdapter> = {
  exa: exaSearchProvider,
  firecrawl: firecrawlSearchProvider,
  parallel: parallelSearchProvider,
};

export function getSearchProvider(id: SearchProviderId): SearchProviderAdapter {
  return ADAPTERS[id];
}

export function listSearchProviderStatuses() {
  return Object.values(ADAPTERS).map((adapter) => adapter.statusPayload());
}
