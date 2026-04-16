import { NextRequest, NextResponse } from 'next/server';
import { promises as dns } from 'dns';

export const runtime = 'nodejs';
export const maxDuration = 60;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── Shared response type ──────────────────────────────────────────────────────

export interface ValidateEmailResponse {
    email: string;
    /** Normalized status the AI agent will act on */
    status: 'valid' | 'invalid' | 'catch_all' | 'service_error';
    /** Which service/layer produced this result */
    service: string;
    /** Human-readable reason from the service */
    reason: string;
    error: string | null;
}

// ── Layer 0: DNS / MX pre-filter (free, no credits spent) ────────────────────

async function hasMxRecords(domain: string): Promise<boolean> {
    try {
        const records = await dns.resolveMx(domain);
        return records.length > 0;
    } catch {
        // DNS error or NXDOMAIN → treat as no records
        return false;
    }
}

// ── Service 1: QuickEmailVerification ────────────────────────────────────────
//
// GET https://api.quickemailverification.com/v1/verify?apikey=KEY&email=EMAIL
// Response: { result: "valid"|"invalid"|"unknown", reason, accept_all, safe_to_send, success }
// Stop on: result=invalid   Cascade on: result=unknown or HTTP error

async function checkWithQuickEmailVerification(
    email: string,
    apiKey: string,
): Promise<ValidateEmailResponse> {
    const url = `https://api.quickemailverification.com/v1/verify?apikey=${apiKey}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!res.ok) {
        throw new Error(`QuickEmailVerification HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (!data.success) {
        throw new Error(`QuickEmailVerification API error: ${data.message ?? 'unknown error'}`);
    }

    if (data.result === 'invalid') {
        return {
            email, status: 'invalid', service: 'quickemailverification',
            reason: data.reason ?? 'rejected_email', error: null,
        };
    }
    if (data.result === 'valid' && data.accept_all) {
        return {
            email, status: 'catch_all', service: 'quickemailverification',
            reason: 'catch_all_domain', error: null,
        };
    }
    if (data.result === 'valid') {
        return {
            email, status: 'valid', service: 'quickemailverification',
            reason: data.reason ?? 'accepted_email', error: null,
        };
    }
    // result === 'unknown' — can't confirm, cascade to next service
    throw new Error(`QuickEmailVerification: unknown result (${data.reason ?? 'no reason'})`);
}

// ── Service 2: BillionVerify ────────────────────────────────────────────────
//
// POST https://api.billionverify.com/v1/verify/single
// Auth: BV-API-KEY header
// Body: { email }   (check_smtp omitted — defaults to false, saves latency)
// Response: { success, code, message, data: {
//     status: "valid"|"invalid"|"unknown"|"catchall"|"role"|"disposable",
//     score: 0–1, is_deliverable, is_disposable, is_catchall, is_role, is_free,
//     reason: string|null, credits_used } }
// Stop on: valid|catchall|role|invalid|disposable
// Cascade on: unknown or HTTP error
// Free tier: 100 credits/day

async function checkWithBillionVerify(
    email: string,
    apiKey: string,
): Promise<ValidateEmailResponse> {
    const res = await fetch('https://api.billionverify.com/v1/verify/single', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'BV-API-KEY': apiKey,
        },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(20000),
    });

    if (res.status === 429) {
        throw new Error('BillionVerify: rate limit exceeded (429)');
    }
    if (!res.ok) {
        throw new Error(`BillionVerify HTTP ${res.status} ${res.statusText}`);
    }

    const body = await res.json();

    if (!body.success) {
        throw new Error(`BillionVerify API error: ${body.error?.message ?? body.message ?? 'unknown error'}`);
    }

    const data = body.data ?? {};
    const status: string = data.status ?? '';

    // valid — confirmed deliverable
    if (status === 'valid') {
        return {
            email, status: 'valid', service: 'billionverify',
            reason: data.reason ?? 'accepted_email', error: null,
        };
    }
    // catchall — domain accepts all mail (also guarded by is_catchall flag)
    if (status === 'catchall' || data.is_catchall) {
        return {
            email, status: 'catch_all', service: 'billionverify',
            reason: 'catch_all_domain', error: null,
        };
    }
    // role — role-based address (info@, support@…), score ~0.6, usually deliverable
    if (status === 'role' || data.is_role) {
        return {
            email, status: 'valid', service: 'billionverify',
            reason: 'role_address', error: null,
        };
    }
    // disposable — throwaway/temporary email, score ~0.3
    if (status === 'disposable' || data.is_disposable) {
        return {
            email, status: 'invalid', service: 'billionverify',
            reason: 'disposable_email', error: null,
        };
    }
    // invalid — confirmed undeliverable
    if (status === 'invalid') {
        return {
            email, status: 'invalid', service: 'billionverify',
            reason: data.reason ?? 'rejected_email', error: null,
        };
    }
    // unknown → cascade to next service
    throw new Error(`BillionVerify: uncertain result — status=${status}`);
}

// ── Service 3: MillionVerifier ───────────────────────────────────────────────
//
// GET https://api.millionverifier.com/api/v3/?api=KEY&email=EMAIL&timeout=10
// Response: { result: "ok"|"catch_all"|"invalid"|"unknown"|"disposable",
//             quality: "good"|"bad"|"unknown", resultcode, subresult, error }
// result="ok" → valid   result="catch_all" → catch_all   result="invalid" → invalid
// Cascade on: unknown|disposable or error field set or HTTP error
// Free tier: 500 credits total

async function checkWithMillionVerifier(
    email: string,
    apiKey: string,
): Promise<ValidateEmailResponse> {
    const url = `https://api.millionverifier.com/api/v3/?api=${apiKey}&email=${encodeURIComponent(email)}&timeout=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });

    if (!res.ok) {
        throw new Error(`MillionVerifier HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    // API-level error (e.g. invalid_api_key, insufficient_credits)
    if (data.error && data.error !== '') {
        throw new Error(`MillionVerifier API error: ${data.error}`);
    }

    const result: string = data.result ?? '';

    if (result === 'ok') {
        return {
            email, status: 'valid', service: 'millionverifier',
            reason: data.subresult ?? 'accepted_email', error: null,
        };
    }
    if (result === 'catch_all') {
        return {
            email, status: 'catch_all', service: 'millionverifier',
            reason: 'catch_all_domain', error: null,
        };
    }
    if (result === 'invalid') {
        return {
            email, status: 'invalid', service: 'millionverifier',
            reason: data.subresult ?? 'rejected_email', error: null,
        };
    }
    // unknown, disposable → cascade
    throw new Error(`MillionVerifier: uncertain result — result=${result}, quality=${data.quality}`);
}

// ── Service 4: Verifalia ──────────────────────────────────────────────────────
//
// POST https://api.verifalia.com/v2.7/email-validations?waitTime=30000
// Auth: HTTP Basic (username:password)
// Submit job → if 202 poll until Completed → read entries[0].classification
// classification: "Deliverable"|"Undeliverable"|"Risky"|"Unknown"
// status (granular): "Success"|"ServerIsCatchAll"|"DomainDoesNotExist"|...
// Stop on: Undeliverable   Cascade on: Unknown/Risky or HTTP error

async function checkWithVerifalia(
    email: string,
    username: string,
    password: string,
): Promise<ValidateEmailResponse> {
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    const baseUrl = 'https://api.verifalia.com/v2.7';

    // Submit job — waitTime=30000 tells Verifalia to hold the connection up to 30s
    const submitRes = await fetch(`${baseUrl}/email-validations?waitTime=30000`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
        },
        body: JSON.stringify({ entries: [{ inputData: email }] }),
        signal: AbortSignal.timeout(35000),
    });

    if (submitRes.status === 403) throw new Error('Verifalia: forbidden — check credentials');
    if (!submitRes.ok && submitRes.status !== 202) {
        throw new Error(`Verifalia submit HTTP ${submitRes.status}`);
    }

    let jobData = await submitRes.json();

    // 202 = still processing; poll with short waits
    if (submitRes.status === 202) {
        const jobId: string | undefined = jobData?.overview?.id;
        if (!jobId) throw new Error('Verifalia: no job ID in 202 response');

        for (let i = 0; i < 6; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const pollRes = await fetch(
                `${baseUrl}/email-validations/${jobId}?waitTime=10000`,
                { headers: { Authorization: authHeader }, signal: AbortSignal.timeout(15000) },
            );
            if (pollRes.ok) {
                jobData = await pollRes.json();
                if (jobData?.overview?.status === 'Completed') break;
            }
        }
    }

    const entry = jobData?.entries?.data?.[0];
    if (!entry) throw new Error('Verifalia: no entry in response');

    const classification: string = entry.classification ?? '';
    const entryStatus: string = entry.status ?? '';

    if (classification === 'Undeliverable') {
        return {
            email, status: 'invalid', service: 'verifalia',
            reason: entryStatus || 'undeliverable', error: null,
        };
    }
    if (entryStatus === 'ServerIsCatchAll') {
        return {
            email, status: 'catch_all', service: 'verifalia',
            reason: 'catch_all_domain', error: null,
        };
    }
    if (classification === 'Deliverable') {
        return {
            email, status: 'valid', service: 'verifalia',
            reason: entryStatus || 'deliverable', error: null,
        };
    }
    // Risky or Unknown → cascade
    throw new Error(`Verifalia: uncertain result — classification=${classification}, status=${entryStatus}`);
}

// ── Service 3: ZeroBounce ─────────────────────────────────────────────────────
//
// GET https://api.zerobounce.net/v2/validate?api_key=KEY&email=EMAIL&ip_address=
// Response: { address, status: "valid"|"invalid"|"catch-all"|"unknown"|"spamtrap"|..., sub_status, mx_found }
// Stop on: status=invalid   Cascade on: unknown/spamtrap/etc. or HTTP error

async function checkWithZeroBounce(
    email: string,
    apiKey: string,
): Promise<ValidateEmailResponse> {
    const url = `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}&ip_address=`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!res.ok) {
        throw new Error(`ZeroBounce HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    // ZeroBounce returns errors as { error: "..." }
    if (data.error) {
        throw new Error(`ZeroBounce API error: ${data.error}`);
    }

    const status: string = data.status ?? '';

    if (status === 'valid') {
        return {
            email, status: 'valid', service: 'zerobounce',
            reason: data.sub_status || 'valid', error: null,
        };
    }
    if (status === 'catch-all') {
        return {
            email, status: 'catch_all', service: 'zerobounce',
            reason: 'catch_all_domain', error: null,
        };
    }
    if (status === 'invalid') {
        return {
            email, status: 'invalid', service: 'zerobounce',
            reason: data.sub_status || 'invalid', error: null,
        };
    }
    // unknown, spamtrap, abuse, do_not_mail → cascade
    throw new Error(`ZeroBounce: uncertain result — status=${status}`);
}

// ── Service 4: Emailable ──────────────────────────────────────────────────────
//
// GET https://api.emailable.com/v1/verify?api_key=KEY&email=EMAIL
// Response: { state: "deliverable"|"undeliverable"|"risky"|"unknown", reason, accept_all, score }
// Special: HTTP 249 = still processing, retry
// Stop on: state=undeliverable   Cascade on: unknown or HTTP error
// Note: risky + accept_all=true → catch_all; risky + accept_all=false → valid (safe enough for outreach)

async function checkWithEmailable(
    email: string,
    apiKey: string,
): Promise<ValidateEmailResponse> {
    const url = `https://api.emailable.com/v1/verify?api_key=${apiKey}&email=${encodeURIComponent(email)}`;

    for (let attempt = 0; attempt < 4; attempt++) {
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) });

        // 249 = verification taking longer than normal — retry up to 4 times
        if (res.status === 249) {
            await new Promise(r => setTimeout(r, 2500));
            continue;
        }

        if (!res.ok) {
            throw new Error(`Emailable HTTP ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        const state: string = data.state ?? '';

        if (state === 'deliverable') {
            return {
                email, status: 'valid', service: 'emailable',
                reason: data.reason ?? 'accepted_email', error: null,
            };
        }
        if (state === 'risky' && data.accept_all) {
            return {
                email, status: 'catch_all', service: 'emailable',
                reason: 'catch_all_domain', error: null,
            };
        }
        if (state === 'risky') {
            // Risky but not catch-all — usable for cold outreach
            return {
                email, status: 'valid', service: 'emailable',
                reason: 'risky_deliverable', error: null,
            };
        }
        if (state === 'undeliverable') {
            return {
                email, status: 'invalid', service: 'emailable',
                reason: data.reason ?? 'undeliverable', error: null,
            };
        }
        // unknown → cascade
        throw new Error(`Emailable: uncertain result — state=${state}`);
    }

    throw new Error('Emailable: max retries exceeded (persistent 249 status)');
}

// ── Service 5: Hunter ─────────────────────────────────────────────────────────
//
// GET https://api.hunter.io/v2/email-verifier?api_key=KEY&email=EMAIL
// Response: { data: { status: "valid"|"invalid"|"accept_all"|"webmail"|"disposable"|"unknown", score, smtp_check } }
// Note: May return 202 if async — treat as service error
// Stop on: status=invalid   Cascade on: unknown/webmail/disposable or HTTP error

async function checkWithHunter(
    email: string,
    apiKey: string,
): Promise<ValidateEmailResponse> {
    const url = `https://api.hunter.io/v2/email-verifier?api_key=${apiKey}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });

    if (res.status === 202) {
        throw new Error('Hunter: verification still processing (async 202) — treating as service error');
    }
    if (!res.ok) {
        throw new Error(`Hunter HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const status: string = data?.data?.status ?? '';

    if (!status) throw new Error('Hunter: no status field in response');

    if (status === 'valid') {
        return {
            email, status: 'valid', service: 'hunter',
            reason: 'smtp_verified', error: null,
        };
    }
    if (status === 'accept_all') {
        return {
            email, status: 'catch_all', service: 'hunter',
            reason: 'catch_all_domain', error: null,
        };
    }
    if (status === 'invalid') {
        return {
            email, status: 'invalid', service: 'hunter',
            reason: 'rejected_email', error: null,
        };
    }
    // webmail, disposable, unknown → cascade
    throw new Error(`Hunter: uncertain result — status=${status}`);
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const email: string = body?.email?.trim()?.toLowerCase() ?? '';

        // ── Input validation ──────────────────────────────────────────────────
        if (!email) {
            return NextResponse.json(
                { email: '', status: 'invalid', service: 'syntax', reason: 'missing_email', error: 'Missing required field: email' } satisfies ValidateEmailResponse,
                { status: 400, headers: corsHeaders },
            );
        }

        // Basic RFC-style format check (we let the paid services do the deep syntax check)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { email, status: 'invalid', service: 'syntax', reason: 'invalid_format', error: null } satisfies ValidateEmailResponse,
                { headers: corsHeaders },
            );
        }

        const domain = email.split('@')[1];
        console.log(`📧 Validate-email request: ${email}`);

        // ── Layer 0: DNS/MX pre-filter ────────────────────────────────────────
        // Free, instant — kills dead domains without spending any service credits.
        console.log(`  ↳ [0] DNS/MX check for domain: ${domain}`);
        const mxExists = await hasMxRecords(domain);
        if (!mxExists) {
            console.log(`  ❌ No MX records for ${domain} — email cannot be delivered`);
            return NextResponse.json(
                { email, status: 'invalid', service: 'dns', reason: 'no_mx_records', error: null } satisfies ValidateEmailResponse,
                { headers: corsHeaders },
            );
        }
        console.log(`  ✅ MX records exist for ${domain} — proceeding to paid waterfall`);

        // ── Paid waterfall: build the list of configured services ─────────────
        // Any service without its API key(s) is silently skipped.
        type ServiceDef = { name: string; fn: () => Promise<ValidateEmailResponse> };
        const services: ServiceDef[] = [];

        const qevKey  = process.env.QUICK_EMAIL_VERIFICATION_KEY;
        const bvKey   = process.env.BILLION_VERIFIER_KEY;
        const mvKey   = process.env.MILLION_VERIFIER_KEY;
        const vUser   = process.env.VERIFALIA_USERNAME;
        const vPass   = process.env.VERIFALIA_PASSWORD;
        const zbKey   = process.env.ZEROBOUNCE_KEY;
        const emKey   = process.env.EMAILABLE_KEY;
        const hunKey  = process.env.HUNTER_KEY;

        if (qevKey) {
            services.push({ name: 'quickemailverification', fn: () => checkWithQuickEmailVerification(email, qevKey) });
        }
        if (vUser && vPass) {
            services.push({ name: 'verifalia', fn: () => checkWithVerifalia(email, vUser, vPass) });
        }
        if (mvKey) {
            services.push({ name: 'millionverifier', fn: () => checkWithMillionVerifier(email, mvKey) });
        }
        if (zbKey) {
            services.push({ name: 'zerobounce', fn: () => checkWithZeroBounce(email, zbKey) });
        }
        if (emKey) {
            services.push({ name: 'emailable', fn: () => checkWithEmailable(email, emKey) });
        }
        if (hunKey) {
            services.push({ name: 'hunter', fn: () => checkWithHunter(email, hunKey) });
        }
        if (bvKey) {
            services.push({ name: 'billionverify', fn: () => checkWithBillionVerify(email, bvKey) });
        }

        if (services.length === 0) {
            console.warn('  ⚠️ No email validation services configured (no API keys in env)');
            return NextResponse.json(
                {
                    email, status: 'service_error', service: 'none',
                    reason: 'no_services_configured',
                    error: 'No email validation API keys are configured. Add at least one service key to .env.local',
                } satisfies ValidateEmailResponse,
                { headers: corsHeaders },
            );
        }

        // ── Waterfall execution ───────────────────────────────────────────────
        // Rules:
        //   - Service returns "valid" or "invalid" or "catch_all" → STOP, return immediately
        //   - Service throws (rate limit / API error / network) → cascade to next service
        let lastError = '';

        for (let i = 0; i < services.length; i++) {
            const svc = services[i];
            
            if (i > 0) {
                // Add a random delay between services to avoid slamming APIs after failures
                const delayMs = 1500 + Math.floor(Math.random() * 2000);
                console.log(`  ⏱️ Delaying ${delayMs}ms before fallback to ${svc.name}...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            try {
                console.log(`  ↳ [${i + 1}/${services.length}] Trying: ${svc.name}`);
                const result = await svc.fn();
                console.log(`  ✅ ${svc.name} → ${result.status} (${result.reason})`);
                return NextResponse.json(result satisfies ValidateEmailResponse, { headers: corsHeaders });
            } catch (err) {
                lastError = String(err);
                console.warn(`  ⚠️ ${svc.name} failed: ${lastError}${i < services.length - 1 ? ' — trying next service' : ''}`);
                // Continue to next service in waterfall
            }
        }

        // All configured services failed (service errors only — any definitive result exits early above)
        console.error(`❌ All ${services.length} validation service(s) failed. Last error: ${lastError}`);
        return NextResponse.json(
            {
                email, status: 'service_error', service: 'all_failed',
                reason: 'all_services_failed',
                error: lastError,
            } satisfies ValidateEmailResponse,
            { headers: corsHeaders },
        );

    } catch (err) {
        console.error('💥 Validate-email API error:', err);
        return NextResponse.json(
            {
                email: '', status: 'service_error', service: 'error',
                reason: 'internal_error',
                error: String(err),
            } satisfies ValidateEmailResponse,
            { status: 500, headers: corsHeaders },
        );
    }
}

// CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
}
