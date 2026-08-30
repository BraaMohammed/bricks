import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllBlogPosts } from '@/data/blogPosts';
import { BlogSEO } from '@/components/blog/BlogSEO';
import { BlogNav } from '@/components/blog/BlogNav';
import { IconoirProvider, ArrowRight, Calendar, Clock, Search, ShieldCheck } from 'iconoir-react';

const MonoLabel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`font-mono text-[11px] uppercase tracking-[0.24em] text-primary ${className}`}>
    {children}
  </span>
);

const StatusChip = ({ label, live = false }: { label: string; live?: boolean }) => (
  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
    <span className={`inline-block h-1.5 w-1.5 rounded-full ${live ? 'bg-primary brick-pulse-dot' : 'bg-muted-foreground/50'}`} />
    {label}
  </span>
);

const BlogIndex = () => {
  const posts = getAllBlogPosts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(posts.map((p) => p.category)))];

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'All' || post.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const featuredPost = posts[0];

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col">
      <IconoirProvider iconProps={{ width: '1em', height: '1em', strokeWidth: 1.5 }}>
        <div className="brick-noise" />
        <BlogSEO isIndex />
        <BlogNav />

        <main className="flex-1">
          {/* Header Hero */}
          <section className="relative border-b border-border bg-card/40 py-16 px-6">
            <div className="mx-auto max-w-[1440px]">
              <div className="flex items-center gap-3">
                <MonoLabel>Engineering & Growth Hub</MonoLabel>
                <span className="text-muted-foreground/40">/</span>
                <StatusChip label="Free & Open Source" live />
              </div>

              <h1 className="mt-4 font-display text-3xl font-black uppercase tracking-tight text-foreground sm:text-5xl lg:text-6xl max-w-4xl">
                Open-Source Data Enrichment & Outbound Research
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-mono text-muted-foreground sm:text-base leading-relaxed">
                Guides, cost comparisons, and architectural breakdowns on eliminating $350+/month SaaS credit fees with free, local-first enrichment.
              </p>

              {/* Search & Filters */}
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border/60 pt-6">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search articles, tags, or topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-4 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                        selectedCategory === cat
                          ? 'border border-primary bg-primary text-primary-foreground font-semibold'
                          : 'border border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Featured Post */}
          {featuredPost && !searchQuery && selectedCategory === 'All' && (
            <section className="mx-auto max-w-[1440px] px-6 py-12">
              <div className="mb-4 flex items-center gap-2">
                <MonoLabel>Featured Article</MonoLabel>
              </div>

              <Link
                to={`/blog/${featuredPost.slug}`}
                className="group block rounded-xl border border-border bg-card/60 p-8 transition-all hover:border-primary/80 hover:shadow-glow"
              >
                <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted-foreground">
                  <span className="rounded bg-primary/10 px-2.5 py-0.5 font-semibold text-primary uppercase tracking-wider">
                    {featuredPost.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Updated {featuredPost.updatedAt}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {featuredPost.readTime}
                  </span>
                </div>

                <h2 className="mt-4 font-display text-2xl font-bold uppercase tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-3xl lg:text-4xl">
                  {featuredPost.title}
                </h2>

                <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-3xl">
                  {featuredPost.description}
                </p>

                <div className="mt-6 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  <span>Read Full Guide</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
                </div>
              </Link>
            </section>
          )}

          {/* Posts Grid */}
          <section className="mx-auto max-w-[1440px] px-6 pb-20">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold uppercase tracking-wider text-foreground">
                {searchQuery || selectedCategory !== 'All' ? 'Filtered Results' : 'All Published Articles'}
              </h3>
              <span className="font-mono text-xs text-muted-foreground">
                {filteredPosts.length} {filteredPosts.length === 1 ? 'Article' : 'Articles'}
              </span>
            </div>

            {filteredPosts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-16 text-center">
                <p className="font-mono text-sm text-muted-foreground">
                  No articles found matching "{searchQuery}".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {filteredPosts.map((post) => (
                  <article
                    key={post.slug}
                    className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/60 hover:shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                        <span className="text-primary font-semibold">{post.category}</span>
                        <span>·</span>
                        <span>{post.readTime}</span>
                      </div>

                      <Link to={`/blog/${post.slug}`} className="group block mt-3">
                        <h4 className="font-display text-lg font-bold uppercase tracking-tight text-foreground transition-colors group-hover:text-primary leading-snug">
                          {post.title}
                        </h4>
                      </Link>

                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {post.description}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={post.author.avatarUrl}
                          alt={post.author.name}
                          className="h-6 w-6 rounded-full border border-border object-contain p-0.5"
                        />
                        <span className="font-mono text-[11px] text-foreground">
                          {post.author.name}
                        </span>
                      </div>

                      <Link
                        to={`/blog/${post.slug}`}
                        className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-primary hover:underline font-semibold"
                      >
                        <span>Read</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
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

export default BlogIndex;
