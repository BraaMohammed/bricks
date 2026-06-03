import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

// ── DOM tree-walker (mirrors route.ts) ───────────────────────────────────────

const BLOCK_TAGS = new Set([
    'address','article','aside','blockquote','dd','details','dialog','div',
    'dl','dt','fieldset','figcaption','figure','footer','form','h1','h2',
    'h3','h4','h5','h6','header','hgroup','hr','li','main','nav','ol','p',
    'pre','section','summary','table','tbody','td','tfoot','th','thead',
    'tr','ul',
]);
const SKIP_TAGS = new Set(['script','style','noscript','iframe','head']);

function walkNode(node: ChildNode): string {
    if (node.nodeType === 3) return node.textContent ?? '';
    if (node.nodeType !== 1) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag)) return '';
    if (tag === 'br') return '\n';
    const inner = Array.from(el.childNodes).map(walkNode).join('');
    if (BLOCK_TAGS.has(tag)) return `\n${inner}\n`;
    return inner;
}

function htmlToPlainText(html: string): string {
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

// ── Test runner ───────────────────────────────────────────────────────────────

async function run() {
    const apiKey = 'a9a695a91b5241128db34498bab31b6d23d54d2fc12';
    const url = 'https://wellfound.com/company/sudowrite/jobs';
    const scrapeDoUrl = `https://api.scrape.do/?token=${apiKey}&url=${encodeURIComponent(url)}&render=true&super=true`;

    console.log('Fetching HTML from scrape.do...');
    const res = await fetch(scrapeDoUrl);
    const html = await res.text();
    console.log('HTML length:', html.length);

    console.log('Parsing with Readability...');
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    const noisySelectors = [
        'img', 'picture', 'figure', 'figcaption',
        'svg', 'video', 'audio',
        'script', 'noscript', 'style', 'iframe',
        'nav', 'header', 'footer',
    ];
    doc.querySelectorAll(noisySelectors.join(',')).forEach(el => el.remove());

    const reader = new Readability(doc);
    const article = reader.parse();

    if (article) {
        console.log('Readability parsed successfully!');
        console.log('Title:', article.title);

        const text = htmlToPlainText(article.content || '');
        console.log('Text length:', text.length);
        console.log('\nFull output:\n---');
        console.log(text);
        console.log('---');
    } else {
        console.log('Readability failed to parse (article is null).');
    }
}

run().catch(console.error);
