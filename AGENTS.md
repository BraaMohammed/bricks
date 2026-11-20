# agents.md

if you're an agent reading this: get bricks running for someone who doesn't
want to learn a terminal. ask one question, wait, do the step yourself, then
ask the next. no walls of commands.

if another file disagrees with this one, this one wins. tell me so i fix it.

## facts

don't guess these. each is checked in the file named.

| fact | value | where |
|---|---|---|
| hosted ui | https://usebricks.xyz | README.md |
| local ui | http://localhost:8080 | vite.config.ts |
| api base | http://localhost:3000 | src/hooks/useBackendStatus.ts |
| api up-check | GET http://localhost:3000/api/ai/v1/models | src/hooks/useBackendStatus.ts |
| needs | node 18+ and npm, nothing else | README.md |
| api env file | api/bricks-api/.env.local | api/bricks-api/README.md |

bricks is a spreadsheet where each column runs an operation: ai prompt, web
search agent, puppeteer script, js formula, email finder. the ui (react 18 +
vite) is the shell. the api (next.js 15, port 3000) does the work. no
database, no docker, no python, nothing to build first.

## before you start

```bash
node -v
npm -v
```

missing or below v18: stop, send them to the lts installer on nodejs.org, wait.
don't install node. v18.x works, but next 15 wants 18.18+, so mention it.

## step 1 — the repo

ask: "do you already have the bricks folder on this computer?"

yes → cd into it, confirm `api/bricks-api/package.json` exists. no:

```bash
git clone https://github.com/BraaMohammed/bricks.git
cd bricks
```

## step 2 — pick the ui

ask: "hosted ui at usebricks.xyz, or the ui on your own machine?"

hosted is the normal answer: nothing to install, one browser flag later. local
is fully offline, costs a second `npm install` and dev server. remember it.

## step 3 — install the api

```bash
cd api/bricks-api
npm install
```

slow: puppeteer downloads a chromium build. if that fails, run it once more.

## step 4 — the env file

```bash
cp .env.example .env.local
```

then say this in your own words:

> every line is optional. keys can also go into the ui settings later and are
> sent per request. the file only matters if you want the backend's own
> pieces — ai waterfall, scraper fallbacks, email checks — keyed up front.

the one thing that changes results: with no `SERPER_API_KEY` and no
`TAVILY_API_KEY`, search falls back to scraping duckduckgo — slower, throttled.

never ask for keys in chat or echo one back.

## step 5 — start the api, prove it's up

```bash
npm run dev
```

leave it running. from a second shell:

```bash
curl -s http://localhost:3000/api/ai/v1/models
```

json with a `data` array means up, even if empty — that just means no ai
provider keys yet. connection refused means it isn't running; read its output.

## step 6 — the browser step

ask which browser they use.

**hosted ui** → chrome, edge, brave block a public https page from calling
`http://localhost`. everything breaks until this is off:

1. paste `chrome://flags/#local-network-access-check` in the address bar
2. set it to **disabled**
3. click **relaunch**

firefox and safari skip this.

**local ui** → nothing to do. the api already sends
`Access-Control-Allow-Origin: *`, so 8080 can call 3000 as-is.

then open the ui. it uses `http://localhost:3000` by default, remembers the
url under the `backend_api_url` key, and probes 3001 if 3000 is silent.
offline while the api is running? hard refresh, then check the url in settings.

## step 7 — how ai runs

click the settings gear. two routes.

**their own key** — paste an openai, gemini or groq key. it goes to the local
api per request, nothing stored server-side.

**ollama** — free, local, needs both: `setx OLLAMA_ORIGINS "*"` on windows
(or `export OLLAMA_ORIGINS="*"` on mac/linux), plus the url
`http://localhost:11434` in the ollama section.

then fully quit ollama from the tray or menu bar and start it again. it reads
that variable at boot, so a running copy ignores it.

then test one row before the whole column. a broken column over 500 rows burns
credit fast.

## when it breaks

| symptom | likely cause | fix |
|---|---|---|
| ui says offline | api not running, or wrong url | curl the up-check, then look at settings |
| everything fails on the hosted ui | local network access block | step 6 |
| search slow or empty | no serper/tavily key, duckduckgo throttled | add `SERPER_API_KEY`, restart the api |
| ollama won't connect | `OLLAMA_ORIGINS` set, ollama never restarted | quit it fully, start it again |
| puppeteer times out | bundled chromium missing, or the site wants a real browser | read the api log, then set `PUPPETEER_BROWSER_PATH` to installed chrome |
| cloudflare provider skipped | account id typo | code reads `CLOUDFLARE_ACCOUNT_ID`, falls back to `CLOUDFLARE_ACOUNT_ID` |

## rules i don't break

- one question at a time. ask the one that unblocks the next step.
- no command without one short sentence on what it does.
- never say "that should work now". run the check, report what came back.
- no keys in chat, commits, or `.env.example`. `.env.local` only, gitignored.
- no `npm run build` as a smoke test. dev mode is enough.
- touch nothing but `api/bricks-api/.env.local`. setup, not refactor.
- when a step here turns out wrong, fix this file before you finish.

## done means

- the up-check curl returns json
- the ui loads and shows the api connected
- they know where the settings gear is, and that ctrl+c stops the api

then hand back and stop asking questions.
