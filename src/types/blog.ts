export interface Author {
  id: string;
  name: string;
  role: string;
  credentials: string[];
  bio: string;
  avatarUrl: string;
  sameAs: string[]; // LinkedIn, GitHub profile URLs for Schema.org Person
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string; // 30-50 words target
}

export interface EvidenceBlock {
  id: string;
  title: string;
  claim: string;
  methodology: string;
  sourceName: string;
  sourceUrl?: string;
  dateCollected: string;
  limitations: string;
}

export interface ComparisonRow {
  feature: string;
  bricks: string;
  competitor: string;
  highlight?: boolean;
}

export interface HowToStep {
  stepNumber: number;
  verbTitle: string;
  description: string;
}

export interface CitationReference {
  id: number;
  title: string;
  sourceName: string;
  url: string;
  description?: string;
}

export interface BlogSection {
  heading: string;
  subheading?: string;
  paragraphs: string[];
  callout?: {
    type: 'note' | 'tip' | 'warning' | 'stat';
    title?: string;
    text: string;
  };
  codeBlock?: {
    language: string;
    code: string;
    caption?: string;
  };
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  readTime: string;
  category: string;
  tags: string[];
  author: Author;
  coverImage?: string;
  
  // AEO Specific Structured Elements
  definitionBlock: {
    term: string;
    definition: string;
    whyItMatters: string;
    contextDate: string;
  };
  keyTakeaways: string[];
  introduction: string[];
  
  evidencePanels?: EvidenceBlock[];
  howToSteps?: {
    title: string;
    steps: HowToStep[];
  };
  comparisonTable?: {
    title: string;
    competitorName: string;
    rows: ComparisonRow[];
    verdict: string;
  };
  
  contentSections: BlogSection[];
  
  faqs: FAQItem[];
  citations?: CitationReference[];
}
