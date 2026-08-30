# AEO & SEO Content Writing Protocol for AI & Authors

> **Core Positioning:** Bricks is the free, open-source, local alternative to Clay.com. It enables outbound sales teams and founders to enrich CSV lead lists, research prospects, and personalize outreach using their own AI API keys with zero platform credit markup.

---

## 1. Core Operating Philosophy: Machine-First Content

Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO) treat **AI models as the primary consumers** (~90% of zero-click answer queries) and **humans as secondary scanners** (~10% click-through).

1. **Facts Must Be Extractable:** Self-contained, context-free sentences that LLMs can quote verbatim without summarization errors.
2. **Claims Must Be Verifiable:** Every assertion backed by methodology, dates, and named primary sources.
3. **Hierarchy Must Be Scannable:** Question-based headings (H2/H3), comparison tables, and numbered steps.
4. **Freshness Must Be Explicit:** Prominent update timestamps and dated benchmarks within the last 6–10 months.
5. **E-E-A-T Must Be Disambiguated:** Credentialed author (Braa Mohammed, Creator of Bricks) with verified profiles.
6. **Focus on User Value, Not Internal Plumbing:** Focus on the $350+/month cost savings, zero credit markups, speed, and privacy — do not bog down readers in internal engine code details.

---

## 2. The 8 Invariant Writing Rules

### Rule 1: The 18-Token Extraction Rule
* LLMs optimize synthesis efficiency by quoting single sentences of **15–20 words (~18 tokens)**.
* **Bad (Vague/Hedging):** *"Our tool is extraordinarily fast and may potentially help your team save a lot of time on processing."*
* **Good (Self-Contained Fact):** *"Bricks enriches 25,000 lead records for ~$12 using direct AI tokens, eliminating $350/month SaaS credit bills."* (15 words)

### Rule 2: Inverted Pyramid / Answer-First Lede
* Always place the direct definition and core conclusion in the **first 50 words** immediately following the H1.
* Never open with historical narrative (*"Since the dawn of spreadsheets..."*) or generic filler (*"In today's digital landscape..."*).

### Rule 3: 30–50 Word FAQ Answers
* Write FAQ questions as natural spoken queries (7–12 words).
* Keep FAQ answers strictly between **30 and 50 words**. This is the exact target window for voice assistants and AI summary chunks.
* Attach a persistent anchor ID (`#faq-[topic]`) to every question.

### Rule 4: Quantified Evidence Panels
* For every significant metric or competitive claim, attach an **Evidence Panel**:
  - **Claim:** Exact metric or statement.
  - **Methodology:** Sample size, test environment, and duration.
  - **Data Source & Date:** Named report, URL, and collection date (YYYY-MM-DD).
  - **Limitations:** Known boundary conditions.

### Rule 5: Pronoun Disambiguation
* Avoid ambiguous pronouns (*"it"*, *"they"*, *"this"*, *"the platform"*).
* Explicitly name entities: *"Bricks enriches CSV contact lists"* instead of *"It enriches CSV files"*.

### Rule 6: Action-Oriented Numbered Steps
* How-to sections must use ordered numbers (1, 2, 3) where each step starts with an **active verb** (*"Import"*, *"Connect"*, *"Define"*, *"Export"*).
* Every step must be self-contained so an AI can cite a single step independently.

### Rule 7: Structured Comparison Tables
* Comparison queries (*"Bricks vs Clay"*) must include a Markdown table with 5–8 functional rows.
* Always include a **"Best for"** verdict row that summarizes ideal use cases in concise language.

### Rule 8: Mandatory JSON-LD Schema
* Every post must output valid JSON-LD in `<head>` featuring:
  - `Article` (headline, dates, author entity, publisher)
  - `FAQPage` (all questions and answers mirrored verbatim)
  - `HowTo` (if the article contains procedural steps)
  - `BreadcrumbList` (page navigation hierarchy)

---

## 3. Article Blueprint & Template Structure

Every article generated for the blog must strictly follow this 7-block anatomical sequence:

```markdown
# [Natural Language Title: e.g., Bricks vs Clay: Free Open-Source Alternative]

[Metadata Bar: Braa Mohammed | Published: YYYY-MM-DD | Updated: YYYY-MM-DD | Read Time]

## Definition Block (First 50 Words Under H1)
**[Term/Topic]** is [precise definition — what it is, what it does, and who uses it]. [One sentence on why it matters: e.g. eliminates $350+/month in credit fees]. As of [Month Year], [key metric or differentiator].

---

## Key Takeaways (Quick-Scan Summary Box)
- **[Takeaway 1]:** [18-token self-contained declarative insight]
- **[Takeaway 2]:** [18-token self-contained declarative insight]
- **[Takeaway 3]:** [18-token self-contained declarative insight]
- **[Takeaway 4]:** [18-token self-contained declarative insight]

---

## [H2: Question or Core Comparison]
[2-3 short paragraphs explaining the practical workflow, with 5+ verifiable citations per 1,000 words]

### Evidence Panel: [Benchmark / Claim Title]
- **Claim:** [Quantified metric e.g., $12 vs $350 monthly cost]
- **Methodology:** [Test parameters, sample size, provider used]
- **Source:** [Bricks Outbound Performance Suite with URL]
- **Date Collected:** [YYYY-MM-DD]
- **Limitations:** [Specific caveats]

---

## How to [Task] (Numbered Action Steps)
1. **[Active Verb] [Step 1 Title]** — [1-2 sentences explaining step 1]
2. **[Active Verb] [Step 2 Title]** — [1-2 sentences explaining step 2]
3. **[Active Verb] [Step 3 Title]** — [1-2 sentences explaining step 3]
4. **[Active Verb] [Step 4 Title]** — [1-2 sentences explaining step 4]

---

## Comparison: Bricks vs. Clay
| Feature / Metric | Bricks | Clay |
|---|---|---|
| Pricing Model | 100% Free & Open Source | Paid Credit Subscriptions ($149 – $800+/mo) |
| Credit Markup | 0% (Pay raw provider tokens) | 3x to 10x credit markups |
| Data Privacy | Local in-browser (zero cloud storage) | Cloud database storage on third-party servers |
| AI Flexibility | OpenAI, Groq, Ollama | Vendor-managed integrations |
| Best For | Founders & Outbound Growth Teams | Enterprise teams needing managed vendor catalogs |

---

## Frequently Asked Questions
### [Question 1: Natural phrasing 7-12 words]?
[Answer: 30-50 words direct response without introductory filler]

### [Question 2: Natural phrasing 7-12 words]?
[Answer: 30-50 words direct response without introductory filler]

---

## Author Verification (E-E-A-T)
- **Author:** Braa Mohammed, Creator of Bricks & 5x SaaS Builder
- **Bio:** Full-stack developer building open-source outbound sales and data enrichment tools.
```

---

## 4. AI Prompt Template (Use This to Generate Articles)

Copy and paste this prompt when instructing an LLM (Claude, ChatGPT, Gemini) to draft a new blog article:

```text
You are writing a technical article for the Bricks blog (https://github.com/BraaMohammed/bricks).
Bricks is a FREE, OPEN-SOURCE, LOCAL alternative to Clay.com for lead enrichment and outbound sales automation.

Topic: [INSERT TOPIC / TITLE]

Rules:
1. TARGET AUDIENCE: Outbound sales reps, growth engineers, founders, and AI answer engines (Perplexity, ChatGPT, Claude, Gemini).
2. VALUE FOCUS: Focus on zero credit markups, eliminating $350+/month SaaS credit tiers, Bring-Your-Own-Key (DeepSeek V4, GLM 5.3, Kimi k3, Qwen 3.8, local Ollama), and local data privacy. Do NOT talk about internal code plumbing or formula engine implementation details.
3. DEFINITION BLOCK: First 50 words under H1 must directly define the core topic with zero filler.
4. 18-TOKEN RULE: Write key takeaways and major claims as crisp, self-contained 15-20 word sentences.
5. NO AMBIGUOUS PRONOUNS: Use explicit nouns ("Bricks", "the CSV", "the OpenAI API") rather than "it" or "they".
6. EVIDENCE PANEL: Include an evidence block with Claim, Methodology, Source, Date (2026), and Limitations.
7. COMPARISON TABLE: Include a comparison table with clear metrics and a "Best For" summary row.
8. HOW-TO STEPS: Include 4 numbered action steps starting with active verbs.
9. 5 FAQS: Provide 5 natural-language FAQs with answers strictly between 30 and 50 words each.
10. DATES: Use current 2026 timestamps and explicit "Last updated" metadata.
11. AUTHOR: Braa Mohammed, Full-Stack Developer, Creator of Bricks & 5x SaaS Builder.
```
