import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Safe DOM & Storage polyfills for Node.js SSR
const memoryStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => memoryStorage.get(key) || null,
  setItem: (key, val) => memoryStorage.set(key, String(val)),
  removeItem: (key) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
  key: (i) => Array.from(memoryStorage.keys())[i] || null,
  get length() {
    return memoryStorage.size;
  },
};

const mockElement = () => ({
  style: {},
  setAttribute: () => {},
  getAttribute: () => null,
  appendChild: () => {},
  removeChild: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dataset: {},
});

globalThis.document = {
  title: '',
  documentElement: mockElement(),
  head: mockElement(),
  body: mockElement(),
  createElement: mockElement,
  createTextNode: (text = '') => ({ textContent: text, nodeValue: text }),
  createDocumentFragment: () => mockElement(),
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
};

if (!globalThis.window) {
  globalThis.window = globalThis;
}
globalThis.window.document = globalThis.document;
globalThis.window.addEventListener = () => {};
globalThis.window.removeEventListener = () => {};
globalThis.window.matchMedia = () => ({
  matches: false,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
});

if (!globalThis.navigator) {
  globalThis.navigator = { userAgent: 'node' };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toAbsolute = (p) => path.resolve(__dirname, '..', p);

async function prerender() {
  console.log('🚀 Starting Vite Static Site Prerendering (SSG/SSR)...');

  const template = fs.readFileSync(toAbsolute('dist/index.html'), 'utf-8');
  const serverEntryPath = path.resolve(__dirname, '../dist-ssr/entry-server.js');

  if (!fs.existsSync(serverEntryPath)) {
    throw new Error(
      `Server entry not found at ${serverEntryPath}. Run 'vite build --ssr src/entry-server.tsx --outDir dist-ssr' first.`
    );
  }

  const { render, BLOG_POSTS, getBlogSEOData } = await import(
    `file://${serverEntryPath.replace(/\\/g, '/')}`
  );

  const routesToPrerender = [
    {
      url: '/',
      title: 'Bricks — Free Open-Source Clay Alternative',
      desc: 'Free, open-source Clay.com alternative for lead enrichment, CSV research, and AI outbound pipelines with zero credit markups.',
    },
    { url: '/blog', isBlogIndex: true },
    ...BLOG_POSTS.map((post) => ({
      url: `/blog/${post.slug}`,
      post,
    })),
  ];

  for (const route of routesToPrerender) {
    console.log(`  📄 Prerendering: ${route.url}`);

    const { html: appHtml } = render(route.url);

    let pageTitle = 'Bricks — Free Open-Source Clay Alternative';
    let metaDesc = 'Free, open-source Clay.com alternative for local lead enrichment.';
    let jsonLdScript = '';

    if (route.post) {
      const seo = getBlogSEOData(route.post, false);
      pageTitle = seo.pageTitle;
      metaDesc = seo.metaDescription;
      if (seo.structuredData) {
        jsonLdScript = `<script type="application/ld+json">\n${JSON.stringify(
          seo.structuredData,
          null,
          2
        )}\n    </script>`;
      }
    } else if (route.isBlogIndex) {
      const seo = getBlogSEOData(undefined, true);
      pageTitle = seo.pageTitle;
      metaDesc = seo.metaDescription;
      if (seo.structuredData) {
        jsonLdScript = `<script type="application/ld+json">\n${JSON.stringify(
          seo.structuredData,
          null,
          2
        )}\n    </script>`;
      }
    }

    let finalHtml = template
      .replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`)
      .replace(
        /<meta\s+name=["']description["'][^>]*\/?>/,
        `<meta name="description" content="${metaDesc.replace(/"/g, '&quot;')}" />`
      )
      .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

    if (jsonLdScript) {
      finalHtml = finalHtml.replace('</head>', `  ${jsonLdScript}\n  </head>`);
    }

    // Determine output file path
    const filePath = route.url === '/' ? 'dist/index.html' : `dist${route.url}/index.html`;

    const dir = path.dirname(toAbsolute(filePath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(toAbsolute(filePath), finalHtml);
    console.log(`    ✅ Generated: ${filePath}`);
  }

  // Generate public sitemap.xml
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://usebricks.xyz/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://usebricks.xyz/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
${BLOG_POSTS.map(
  (post) => `  <url>
    <loc>https://usebricks.xyz/blog/${post.slug}</loc>
    <lastmod>${post.updatedAt}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
).join('\n')}
</urlset>`;

  fs.writeFileSync(toAbsolute('dist/sitemap.xml'), sitemapXml);
  console.log('  🗺️ Generated: dist/sitemap.xml');

  // Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://usebricks.xyz/sitemap.xml
`;
  fs.writeFileSync(toAbsolute('dist/robots.txt'), robotsTxt);
  console.log('  🤖 Generated: dist/robots.txt');

  console.log('✨ Static Prerendering Complete! All routes are 100% crawler-ready on first byte.');
}

prerender().catch((err) => {
  console.error('❌ Prerendering failed:', err);
  process.exit(1);
});
