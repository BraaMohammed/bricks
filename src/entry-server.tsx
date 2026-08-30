import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import BlogIndex from './pages/BlogIndex';
import BlogPost from './pages/BlogPost';
import NotFound from './pages/NotFound';
import { BLOG_POSTS, getBlogPostBySlug } from './data/blogPosts';
import { getBlogSEOData } from './components/blog/BlogSEO';

export { BLOG_POSTS, getBlogPostBySlug, getBlogSEOData };

// Server-side routes strictly for prerendering public pages (Landing & Blog)
// Dynamic spreadsheet app (/app) runs entirely on the client
const ServerRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route
      path="/app"
      element={
        <div className="flex min-h-screen items-center justify-center bg-background font-mono text-xs text-muted-foreground">
          Loading Bricks Workspace...
        </div>
      }
    />
    <Route path="/blog" element={<BlogIndex />} />
    <Route path="/blog/:slug" element={<BlogPost />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export function render(url: string) {
  const html = ReactDOMServer.renderToString(
    <StaticRouter location={url}>
      <ServerRoutes />
    </StaticRouter>
  );
  return { html };
}
