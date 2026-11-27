/**
 * sources.ts
 *
 * The Research Sources registry for the AI Deep Researcher.
 *
 * A Research Source is the assignment context for one Search Sub-Agent
 * (CONTEXT.md): the site/API it searches and the patterns that work there.
 * It never decides the table's columns. Every prompt and every Record is
 * derived from the per-run, user-approved Output Schema
 * (docs/adr/0004-output-schema-drives-the-run.md).
 */

import type { OutputSchema, ResearchSource } from './types';

const EMPTY_SCHEMA: OutputSchema = {
  fields: [],
  identityColumns: [],
  sampleRows: [],
};

function hasEnv(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function configuredApifyActorIds(): string[] {
  return (process.env.APIFY_ACTORS ?? '')
    .split(',')
    .map((actor) => actor.trim())
    .filter(Boolean);
}

function fieldsForPrompt(outputSchema: OutputSchema): string {
  if (outputSchema.fields.length === 0) {
    return '- Follow the Output Schema supplied in your task prompt; every Record must contain exactly those keys.';
  }
  return outputSchema.fields
    .map((field) => `- "${field.name}": ${field.description}`)
    .join('\n');
}

function identityColumnsForPrompt(outputSchema: OutputSchema): string {
  if (outputSchema.identityColumns.length === 0) {
    return '(none designated: deduplicate on the whole Record)';
  }
  return outputSchema.identityColumns.map((name) => `"${name}"`).join(', ');
}

/**
 * The per-source tail of every Search Sub-Agent prompt: the exact field list
 * and the dedup contract, both taken from the approved Output Schema.
 */
function recordContract(goal: string, outputSchema: OutputSchema): string {
  return `Research goal:
${goal}

Return ONLY Records whose fields exactly match this Output Schema:
${fieldsForPrompt(outputSchema)}

Identity Columns: ${identityColumnsForPrompt(outputSchema)}
- Every Record must contain exactly these keys and no others. All values must be strings.
- Use an empty string for a value you could not verify. Never invent or guess a value.
- Deduplicate Records on the Identity Columns: never return two Records with the same combination of Identity Column values.
- When no Identity Columns are designated, deduplicate on the whole Record.`;
}

// ── Registry ─────────────────────────────────────────────────────────────────

const WEB_SEARCH: ResearchSource = {
  id: 'web-search',
  name: 'Web search',
  description:
    'General web search. The always-available starting point for any research goal.',
  isAvailable: () => true,
  instructions: (goal, outputSchema) =>
    `Search the general web for this goal.
- Start with broad queries built from the goal's own vocabulary, then narrow with distinguishing details.
- Prefer first-party pages (official sites, docs, profiles, listings) and recent, dated sources over aggregators, content farms and SEO pages.
- Read promising pages with read_page when a snippet is too thin to fill a field.

${recordContract(goal, outputSchema)}`,
};

const HACKER_NEWS: ResearchSource = {
  id: 'hacker-news',
  name: 'Hacker News',
  description:
    'Hacker News posts and comment threads. Good for launches, tooling, technical products and the people behind them.',
  isAvailable: () => true,
  instructions: (goal, outputSchema) =>
    `Search Hacker News posts and comment threads.
- Prefer site:news.ycombinator.com queries; add the goal's own keywords plus terms such as "Show HN", "Ask HN", "launch" or "alternatives" when relevant.
- Launch threads and comment threads often name official websites and the people behind them. Follow links out to first-party pages with read_page before recording.
- Treat upvotes and comment claims as leads, not evidence: confirm values on the linked first-party page.

${recordContract(goal, outputSchema)}`,
};

const GITHUB: ResearchSource = {
  id: 'github',
  name: 'GitHub',
  description:
    'GitHub repositories and organisation profiles. Good for software products, open-source projects, maintainers and documentation.',
  isAvailable: () => true,
  instructions: (goal, outputSchema) =>
    `Search GitHub repositories, organisation profiles and README pages.
- Prefer site:github.com queries; add the goal's keywords and, where relevant, "org", "README" or "about".
- Repository and organisation pages are good evidence for official names, URLs, descriptions and maintainers.
- Read the README or organisation page with read_page when the snippet is thin, and follow any official website linked there.

${recordContract(goal, outputSchema)}`,
};

const REDDIT: ResearchSource = {
  id: 'reddit',
  name: 'Reddit',
  description:
    'Reddit discussion threads. Good for first-hand recommendations, niche communities and local or specialist options.',
  isAvailable: () => true,
  instructions: (goal, outputSchema) =>
    `Search Reddit discussion threads.
- Prefer site:reddit.com queries; add terms such as "recommendations", "best", "review" or the goal's niche when relevant.
- Recommendation threads often list several real candidates with first-hand context. Use them to discover candidates, then verify each one on its own first-party page before recording.
- Do not treat a commenter's opinion as a verified field value.

${recordContract(goal, outputSchema)}`,
};

const PRODUCT_HUNT: ResearchSource = {
  id: 'product-hunt',
  name: 'Product Hunt',
  description:
    'Product Hunt launches. Good for new products, early-stage companies, makers and positioning.',
  isAvailable: () => true,
  instructions: (goal, outputSchema) =>
    `Search Product Hunt launches and product pages.
- Prefer site:producthunt.com queries; add the goal's keywords plus "launch", "maker" or a relevant category when useful.
- Product pages carry the tagline, maker names and usually a link to the official site.
- Follow the official-site link and read it with read_page before recording values that must be accurate.

${recordContract(goal, outputSchema)}`,
};

const YC_DIRECTORY: ResearchSource = {
  id: 'yc-directory',
  name: 'Y Combinator directory',
  description:
    'The Y Combinator company directory. Good for startups with batch, location and one-line description facts.',
  isAvailable: () => true,
  instructions: (goal, outputSchema) =>
    `Search the Y Combinator company directory.
- Prefer site:ycombinator.com/companies queries; add the goal's keywords and, where relevant, a batch or location.
- Directory pages carry the company name, batch, location, one-line description and website.
- Read the directory page or the linked official site with read_page to confirm the values you record.

${recordContract(goal, outputSchema)}`,
};

const CRUNCHBASE_WEB: ResearchSource = {
  id: 'crunchbase-web',
  name: 'Crunchbase (public web)',
  description:
    'Public Crunchbase organisation pages. Good for funding, headquarters and company descriptions.',
  isAvailable: () => true,
  instructions: (goal, outputSchema) =>
    `Search public Crunchbase organisation pages.
- Prefer site:crunchbase.com/organization queries; add the goal's keywords and, where relevant, a location or sector.
- Public pages can be partial, paywalled or stale. Treat them as a lead and confirm values on the first-party page before recording.
- Do not invent values for fields the public page does not show.

${recordContract(goal, outputSchema)}`,
};

const APOLLO_API: ResearchSource = {
  id: 'apollo-api',
  name: 'Apollo (people search)',
  description:
    'Apollo people profile search via API. Good for role, organisation and location facts; it never returns emails or phone numbers.',
  isAvailable: () => hasEnv('APOLLO_API_KEY'),
  instructions: (goal, outputSchema) =>
    `Search Apollo people profiles with the apollo_people_search tool.
- Derive the search inputs from the goal and Output Schema: q_organization_domains for organisations, person_titles for roles and person_locations for geographies.
- Combine inputs to narrow the result set; page through only when the current page is useful.
- This endpoint returns profile search results without emails or phone numbers. Leave any field it cannot provide as an empty string; never fabricate contact details.
- Read linked public pages with read_page when a profile field needs confirmation.

${recordContract(goal, outputSchema)}`,
};

const APIFY: ResearchSource = {
  id: 'apify',
  name: 'Apify actors',
  description:
    'Configured Apify actors. Good for sites with no clean search surface that an actor already covers.',
  isAvailable: () => hasEnv('APIFY_API_TOKEN') && hasEnv('APIFY_ACTORS'),
  instructions: (goal, outputSchema) => {
    const actors = configuredApifyActorIds();
    const actorList = actors.length
      ? actors.map((actor) => `"${actor}"`).join(', ')
      : '(none configured)';
    return `Search the sites covered by the configured Apify actors.
- Use the apify_actor_run tool with one of the configured actors: ${actorList}.
- Pass a focused actor input derived from the goal; the actor's dataset items are your evidence.
- If an actor cannot return the needed values, fall back to web_search and read_page on the sites that actor covers.
- Never call an actor that is not in the configured list.

${recordContract(goal, outputSchema)}`;
  },
};

/**
 * Every Research Source this build knows about, in display order.
 * Use `isAvailable()` (or `availableResearchSources()`) to gate API sources.
 */
export const RESEARCH_SOURCES: ResearchSource[] = [
  WEB_SEARCH,
  HACKER_NEWS,
  GITHUB,
  REDDIT,
  PRODUCT_HUNT,
  YC_DIRECTORY,
  CRUNCHBASE_WEB,
  APOLLO_API,
  APIFY,
];

/** The Research Sources that can run with the current environment. */
export function availableResearchSources(): ResearchSource[] {
  return RESEARCH_SOURCES.filter((source) => source.isAvailable());
}

/** Looks up a Research Source by its stable id, whether or not it is available. */
export function getResearchSource(id: string): ResearchSource | undefined {
  const needle = id.trim().toLowerCase();
  if (!needle) return undefined;
  return RESEARCH_SOURCES.find(
    (source) => source.id.toLowerCase() === needle,
  );
}

// ── Legacy assignment bridge ─────────────────────────────────────────────────
//
// The run pipeline historically passed a pre-baked assignment object to each
// Search Sub-Agent. Keep this thin adapter so existing callers compile while
// the workflow moves to `RESEARCH_SOURCES` + `instructions(goal, outputSchema)`.

/** @deprecated Prefer passing `ResearchSource` + goal + Output Schema. */
export interface ResearchSourceAssignment {
  agentId: string;
  sourceName: string;
  name: string;
  label: string;
  description: string;
  instructions: string;
  queryHint: string;
}

function sourceAgentId(sourceId: string): string {
  return `agent-${sourceId.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
}

/** Finds a source by id or display name; availability is not checked. */
export function findResearchSource(
  idOrName: string,
): ResearchSource | undefined {
  const needle = idOrName.trim().toLowerCase();
  if (!needle) return undefined;
  return RESEARCH_SOURCES.find(
    (source) =>
      source.id.toLowerCase() === needle ||
      source.name.toLowerCase() === needle,
  );
}

/**
 * Resolves Orchestrator-requested source ids into legacy assignments, always
 * including `web-search` and capping the list. New callers should use
 * `getResearchSource` + `source.instructions(goal, outputSchema)` directly.
 */
export function resolveSourceAssignments(
  requestedIds: string[],
  maxSources: number,
  goal = '',
  outputSchema: OutputSchema = EMPTY_SCHEMA,
): ResearchSourceAssignment[] {
  const selected: ResearchSource[] = [];
  const push = (source: ResearchSource) => {
    if (selected.some((entry) => entry.id === source.id)) return;
    selected.push(source);
  };

  const webSearch = getResearchSource('web-search');
  if (webSearch) push(webSearch);

  for (const requested of requestedIds) {
    const source = findResearchSource(requested);
    if (source?.isAvailable()) push(source);
    if (selected.length >= maxSources) break;
  }

  return selected
    .slice(0, Math.max(1, maxSources))
    .map((source) => ({
      agentId: sourceAgentId(source.id),
      sourceName: source.id,
      name: source.id,
      label: source.name,
      description: source.description,
      instructions: source.instructions(goal, outputSchema),
      queryHint: source.id,
    }));
}

/** One-line catalog of Research Sources for an Orchestrator prompt. */
export function sourceCatalogForPrompt(sources: ResearchSource[]): string {
  return sources
    .map((source) => `- ${source.id} (${source.name}): ${source.description}`)
    .join('\n');
}
