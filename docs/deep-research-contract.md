# AI Deep Researcher — Backend Contract

Vocabulary lives in `CONTEXT.md`; decisions in `docs/adr/`. This file documents
the HTTP surface the frontend consumes and the SSE event stream it renders.

Backend base URL: `SELF_BASE_URL` (server-to-server) and the frontend's
`backend_api_url` localStorage value (default `http://127.0.0.1:3000`).

## `POST /api/deep-research/chat`

Clarification turn with the Orchestrator.

```jsonc
// request
{ "runId": "uuid | null", "messages": [{ "role": "user", "content": "..." }] }

// response
{
  "runId": "uuid",
  "reply":
    { "kind": "clarification", "text": "..." }
  | { "kind": "output_schema_proposal", "text": "...", "outputSchema": { /* below */ } }
}
```

`OutputSchema`:

```jsonc
{
  "fields": [{ "name": "company_name", "description": "..." }],
  "identityColumns": ["company_name", "website"],
  "sampleRows": [{ "company_name": "...", "website": "..." }] // 3 fake examples
}
```

Identity Columns are chosen per run by the Orchestrator; the Table Builder
deduplicates on them. Nothing about the schema is hardcoded (ADR-0004).

## `POST /api/deep-research/run` (SSE)

Approved schema in, live events out. Each line is `data: {JSON}\n\n`.

```jsonc
{ "runId": "uuid", "outputSchema": { /* approved */ }, "targetCount": 5 }
```

| event | payload |
|---|---|
| `deep_research_started` | `{ runId, sources: [{ agentId, sourceName }] }` |
| `orchestrator_token_delta` | `{ text }` |
| `search_sub_agent_started` | `{ agentId, sourceName }` |
| `search_sub_agent_token_delta` | `{ agentId, text }` |
| `search_sub_agent_tool_call` | `{ agentId, toolName, toolInput }` |
| `search_sub_agent_finished` | `{ agentId, recordsFound, summary }` |
| `search_sub_agent_failed` | `{ agentId, error }` |
| `coverage_review_completed` | `{ decision: "sufficient" \| "research_more", reason, reSpinNumber }` |
| `table_records_ready` | `{ records: Record<string,string>[] }` |
| `deep_research_completed` | `{ totalRecords }` |
| `deep_research_failed` | `{ error }` |

A Record's keys are exactly the approved Output Schema field names.

## `GET /api/deep-research/runs/[id]`

```jsonc
{ "run": { "id", "goal", "status", "outputSchema", "messages", "records", "createdAt", "updatedAt" } }
```

Statuses: `clarifying` · `schema_proposed` · `researching` · `completed` · `failed`.

## Caps (environment variables)

| variable | default |
|---|---|
| `DEEP_RESEARCH_MAX_SOURCES` | 6 |
| `DEEP_RESEARCH_MAX_TOOL_CALLS_PER_SUB_AGENT` | 8 |
| `DEEP_RESEARCH_MAX_RECORDS` | 150 |
| `DEEP_RESEARCH_MAX_RESPINS` | 2 |
| `DEEP_RESEARCH_MAX_WALL_CLOCK_MS` | 900000 |
| `DEEP_RESEARCH_MODEL` | `gemini-3.1-flash-lite` |

Hitting a cap yields **partial results plus `deep_research_completed`** — never
`deep_research_failed`.

## Model note

Search Sub-Agents use tools. Gemini 3.x models differ in whether they require a
`thought_signature` when replaying function calls; `gemini-3.1-flash-lite` works
without it, so it is the default. `gemini-3.5-flash` rejects tool continuations
with `Function call is missing a thought_signature`, and `gemini-2.5-flash`
does not call tools. Override with `DEEP_RESEARCH_MODEL` if needed.

## Streaming route

`POST /api/ai/v1/chat/completions/stream` is the OpenAI-compatible SSE sibling
of the AI waterfall (`runWaterfallStream`). It streams only OpenAI-compatible
providers (Cloudflare excluded), falls back only before the first token, and
passes tool-call deltas through.
