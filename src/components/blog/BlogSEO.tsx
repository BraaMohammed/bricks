import { useEffect } from 'react';
import { BlogPost } from '@/types/blog';

interface BlogSEOProps {
  post?: BlogPost;
  isIndex?: boolean;
  title?: string;
  description?: string;
}

export function getBlogSEOData(post?: BlogPost, isIndex = false, customTitle?: string, customDescription?: string) {
  const siteTitle = 'Bricks — Free Open-Source Clay Alternative';
  const pageTitle = post
    ? `${post.title} | Bricks`
    : customTitle
    ? `${customTitle} | Bricks`
    : `Engineering & Growth Blog | ${siteTitle}`;

  const metaDescription = post
    ? post.description
    : customDescription ||
      'Free, open-source Clay.com alternative for local-first lead enrichment and AI workflows with zero credit markups.';

  const baseUrl = 'https://usebricks.xyz';
  const canonicalUrl = post ? `${baseUrl}/blog/${post.slug}` : `${baseUrl}/blog`;

  let structuredData: any = null;

  if (post) {
    const graph: any[] = [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'Bricks',
        url: baseUrl,
        logo: `${baseUrl}/logo-1.png`,
        sameAs: ['https://github.com/BraaMohammed/bricks'],
      },
      {
        '@type': 'Person',
        '@id': `${baseUrl}/authors/${post.author.id}`,
        name: post.author.name,
        jobTitle: post.author.role,
        description: post.author.bio,
        sameAs: post.author.sameAs,
      },
      {
        '@type': 'Article',
        '@id': `${canonicalUrl}#article`,
        isPartOf: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        mainEntityOfPage: canonicalUrl,
        author: {
          '@id': `${baseUrl}/authors/${post.author.id}`,
        },
        publisher: {
          '@id': `${baseUrl}/#organization`,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: baseUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: `${baseUrl}/blog`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: canonicalUrl,
          },
        ],
      },
    ];

    if (post.faqs && post.faqs.length > 0) {
      graph.push({
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: post.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      });
    }

    if (post.howToSteps) {
      graph.push({
        '@type': 'HowTo',
        '@id': `${canonicalUrl}#howto`,
        name: post.howToSteps.title,
        step: post.howToSteps.steps.map((s) => ({
          '@type': 'HowToStep',
          position: s.stepNumber,
          name: s.verbTitle,
          text: s.description,
        })),
      });
    }

    structuredData = {
      '@context': 'https://schema.org',
      '@graph': graph,
    };
  } else if (isIndex) {
    structuredData = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Bricks Engineering & Growth Blog',
      description:
        'Technical guides, zero-credit lead enrichment patterns, and local-first AI workflows.',
      url: `${baseUrl}/blog`,
      publisher: {
        '@type': 'Organization',
        name: 'Bricks',
        url: baseUrl,
        logo: `${baseUrl}/logo-1.png`,
      },
    };
  }

  return {
    pageTitle,
    metaDescription,
    canonicalUrl,
    structuredData,
  };
}

export const BlogSEO = ({ post, isIndex = false, title, description }: BlogSEOProps) => {
  useEffect(() => {
    const seo = getBlogSEOData(post, isIndex, title, description);
    document.title = seo.pageTitle;

    let descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta) {
      descMeta = document.createElement('meta');
      descMeta.setAttribute('name', 'description');
      document.head.appendChild(descMeta);
    }
    descMeta.setAttribute('content', seo.metaDescription);

    const scriptId = 'aeo-jsonld-schema';
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.remove();
    }

    if (seo.structuredData) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.text = JSON.stringify(seo.structuredData);
      document.head.appendChild(script);
    }

    return () => {
      const s = document.getElementById(scriptId);
      if (s) s.remove();
    };
  }, [post, isIndex, title, description]);

  return null;
};
