# The Output Schema drives the whole run; nothing is hardcoded

Each Deep Research Run has a fully user-approved Output Schema, within which the Orchestrator designates the Identity Columns. Source selection, sub-agent prompts, deduplication, and the final table all derive from that schema. No output fields, dedup keys, or record types are hardcoded, because the same feature must serve arbitrary research goals (companies, people, job posts, anything). The Table Builder deduplicates on the designated Identity Columns, falling back to whole-record matching if none are designated.
