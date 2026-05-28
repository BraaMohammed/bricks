import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import * as fs from 'fs';

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
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    if (article) {
        console.log('Readability parsed successfully!');
        console.log('Title:', article.title);
        const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
        const md = turndownService.turndown(article.content || '');
        console.log('Markdown length:', md.length);
        console.log('Preview:', md.substring(0, 500));
    } else {
        console.log('Readability failed to parse (article is null).');
    }
}

run().catch(console.error);
