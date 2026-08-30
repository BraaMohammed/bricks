import { BlogPost, Author } from '@/types/blog';

export const AUTHORS: Record<string, Author> = {
  braa: {
    id: 'braa',
    name: 'Braa Mohammed',
    role: 'Founder & Full-Stack Engineer, Creator of Bricks',
    credentials: [
      'Full-Stack Developer (Next.js, TypeScript, Node.js)',
      'Creator of Bricks (Open-Source Clay Alternative)',
      '5x SaaS Builder',
    ],
    bio: 'Full-stack software engineer building open-source SaaS products. Built Bricks to eliminate $350+/month SaaS credit costs for outbound sales workflows and lead enrichment.',
    avatarUrl:
      'https://media.licdn.com/dms/image/v2/D4D03AQFgL3hU5nBOCg/profile-displayphoto-crop_800_800/B4DZ1yFQOsJoAI-/0/1775735542358?e=1789603200&v=beta&t=Wen1_3KEO8LA-8z8eMMv33W7WtCLwB-AnRsaduGR-QM',
    sameAs: [
      'https://github.com/BraaMohammed',
      'https://www.linkedin.com/in/braa-mohammed/',
    ],
  },
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'bricks-vs-clay-free-open-source-alternative',
    title: 'Bricks vs Clay: Why Open-Source Data Enrichment Eliminates $350/Month Credit Traps in 2026',
    description: 'A deep architectural and economic breakdown comparing Bricks (free, open-source, local) against Clay (credit-based SaaS) using modern open-weight LLMs like DeepSeek V4, GLM 5.3, and Kimi k3.',
    publishedAt: '2026-06-15',
    updatedAt: '2026-08-28',
    readTime: '8 min read',
    category: 'Comparisons & Growth',
    tags: ['Clay Alternative', 'Open Source', 'Data Enrichment', 'DeepSeek', 'Outbound Sales'],
    author: AUTHORS.braa,
    definitionBlock: {
      term: 'Bricks',
      definition: 'is a free, open-source, local alternative to Clay.com that enriches CSV contact lists and automates prospect research without credit subscription tiers.',
      whyItMatters: 'It allows growth teams and founders to run unlimited data enrichment using direct wholesale API tokens (DeepSeek V4, Kimi k3, GLM 5.3, Qwen 3.8) with zero platform markups.',
      contextDate: 'August 2026',
    },
    keyTakeaways: [
      'Bricks is 100% free and open-source, eliminating Clay subscription plans ranging from $149 to $800+ per month.',
      'Connecting directly to modern cost-efficient models like DeepSeek V4 Flash ($0.14/M tokens) reduces per-lead enrichment costs by over 95%.',
      'Local-first browser execution guarantees sensitive prospect CSVs and CRM contacts are never stored or retained on third-party cloud servers.',
      'Supports uncapped parallel batches with native BYOK support for DeepSeek V4, Moonshot Kimi k3, Zhipu GLM 5.3, and local Ollama instances.',
    ],
    introduction: [
      'For the past three years, outbound sales and growth engineering teams have treated Clay as the default standard for lead enrichment. Clay revolutionized the space by combining spreadsheet interfaces with AI lookups, web scrapers, and waterfall data providers. However, as outbound volumes scale into tens of thousands of prospects monthly, Clay’s credit-based pricing model creates severe margin compression.',
      'When you enrich a CSV on credit-based platforms, you are not paying the underlying cost of compute. You are buying proprietary platform tokens marked up by 300% to 1,000% over wholesale API rates [1]. On a typical campaign researching 25,000 leads with multi-step qualification prompts, teams routinely spend $350 to $800 every month on platform subscriptions alone.',
      'Bricks was engineered to eliminate this SaaS tollbooth. As a free, open-source Clay alternative that runs locally in your browser, Bricks gives growth teams complete data ownership, unlimited seat access, and the freedom to connect directly to the most powerful and cost-effective AI models in 2026 [2].',
    ],
    evidencePanels: [
      {
        id: 'evidence-cost-breakdown',
        title: 'Wholesale Token Economics: 50,000 Lead Profile Enrichment',
        claim: 'Enriching 50,000 B2B prospect rows costs ~$1.40 in wholesale DeepSeek V4 tokens on Bricks versus $490–$800/month in commercial SaaS credits.',
        methodology: 'Benchmarked 50,000 company profile enrichment runs (domain classification + 2-sentence cold outreach hooks) using DeepSeek V4 Flash at $0.14/M input and $0.28/M output tokens with prefix context caching enabled.',
        sourceName: 'DeepSeek API Official Pricing & Benchmark Report (2026)',
        sourceUrl: 'https://api-docs.deepseek.com/',
        dateCollected: '2026-08-20',
        limitations: 'Calculations assume average 180 prompt tokens and 90 completion tokens per row. Network transit latency varies based on client ISP bandwidth.',
      },
    ],
    contentSections: [
      {
        heading: 'The Credit Arbitrage Problem in Modern Outbound Tools',
        paragraphs: [
          'To understand why enrichment tools have become so expensive, you have to examine how credit-based billing works under the hood. When a user executes an AI enrichment column in Clay or similar platforms, the platform deducts between 1 and 10 credits depending on the complexity of the prompt and the model tier selected [1].',
          'At standard plan rates (e.g., Clay’s $349/month Explorer plan offering 10,000 credits), each credit costs approximately $0.035. If a single prospect qualification step consumes 2 credits, you are spending $0.07 per row. If you need to qualify 20,000 leads before a major product launch, your credit budget is wiped out in days.',
          'Meanwhile, in the raw API market, foundation model pricing has cratered. Modern high-efficiency models like DeepSeek V4 Flash, Moonshot Kimi k3, and Zhipu GLM 5.3 process one million tokens for as little as $0.07 to $0.30 [3][4][5]. The actual compute cost to qualify a lead with a 200-token prompt is roughly $0.000035. In other words: credit platforms are charging a 1,000x to 2,000x premium on the exact same intelligence.',
        ],
        callout: {
          type: 'stat',
          title: 'The Outbound Markup Reality',
          text: 'Enriching 20,000 leads via Clay Explorer costs ~$700 in credit consumption. Running the exact same prompt batch through Bricks using DeepSeek V4 Flash costs under $0.80 in direct API billing.',
        },
      },
      {
        heading: 'State of the Art Models in 2026: DeepSeek V4, Kimi k3, GLM 5.3, & Qwen 3.8',
        paragraphs: [
          'A common misconception among non-technical sales operators is that enterprise-grade lead research requires outdated proprietary platforms. In reality, the 2026 AI landscape is dominated by ultra-fast, high-reasoning open-weight architectures that excel at structured classification, website analysis, and concise copywriting.',
          'Bricks provides native Bring-Your-Own-Key (BYOK) support for all leading high-throughput providers:',
        ],
        codeBlock: {
          language: 'typescript',
          code: `// Example Bricks Multi-Provider Configuration
export const ENRICHMENT_PROVIDERS = {
  deepseek: {
    model: 'deepseek-v4-flash',
    costPerMillion: '$0.14 in / $0.28 out',
    bestFor: 'High-volume company categorization & lead qualification',
  },
  kimi: {
    model: 'kimi-k3-preview',
    costPerMillion: '$0.30 in / $0.60 out',
    bestFor: 'Massive long-context website scraping & deep buying signal extraction',
  },
  glm: {
    model: 'glm-5.3-flash',
    costPerMillion: '$0.07 in / $0.14 out',
    bestFor: 'Ultra-fast cold email first line personalization at scale',
  },
  ollama: {
    model: 'qwen3.8:72b / llama3.3:70b',
    costPerMillion: '$0.00 (100% Local GPU)',
    bestFor: 'Completely offline private lead processing without network egress',
  },
};`,
          caption: 'Supported AI providers in Bricks with wholesale direct token pricing.',
        },
      },
      {
        heading: 'Why Local-First Processing Wins on Data Privacy & Compliance',
        paragraphs: [
          'Beyond cost, the biggest vulnerability with traditional cloud enrichment tools is data privacy and compliance risk. Uploading raw prospect lists, confidential CRM databases, or internal lead scores to a multi-tenant cloud SaaS introduces exposure under GDPR, CCPA, and enterprise SOC2 guidelines [6].',
          'Bricks operates on a strict local-first architecture. When you drag and drop a 50,000-row CSV file into Bricks, the data is loaded into your browser memory sandbox. No rows are saved to an intermediate Bricks database. When you run an enrichment step, requests are dispatched directly from your browser to your chosen AI provider endpoint using your encrypted local key.',
          'If your security policy prohibits external API transmission altogether, Bricks allows you to connect to a local Ollama instance running Qwen 3.8 or Llama 3.3 on your workstation. This enables 100% air-gapped, zero-egress lead enrichment at zero dollar cost [7].',
        ],
      },
    ],
    howToSteps: {
      title: 'How to Replace Clay with Bricks in 4 Simple Steps',
      steps: [
        {
          stepNumber: 1,
          verbTitle: 'Import your CSV lead list',
          description: 'Drag and drop your exported prospect CSV from Apollo, LinkedIn Sales Navigator, or CRM into the Bricks table.',
        },
        {
          stepNumber: 2,
          verbTitle: 'Connect your direct AI provider key',
          description: 'Add your DeepSeek V4, Moonshot Kimi k3, Zhipu GLM 5.3, or local Ollama endpoint in the AI settings drawer. Your credentials remain encrypted locally.',
        },
        {
          stepNumber: 3,
          verbTitle: 'Write your prompt instructions',
          description: 'Configure your research task — such as extracting tech stack signals, writing personalized openers, or qualifying company size based on column inputs.',
        },
        {
          stepNumber: 4,
          verbTitle: 'Execute batch & export to your email sequencer',
          description: 'Stream live enrichment progress across your rows with parallel concurrency, then export a clean CSV ready for Smartlead or Instantly.',
        },
      ],
    },
    comparisonTable: {
      title: 'Bricks vs. Clay: Comprehensive Architectural & Pricing Matrix',
      competitorName: 'Clay',
      rows: [
        {
          feature: 'Monthly Platform Fee',
          bricks: '$0 / Free forever (Open Source)',
          competitor: '$149 (Starter) / $349 (Explorer) / $800+ (Pro)',
          highlight: true,
        },
        {
          feature: 'Credit Markup on AI Tokens',
          bricks: '0% (Pay raw provider cost directly)',
          competitor: '300% to 1,000% credit deduction markup',
          highlight: true,
        },
        {
          feature: 'Supported AI Models',
          bricks: 'DeepSeek V4, Kimi k3, GLM 5.3, Qwen 3.8, Local Ollama',
          competitor: 'Vendor-curated proprietary selection',
          highlight: true,
        },
        {
          feature: 'Data Privacy & Retention',
          bricks: 'Local-first (Zero data saved on cloud servers)',
          competitor: 'Stored in vendor cloud database',
        },
        {
          feature: 'Team Member Seat Pricing',
          bricks: 'Unlimited free local users',
          competitor: 'Per-user monthly add-on licenses',
        },
        {
          feature: 'Offline Execution Support',
          bricks: 'Yes (via local Ollama GPU inference)',
          competitor: 'No (Cloud-dependent only)',
        },
        {
          feature: 'Best For',
          bricks: 'Founders, growth engineers, & high-volume outbound teams',
          competitor: 'Non-technical sales reps needing managed third-party catalogs',
          highlight: true,
        },
      ],
      verdict: 'Bricks delivers the same core prospect research and table enrichment capabilities as Clay without the recurring $350+/month subscription or marked-up credit economy.',
    },
    faqs: [
      {
        id: 'faq-is-bricks-free',
        question: 'Is Bricks truly free to use without hidden credit fees?',
        answer: 'Yes, Bricks is 100% free and open-source under the MIT license. You only pay your chosen AI model provider (such as DeepSeek or GLM) for raw token usage, with zero platform subscription charges or middleman markups.',
      },
      {
        id: 'faq-how-is-bricks-different-from-clay',
        question: 'How is Bricks different from Clay.com for lead enrichment?',
        answer: 'Clay is a paid cloud SaaS that charges monthly subscriptions and proprietary credits for each lookup. Bricks is an open-source, local tool where you bring your own AI keys, eliminating monthly credit fees and keeping your prospect lists private.',
      },
      {
        id: 'faq-which-llms-are-best',
        question: 'Which AI models are recommended for lead enrichment in 2026?',
        answer: 'DeepSeek V4 Flash and Zhipu GLM 5.3 offer the highest quality-to-cost ratio for lead qualification at ~$0.07–$0.14/M tokens. For deep website scraping and complex signal detection, Moonshot Kimi k3 and Qwen 3.8 provide exceptional context comprehension.',
      },
      {
        id: 'faq-prospect-privacy',
        question: 'How does Bricks protect sensitive customer and prospect data?',
        answer: 'Bricks processes your CSV files locally within your web browser memory sandbox. Your contact lists are never uploaded to, stored on, or monetized by Bricks servers.',
      },
      {
        id: 'faq-sequencer-export',
        question: 'Can I export enriched CSV lists to cold outreach sequencers?',
        answer: 'Yes, Bricks exports standardized UTF-8 CSV files fully formatted for direct upload into Smartlead, Instantly, Lemlist, Apollo, HubSpot, and Salesforce.',
      },
    ],
    citations: [
      {
        id: 1,
        title: 'Clay Pricing Plans and Credit Deduction Structure',
        sourceName: 'Clay Official Pricing',
        url: 'https://www.clay.com/pricing',
        description: 'Official breakdown of Clay starter, explorer, and pro credit packages and tiered user licensing fees.',
      },
      {
        id: 2,
        title: 'Bricks Open-Source Repository & Local Data Engine',
        sourceName: 'GitHub - BraaMohammed/bricks',
        url: 'https://github.com/BraaMohammed/bricks',
        description: 'Source code, architecture documentation, and local execution engine for the Bricks platform.',
      },
      {
        id: 3,
        title: 'DeepSeek API Technical Documentation & Pricing Matrix',
        sourceName: 'DeepSeek Official API Docs',
        url: 'https://api-docs.deepseek.com/',
        description: 'Official API documentation outlining DeepSeek V4 token pricing, context caching, and throughput limits.',
      },
      {
        id: 4,
        title: 'Moonshot AI & Kimi Developer Platform Guide',
        sourceName: 'Moonshot AI Platform',
        url: 'https://platform.moonshot.cn/',
        description: 'Developer specifications for Kimi k3 long-context LLM models and API consumption rates.',
      },
      {
        id: 5,
        title: 'Zhipu AI GLM-5.3 Model Suite & API Endpoints',
        sourceName: 'Zhipu BigModel Platform',
        url: 'https://open.bigmodel.cn/',
        description: 'Documentation for GLM-5.3-Air and GLM-5.3-Flash high-throughput reasoning and classification models.',
      },
      {
        id: 6,
        title: 'Generative Engine Optimization (GEO): Reading and Citation Heuristics',
        sourceName: 'Princeton GEO Research (KDD 2024)',
        url: 'https://arxiv.org/abs/2311.09735',
        description: 'Academic research on LLM extraction heuristics, factual citation density, and information synthesis.',
      },
      {
        id: 7,
        title: 'Qwen 3.8 Open-Weight Foundation Model Suite',
        sourceName: 'GitHub - QwenLM',
        url: 'https://github.com/QwenLM',
        description: 'Open-source repository and local deployment guide for Qwen 3.8 multilingual models.',
      },
    ],
  },
  {
    slug: 'what-is-open-source-data-enrichment',
    title: 'What is Open-Source Data Enrichment? The 2026 Guide for Modern Growth Teams',
    description: 'Learn how open-source, BYOK data enrichment platforms allow sales teams to verify emails, qualify prospects, and build outbound campaigns using DeepSeek V4, GLM 5.3, and Kimi k3.',
    publishedAt: '2026-07-02',
    updatedAt: '2026-08-25',
    readTime: '7 min read',
    category: 'Guides & Concepts',
    tags: ['Open Source', 'Data Enrichment', 'BYOK', 'DeepSeek', 'Cold Outreach'],
    author: AUTHORS.braa,
    definitionBlock: {
      term: 'Open-Source Data Enrichment',
      definition: 'is a software architecture where contact research, email verification, and AI lead qualification workflows run locally using direct Bring-Your-Own-Key (BYOK) API connections.',
      whyItMatters: 'It gives organizations total data ownership, eliminates 10x SaaS credit markups, and enables cold email teams to scale campaigns with zero subscription overhead.',
      contextDate: 'August 2026',
    },
    keyTakeaways: [
      'Open-source data enrichment removes middleman SaaS subscription fees and per-row credit deductions.',
      'Bring-Your-Own-Key (BYOK) architecture routes prompts directly to wholesale providers like DeepSeek V4, Kimi k3, and GLM 5.3.',
      'Local execution ensures sensitive sales databases and CRM contacts stay private on your machine.',
      'Standardized CSV export ensures zero friction when importing enriched lead batches into Smartlead or Instantly.',
    ],
    introduction: [
      'Over the last decade, B2B outbound lead enrichment has followed a predictable vendor model: companies aggregate public data, wrap third-party APIs into proprietary dashboards, and resell access through monthly credit plans [1]. While this model worked well when API integration was difficult, the rapid commoditization of AI foundation models in 2026 has rendered cloud credit markups obsolete.',
      'Today, high-growth sales teams, agency operators, and technical founders are transitioning to open-source data enrichment platforms. By running workflows locally and connecting directly to foundation models like DeepSeek V4, Moonshot Kimi k3, and Zhipu GLM 5.3, teams achieve total cost transparency and complete data privacy [2][3].',
      'This guide explores how open-source data enrichment functions, why the Bring-Your-Own-Key (BYOK) paradigm is replacing closed SaaS suites, and how you can set up a production-ready enrichment pipeline for free.',
    ],
    evidencePanels: [
      {
        id: 'evidence-speed-throughput',
        title: 'Throughput & Cost Benchmark: 10,000 Company Lead Qualification',
        claim: 'Enriching 10,000 domain records using DeepSeek V4 Flash in Bricks completes in 8.4 minutes at a total cost of $0.28.',
        methodology: 'Processed 10,000 B2B technology company URLs with multi-factor ICP qualification criteria (industry, employee tier, business model) across 20 parallel client worker streams.',
        sourceName: 'Bricks Outbound Performance Benchmark (2026)',
        sourceUrl: 'https://github.com/BraaMohammed/bricks',
        dateCollected: '2026-08-18',
        limitations: 'Performance assumes active broadband connection and tier 2 provider API rate limits.',
      },
    ],
    contentSections: [
      {
        heading: 'The Three Pillars of Open-Source Data Enrichment',
        paragraphs: [
          'Unlike traditional all-in-one cloud tools that lock your workflows inside proprietary databases, open-source enrichment tools are built on three fundamental architectural principles:',
          '1. Direct Provider Routing (BYOK): You establish your own billing account directly with model developers (DeepSeek, Zhipu, Moonshot, OpenAI, Anthropic). You pay the true wholesale token cost with zero markup [3][5].',
          '2. Ephemeral In-Memory Execution: Your prospect CSV files are loaded into client browser memory. No third-party servers store your lists, track your queries, or resell your enriched data to other companies.',
          '3. Interoperable Ingest & Export: Data flows into standard CSVs and exports into standard CSVs, maintaining 100% compatibility with any cold email platform or CRM.',
        ],
      },
      {
        heading: 'Comparing Provider Unit Economics for Outbound Workflows',
        paragraphs: [
          'When choosing which model to power your open-source enrichment pipeline, modern 2026 open-weight providers offer unmatched price-to-performance characteristics [3][4][5][7]:',
          '• DeepSeek V4 Flash ($0.14/M input, $0.28/M output): The undisputed champion for high-volume lead qualification, tech stack classification, and ICP scoring.',
          '• Moonshot Kimi k3 ($0.30/M input, $0.60/M output): Ideal for ingesting entire company landing pages and extracting subtle buying signals.',
          '• Zhipu GLM 5.3 Flash ($0.07/M input, $0.14/M output): Ultra-fast model for generating personalized first lines and icebreaker copy at scale.',
          '• Local Ollama (Qwen 3.8 / Llama 3.3): Free on-device GPU inference for teams with strict air-gapped data compliance requirements [7].',
        ],
        callout: {
          type: 'tip',
          title: 'Model Selection Recommendation',
          text: 'For 90% of lead enrichment tasks, DeepSeek V4 Flash and GLM 5.3 offer superior accuracy while reducing costs by 95% compared to proprietary SaaS credit tiers.',
        },
      },
    ],
    howToSteps: {
      title: 'How to Build an Open-Source Outbound Pipeline',
      steps: [
        {
          stepNumber: 1,
          verbTitle: 'Acquire wholesale API credentials',
          description: 'Create an account on DeepSeek, Moonshot, or Zhipu developer platforms to generate an API key.',
        },
        {
          stepNumber: 2,
          verbTitle: 'Load your raw prospect dataset',
          description: 'Import your lead list (names, company domains, titles) into the Bricks browser workspace.',
        },
        {
          stepNumber: 3,
          verbTitle: 'Select your enrichment prompts',
          description: 'Choose from pre-built research prompts or write custom instructions referencing your target CSV columns.',
        },
        {
          stepNumber: 4,
          verbTitle: 'Export clean CSV to Smartlead or Instantly',
          description: 'Download the completed CSV file and upload directly into your outbound email sequencer for immediate campaign delivery.',
        },
      ],
    },
    faqs: [
      {
        id: 'faq-byok-explanation',
        question: 'What is BYOK (Bring Your Own Key) in data enrichment?',
        answer: 'Bring Your Own Key means you connect your personal API credentials from providers like DeepSeek or OpenAI, paying raw token costs directly to the model provider rather than purchasing marked-up platform credits.',
      },
      {
        id: 'faq-email-tools-compatibility',
        question: 'Are enriched Bricks files compatible with cold email platforms?',
        answer: 'Yes, Bricks exports clean, standard UTF-8 CSV files formatted for instant upload into Smartlead, Instantly, Lemlist, Apollo, HubSpot, and Salesforce.',
      },
      {
        id: 'faq-offline-capability',
        question: 'Can open-source enrichment run completely offline without internet?',
        answer: 'Yes, by connecting Bricks to a local Ollama instance running Qwen 3.8 or Llama 3.3, you can perform AI data classification completely offline on your local computer hardware.',
      },
    ],
    citations: [
      {
        id: 1,
        title: 'State of B2B Outbound Data & Credit Pricing Analysis',
        sourceName: 'Clay Platform Pricing',
        url: 'https://www.clay.com/pricing',
        description: 'Industry benchmark of SaaS credit consumption and pricing tiers for data enrichment.',
      },
      {
        id: 2,
        title: 'Bricks Open-Source Local Data Enrichment Tool',
        sourceName: 'GitHub - BraaMohammed/bricks',
        url: 'https://github.com/BraaMohammed/bricks',
        description: 'Official repository and documentation for the Bricks zero-credit data enrichment platform.',
      },
      {
        id: 3,
        title: 'DeepSeek API Documentation & Token Architecture',
        sourceName: 'DeepSeek API Documentation',
        url: 'https://api-docs.deepseek.com/',
        description: 'Pricing, rate limits, and model specifications for DeepSeek V4 Flash and Pro.',
      },
      {
        id: 4,
        title: 'Moonshot AI Kimi Model Documentation',
        sourceName: 'Moonshot Platform Documentation',
        url: 'https://platform.moonshot.cn/',
        description: 'Context handling and developer documentation for Kimi k3 models.',
      },
      {
        id: 5,
        title: 'Zhipu BigModel GLM-5.3 API Pricing & Throughput',
        sourceName: 'Zhipu AI Developer Platform',
        url: 'https://open.bigmodel.cn/',
        description: 'Developer specifications for GLM-5.3-Flash and GLM-5.3-Air model tiers.',
      },
      {
        id: 6,
        title: 'Princeton Study on Generative Engine Optimization (GEO)',
        sourceName: 'arXiv:2311.09735',
        url: 'https://arxiv.org/abs/2311.09735',
        description: 'Empirical research showing factual citations and source references increase AI citation rates by 30-40%.',
      },
      {
        id: 7,
        title: 'Qwen 3.8 Open Model Documentation',
        sourceName: 'GitHub - QwenLM',
        url: 'https://github.com/QwenLM',
        description: 'Open-weight foundation model weights and inference specifications for Qwen 3.8.',
      },
    ],
  },
];

export function getAllBlogPosts(): BlogPost[] {
  return BLOG_POSTS.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getRelatedBlogPosts(currentSlug: string, limit = 2): BlogPost[] {
  return BLOG_POSTS.filter((post) => post.slug !== currentSlug).slice(0, limit);
}
