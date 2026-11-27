# Coverage review is LLM-first

After each search round, the Coverage Reviewer decides whether the collected records satisfy the goal, and it is an LLM call rather than deterministic count/coverage checks, because a record count can be satisfied while the records themselves are wrong and only judgement catches that. A hard cap on re-spins bounds the cost and guarantees the run terminates. Considered and rejected: deterministic-first with LLM escalation (a bad-but-numerous result would pass the cheap check and never escalate).
