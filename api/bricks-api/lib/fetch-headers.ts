/**
 * lib/fetch-headers.ts
 *
 * Browser-grade User-Agent rotation and header construction for the plain-fetch
 * provider. Sending realistic Sec-CH-UA + Sec-Fetch-* headers is critical:
 * Cloudflare and most WAFs flag requests where these are absent.
 */

export interface UAEntry {
    ua: string;
    secChUa: string;
    platform: string;
}

export const FETCH_USER_AGENTS: UAEntry[] = [
    // Windows Chrome 124
    {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        secChUa: '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        platform: '"Windows"',
    },
    // Windows Chrome 122
    {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        secChUa: '"Chromium";v="122", "Google Chrome";v="122", "Not-A.Brand";v="24"',
        platform: '"Windows"',
    },
    // macOS Chrome 124
    {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        secChUa: '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        platform: '"macOS"',
    },
    // macOS Safari 17
    {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
        secChUa: '"Safari";v="17"',
        platform: '"macOS"',
    },
    // Windows Edge 124
    {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
        secChUa: '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99"',
        platform: '"Windows"',
    },
];

export function pickRandomUA(): UAEntry {
    return FETCH_USER_AGENTS[Math.floor(Math.random() * FETCH_USER_AGENTS.length)];
}

export function buildFetchHeaders(uaEntry: UAEntry, url: string): Record<string, string> {
    const hostname = new URL(url).hostname;
    return {
        'User-Agent': uaEntry.ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        // Sec-CH-UA fingerprinted by Cloudflare; absence = instant bot flag
        'Sec-CH-UA': uaEntry.secChUa,
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': uaEntry.platform,
        // Sec-Fetch-* set by real browsers on every navigation request
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        // Simulate arriving from a Google search
        'Referer': `https://www.google.com/search?q=${encodeURIComponent(hostname)}`,
        'Cache-Control': 'max-age=0',
    };
}
