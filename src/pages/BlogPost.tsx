import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { getBlogPostBySlug, getRelatedBlogPosts } from '@/data/blogPosts';
import { BlogSEO } from '@/components/blog/BlogSEO';
import { BlogNav } from '@/components/blog/BlogNav';
import { DefinitionBlock } from '@/components/blog/DefinitionBlock';
import { QuickSummaryBox } from '@/components/blog/QuickSummaryBox';
import { EvidencePanel } from '@/components/blog/EvidencePanel';
import { ComparisonTable } from '@/components/blog/ComparisonTable';
import { HowToSteps } from '@/components/blog/HowToSteps';
import { FAQSection } from '@/components/blog/FAQSection';
import { AuthorCard } from '@/components/blog/AuthorCard';
import { ReferencesSection } from '@/components/blog/ReferencesSection';
import { IconoirProvider, ArrowLeft, ArrowRight, Calendar, Clock, ShareAndroid, Check, Copy } from 'iconoir-react';
import { toast } from 'sonner';

const MonoLabel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`font-mono text-[11px] uppercase tracking-[0.24em] text-primary ${className}`}>
    {children}
  </span>
);

/** Helper to render in-text citation badges [1], [2] as clickable links */
const renderParagraphWithCitations = (text: string) => {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/\[(\d+)\]/);
    if (match) {
      const citeNum = match[1];
      return (
        <a
          key={i}
          href={`#ref-${citeNum}`}
          title={`Jump to Reference [${citeNum}]`}
          className="ml-0.5 inline-flex items-center text-xs font-mono font-bold text-primary hover:underline"
        >
          <sup>[{citeNum}]</sup>
        </a>
      );
    }
    return part;
  });
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;
  const [copiedCodeIdx, setCopiedCodeIdx] = React.useState<number | null>(null);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const relatedPosts = getRelatedBlogPosts(post.slug);

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: post.title,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Article link copied to clipboard');
    }
  };

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    toast.success('Code snippet copied');
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col">
      <IconoirProvider iconProps={{ width: '1em', height: '1em', strokeWidth: 1.5 }}>
        <div className="brick-noise" />
        <BlogSEO post={post} />
        <BlogNav />

        <main className="flex-1 py-12 px-6">
          <article className="mx-auto max-w-4xl">
            {/* Breadcrumb Bar */}
            <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link to="/blog" className="hover:text-foreground transition-colors">
                Blog
              </Link>
              <span>/</span>
              <span className="truncate text-foreground font-semibold">{post.category}</span>
            </nav>

            {/* Article Header */}
            <header className="border-b border-border pb-8">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted-foreground">
                <span className="rounded bg-primary/10 px-2.5 py-0.5 font-semibold text-primary uppercase tracking-wider">
                  {post.category}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Updated {post.updatedAt}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {post.readTime}
                </span>
              </div>

              <h1 className="mt-4 font-display text-2xl font-black uppercase tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-tight">
                {post.title}
              </h1>

              <p className="mt-4 text-base text-muted-foreground leading-relaxed sm:text-lg">
                {post.description}
              </p>

              {/* Author Byline Bar */}
              <div className="mt-6 flex items-center justify-between gap-4 border-t border-border/60 pt-4">
                <div className="flex items-center gap-3">
                  <img
                    src={post.author.avatarUrl}
                    alt={post.author.name}
                    className="h-10 w-10 rounded-full border border-border bg-muted/40 object-contain p-1"
                  />
                  <div>
                    <p className="font-display text-sm font-bold text-foreground">
                      {post.author.name}
                    </p>
                    <p className="font-mono text-[10px] text-primary">{post.author.role}</p>
                  </div>
                </div>

                <button
                  onClick={handleShare}
                  className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  aria-label="Share article"
                >
                  <ShareAndroid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </header>

            {/* 1. Direct Definition Block (AEO Pattern 1) */}
            <DefinitionBlock
              term={post.definitionBlock.term}
              definition={post.definitionBlock.definition}
              whyItMatters={post.definitionBlock.whyItMatters}
              contextDate={post.definitionBlock.contextDate}
            />

            {/* 2. Key Takeaways Quick-Scan Box (AEO Pattern 7) */}
            <QuickSummaryBox takeaways={post.keyTakeaways} />

            {/* 3. Editorial Introduction (Long-Form Prose) */}
            <div className="my-8 space-y-5 text-base leading-relaxed text-foreground/90 font-sans">
              {post.introduction.map((para, idx) => (
                <p key={idx}>{renderParagraphWithCitations(para)}</p>
              ))}
            </div>

            {/* 4. Evidence Panels (AEO Pattern 5) */}
            {post.evidencePanels &&
              post.evidencePanels.map((evidence) => (
                <EvidencePanel key={evidence.id} evidence={evidence} />
              ))}

            {/* 5. Rich Editorial Content Sections */}
            <div className="my-10 space-y-12">
              {post.contentSections.map((section, idx) => (
                <section key={idx} className="space-y-4">
                  <h2 className="font-display text-xl font-bold uppercase tracking-tight text-foreground sm:text-2xl border-b border-border/50 pb-2.5">
                    {section.heading}
                  </h2>

                  {section.subheading && (
                    <p className="font-mono text-xs text-primary uppercase tracking-wider font-semibold">
                      {section.subheading}
                    </p>
                  )}

                  <div className="space-y-4 text-base leading-relaxed text-foreground/90 font-sans">
                    {section.paragraphs.map((p, pIdx) => (
                      <p key={pIdx}>{renderParagraphWithCitations(p)}</p>
                    ))}
                  </div>

                  {/* Section Callout if present */}
                  {section.callout && (
                    <div className="my-6 rounded-lg border border-primary/30 bg-primary/[0.04] p-5">
                      {section.callout.title && (
                        <h4 className="font-mono text-xs uppercase tracking-wider font-bold text-primary mb-1">
                          {section.callout.title}
                        </h4>
                      )}
                      <p className="text-sm text-foreground/90 leading-relaxed font-sans">
                        {section.callout.text}
                      </p>
                    </div>
                  )}

                  {/* Code Block if present */}
                  {section.codeBlock && (
                    <div className="my-6 overflow-hidden rounded-xl border border-border bg-card">
                      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2 font-mono text-[11px] text-muted-foreground">
                        <span>{section.codeBlock.caption || section.codeBlock.language}</span>
                        <button
                          onClick={() => copyCode(section.codeBlock!.code, idx)}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {copiedCodeIdx === idx ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>{copiedCodeIdx === idx ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="overflow-x-auto p-4 font-mono text-xs text-foreground/90 leading-relaxed bg-background/50">
                        <code>{section.codeBlock.code}</code>
                      </pre>
                    </div>
                  )}
                </section>
              ))}
            </div>

            {/* 6. Comparison Table (AEO Pattern 3) */}
            {post.comparisonTable && (
              <ComparisonTable
                title={post.comparisonTable.title}
                competitorName={post.comparisonTable.competitorName}
                rows={post.comparisonTable.rows}
                verdict={post.comparisonTable.verdict}
              />
            )}

            {/* 7. Numbered How-To Steps (AEO Pattern 2) */}
            {post.howToSteps && (
              <HowToSteps
                title={post.howToSteps.title}
                steps={post.howToSteps.steps}
              />
            )}

            {/* 8. FAQ Section with Anchors & 30-50 Word Answers (AEO Pattern 4) */}
            <FAQSection faqs={post.faqs} />

            {/* 9. Formal References & Bibliography Section (External Citations) */}
            {post.citations && <ReferencesSection citations={post.citations} />}

            {/* 10. Author & E-E-A-T Verification Card */}
            <AuthorCard
              author={post.author}
              publishedAt={post.publishedAt}
              updatedAt={post.updatedAt}
            />

            {/* Related Articles */}
            {relatedPosts.length > 0 && (
              <section className="my-16 border-t border-border pt-10">
                <div className="mb-6 flex items-center gap-2">
                  <MonoLabel>Related Guides</MonoLabel>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {relatedPosts.map((rel) => (
                    <Link
                      key={rel.slug}
                      to={`/blog/${rel.slug}`}
                      className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary hover:shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-primary font-semibold">
                          {rel.category}
                        </span>
                        <h4 className="mt-2 font-display text-base font-bold uppercase text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {rel.title}
                        </h4>
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {rel.description}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center gap-1 font-mono text-xs text-primary font-semibold">
                        <span>Read article</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Back Navigation */}
            <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
              <Link
                to="/blog"
                className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to all articles</span>
              </Link>

              <Link
                to="/app"
                className="flex items-center gap-1.5 rounded-md border border-primary bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary-glow"
              >
                <span>Launch Bricks App</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        </main>

        {/* Industrial Footer matching Landing.tsx */}
        <footer className="border-t border-border mt-auto">
          <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-6 py-8 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground md:flex-row">
            <div className="flex items-center gap-2.5">
              <img src="/logo-1.png" alt="Bricks logo" className="h-6 w-6 shrink-0 object-contain" />
              <span className="font-display text-base font-black uppercase tracking-tight text-foreground">BRICKS</span>
              <span className="border-l border-border pl-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                free lite-weight clay alternative
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://github.com/BraaMohammed/bricks" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">GitHub</a>
              <Link to="/blog" className="transition-colors text-primary hover:text-foreground">Blog</Link>
              <Link to="/app" className="transition-colors hover:text-foreground">App</Link>
            </div>
            <span>
              Credits used: <span className="text-primary">$0.00</span> <span className="brick-blink ml-2 text-primary">▮</span>
            </span>
          </div>
        </footer>
      </IconoirProvider>
    </div>
  );
};

export default BlogPost;
