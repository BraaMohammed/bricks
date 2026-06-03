/**
 * lib/content-extractor.ts
 *
 * Shared HTML → plain-text extraction pipeline used by the fetch-page route.
 *
 * Pipeline:
 *  1. Strip noisy DOM elements (images, scripts, nav, etc.)
 *  2. Run Mozilla Readability to isolate the main content
 *  3. Walk the resulting HTML tree, respecting block vs inline semantics,
 *     to produce clean plain text (no Markdown symbols, no concatenation bugs)
 */

import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

// ── Block vs inline classification ───────────────────────────────────────────
// Mirrors the browser's "select all → copy" behaviour:
//  - Block elements → surrounded by \n so each occupies its own line
//  - Inline elements → concatenated with surrounding text
//  - Skip elements   → discarded entirely (scripts, styles, etc.)

const BLOCK_TAGS = new Set([
    'address', 'article', 'aside', 'blockquote', 'dd', 'details', 'dialog',
    'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li',
    'main', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'tbody',
    'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);

const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'iframe', 'head']);

// ── DOM tree-walker ───────────────────────────────────────────────────────────

function walkNode(node: ChildNode): string {
    // Text node — return raw text; per-line normalisation happens in htmlToPlainText
    if (node.nodeType === 3 /* TEXT_NODE */) {
        return node.textContent ?? '';
    }
    if (node.nodeType !== 1 /* ELEMENT_NODE */) return '';

    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (SKIP_TAGS.has(tag)) return '';
    if (tag === 'br') return '\n';

    const inner = Array.from(el.childNodes).map(walkNode).join('');

    // Block element: surround with newlines so it occupies its own line(s)
    if (BLOCK_TAGS.has(tag)) {
        return `\n${inner}\n`;
    }
    return inner;
}

// ── htmlToPlainText ───────────────────────────────────────────────────────────
//
// Converts arbitrary HTML to clean plain text by:
//  1. Walking the DOM with walkNode (block/inline aware)
//  2. Normalising whitespace within each line to a single space
//  3. Dropping empty lines
//  4. Collapsing 3+ consecutive newlines to a double newline

export function htmlToPlainText(html: string): string {
    const dom = new JSDOM(html);
    const body = dom.window.document.body;
    if (!body) return '';

    const raw = Array.from(body.childNodes).map(walkNode).join('');

    return raw
        .split('\n')
        .map(line => line.replace(/[ \t\r]+/g, ' ').trim())
        .filter(line => line.length > 0)
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// ── extractReadableContent ────────────────────────────────────────────────────
//
// Full pipeline: raw HTML → Readability → htmlToPlainText → clean plain text.
//
// Returns readabilityParsed=true  when Readability found real article content.
// Returns readabilityParsed=false when it got a JS shell — callers should NOT
// treat the content as useful and should fall through to the next provider.

export interface ExtractResult {
    content: string;
    title: string;
    readabilityParsed: boolean;
}

// Elements removed from the DOM before Readability sees it
const NOISY_SELECTORS = [
    'img', 'picture', 'figure', 'figcaption',
    'svg', 'video', 'audio',
    'script', 'noscript', 'style', 'iframe',
    'nav', 'header', 'footer',
].join(',');

export function extractReadableContent(html: string, url: string): ExtractResult {
    // Strip inline <style> blocks to prevent JSDOM parsing crashes / terminal noise
    const cleanHtml = html
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<link\b[^>]*>/gi, '');

    try {
        const dom = new JSDOM(cleanHtml, { url });
        const doc = dom.window.document;

        // Remove noisy elements before Readability scores the page
        doc.querySelectorAll(NOISY_SELECTORS).forEach(el => el.remove());

        const reader = new Readability(doc);
        const article = reader.parse();

        if (article) {
            return {
                title: article.title ?? '',
                content: htmlToPlainText(article.content || ''),
                readabilityParsed: true,
            };
        }
    } catch (err) {
        console.warn('Readability parse warning:', err);
    }

    // Fallback: Readability couldn't find an article (JS-heavy SPA).
    // Return raw textContent so callers can check readabilityParsed=false.
    try {
        const dom = new JSDOM(cleanHtml);
        const text = dom.window.document.body?.textContent ?? '';
        return { title: '', content: text.replace(/\s+/g, ' ').trim(), readabilityParsed: false };
    } catch {
        return { title: '', content: '', readabilityParsed: false };
    }
}
