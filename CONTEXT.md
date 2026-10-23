# Bricks

Bricks is a local-first data tool: you bring or generate a table of records, then enrich it. This context covers the **AI Deep Researcher** feature, which generates that table from scratch with multi-agent web research.

## Language

**AI Deep Researcher**:
The feature that turns a free-text research goal into a table of records.
_Avoid_: Sourcing, SourceAgent, Lead Finder, Exa clone

**Deep Research Run**:
One execution of the AI Deep Researcher, from the user's goal to an approved table.
_Avoid_: Session, hunt, job

**Orchestrator**:
The agent that clarifies the goal, proposes the Output Schema, spawns Search Sub-Agents, and decides when the run is done.
_Avoid_: Planner, manager, conductor, main agent

**Search Sub-Agent**:
A worker agent that searches one Research Source and returns records to the Table Builder. The Orchestrator sees only its tool-call inputs and a compact returned message, never its context.
_Avoid_: Source Researcher, subagent, worker, scout

**Coverage Reviewer**:
The step that judges whether the collected records satisfy the goal, and requests another search round if not.
_Avoid_: Observer, reviewer, critic

**Table Builder**:
The step that assembles records into the approved Output Schema and removes duplicates.
_Avoid_: Writer, compiler, normaliser

**Research Source**:
A website or API that a Search Sub-Agent searches.
_Avoid_: Provider, source site, target

**Output Schema**:
The per-run, user-approved definition of the table's fields. It is fully custom to each run; nothing about it is hardcoded.
_Avoid_: Columns, headers

**Identity Columns**:
The Output Schema fields the Orchestrator designates as identifying a record; the Table Builder deduplicates on them.
_Avoid_: Primary key, dedup key

**Record**:
One row of the resulting table.
_Avoid_: Lead, result, item
