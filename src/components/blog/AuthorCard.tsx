import React from 'react';
import { Author } from '@/types/blog';
import { Github, Globe, ShieldCheck } from 'iconoir-react';

interface AuthorCardProps {
  author: Author;
  publishedAt: string;
  updatedAt: string;
}

export const AuthorCard: React.FC<AuthorCardProps> = ({
  author,
  publishedAt,
  updatedAt,
}) => {
  return (
    <div className="my-10 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <img
          src={author.avatarUrl}
          alt={author.name}
          className="h-16 w-16 rounded-xl border border-border bg-muted/40 object-contain p-2 shrink-0"
        />

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <h4 className="font-display text-base font-bold uppercase tracking-tight text-foreground">
              {author.name}
            </h4>
            <span className="flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-3 w-3" />
              Verified Author
            </span>
          </div>

          <p className="font-mono text-xs text-primary">{author.role}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{author.bio}</p>

          <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
            {author.credentials.map((cred, idx) => (
              <span
                key={idx}
                className="rounded-md border border-border/80 bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {cred}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 font-mono text-[11px] text-muted-foreground">
        <div>
          <span>Published: </span>
          <time dateTime={publishedAt} className="text-foreground">
            {publishedAt}
          </time>
          <span className="mx-2">·</span>
          <span>Last Updated: </span>
          <time dateTime={updatedAt} className="font-semibold text-primary">
            {updatedAt}
          </time>
        </div>

        <div className="flex items-center gap-4">
          {author.sameAs.map((url, i) => {
            const isGithub = url.includes('github.com');
            const isLinkedin = url.includes('linkedin.com');
            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground hover:underline"
              >
                {isGithub ? (
                  <Github className="h-3.5 w-3.5" />
                ) : isLinkedin ? (
                  <span className="font-mono font-bold text-[10px] text-primary">in</span>
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                <span>{isGithub ? 'GitHub' : isLinkedin ? 'LinkedIn' : 'Website'}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
};
