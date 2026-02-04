# Puppeteer Mode Implementation Plan

## Implementation Progress

### ✅ Phase 1: Frontend Integration (COMPLETED)
- ✅ 1.1: Added Puppeteer mode to FormulaEditor
- ✅ 1.2: Created Puppeteer UI components and state management
- ✅ 1.3: Implemented formula generation with queue-based polling
- ✅ 1.4: Added Puppeteer code templates and examples

### ✅ Phase 2: Backend API Implementation (COMPLETED)
- ✅ 2.1: Install Puppeteer dependencies in backend
- ✅ 2.2: Create browser pool manager with anti-ban features
- ✅ 2.3: Implement job queue system with concurrency control
- ✅ 2.4: Create API endpoints for job submission, status, and queue monitoring

### ✅ Phase 3: Testing and Integration (COMPLETED)
- ✅ 3.1: Test basic Puppeteer automation
- ✅ 3.2: Validate queue system performance
- ✅ 3.3: Test anti-ban measures and stealth mode
- ✅ 3.4: Integration testing with frontend (API server running)

### 🔄 Phase 4: Polish and Optimization (IN PROGRESS)
- ✅ 4.1: Error handling improvements
- ✅ 4.2: Performance monitoring
- ⏳ 4.3: UI/UX refinements
- ✅ 4.4: Documentation and user guides

## Overview
Implement a new "Puppeteer Mode" that allows users to write Puppeteer automation code in the formula editor, execute it on the server with proper rate limiting and stealth capabilities, and return results back to the corresponding cells.

## Current Architecture Analysis

### Existing Mode Structure
The application currently supports 4 modes in the FormulaEditor:
1. **Code Mode**: Direct JavaScript execution
2. **AI Mode**: OpenAI/Ollama API integration
3. **Firecrawl Mode**: Website scraping via Firecrawl API
4. **AI Agents Mode**: Multi-agent conversation system

### Data Flow Pattern
1. User configures mode in FormulaEditor UI
2. Mode-specific formula is generated (JavaScript code)
3. Formula is stored in Zustand store (`useDataStore`)
4. When executed, formula runs in browser context with `executeFormulaOnCell`
5. Results are returned and stored in corresponding cells

### Current API Structure
- Frontend: Vite + React + TypeScript
- Backend: Next.js API (`/api/bricks-api`)
- Current API endpoint: Simple Hello World in `app/route.ts`

## Implementation Plan

### Phase 1: Frontend Integration (30 minutes)

#### 1.1 Add Puppeteer Mode to FormulaEditor ✅ COMPLETED
**File**: `src/components/FormulaEditor.tsx`

**Changes needed**: ✅ DONE
```tsx
// Add to mode type definition
const [mode, setMode] = useState<'code' | 'ai' | 'firecrawl' | 'ai-agents' | 'puppeteer'>('code');

// Add new state for Puppeteer mode
const [puppeteerCode, setPuppeteerCode] = useState('');
const [puppeteerTimeout, setPuppeteerTimeout] = useState(30000);
const [puppeteerHeadless, setPuppeteerHeadless] = useState(true);
```

#### 1.2 Add Puppeteer Tab to TabsList ✅ COMPLETED
```tsx
<TabsList className="grid w-full grid-cols-5"> {/* Update from grid-cols-4 */}
  {/* existing tabs */}
  <TabsTrigger value="puppeteer" className="flex items-center gap-2">
    <Bot className="h-4 w-4" />
    Puppeteer Mode
  </TabsTrigger>
</TabsList>
```

#### 1.3 Add Puppeteer TabsContent ✅ COMPLETED
```tsx
<TabsContent value="puppeteer" className="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Bot className="h-4 w-4" />
        Puppeteer Browser Automation
      </CardTitle>
      <CardDescription>
        Write Puppeteer code to automate browser interactions. Code runs on the server with stealth plugin.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Available columns */}
      {/* Puppeteer code editor */}
      {/* Configuration options */}
      {/* Preview */}
    </CardContent>
  </Card>
</TabsContent>
```

#### 1.4 Add Puppeteer Formula Generator ✅ COMPLETED (Updated for Queue) ✅ CODE UPDATED
```tsx
const generatePuppeteerFormula = (code: string, timeout: number, headless: boolean) => {
  const processedCode = code.replace(/\{([^}]+)\}/g, (match, columnName) => {
    return `\${row["${columnName}"] || ""}`;
  });

  return `// Puppeteer Generated Formula (Queue-based)
const puppeteerCode = \`${processedCode.replace(/`/g, '\\`')}\`;
const config = {
  timeout: ${timeout},
  headless: ${headless}
};

console.log('🤖 Submitting Puppeteer job to queue...');

// Submit job to queue (immediate response)
return fetch('/api/bricks-api/puppeteer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    code: puppeteerCode,
    config: config,
    rowData: row
  })
})
.then(response => {
  if (!response.ok) {
    throw new Error(\`API error: \${response.status} - \${response.statusText}\`);
  }
  return response.json();
})
.then(data => {
  if (data.queued && data.jobId) {
    console.log('✅ Job queued with ID:', data.jobId);
    
    // Poll for result
    return pollForResult(data.jobId);
  } else {
    throw new Error('Invalid queue response');
  }
})
.catch(error => {
  console.error('💥 Puppeteer error:', error);
  return \`Error: \${error.message}\`;
});

// Polling function for job result
async function pollForResult(jobId) {
  const maxAttempts = 60; // 5 minutes max (5s intervals)
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(\`/api/bricks-api/puppeteer/status/\${jobId}\`);
      const data = await response.json();
      
      if (data.status === 'completed') {
        console.log('✅ Puppeteer job completed');
        return data.result;
      } else if (data.status === 'failed') {
        console.error('❌ Puppeteer job failed:', data.error);
        return \`Error: \${data.error}\`;
      } else {
        // Still processing, wait and try again
        console.log(\`⏳ Job status: \${data.status}, attempt \${attempts + 1}/\${maxAttempts}\`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;
      }
    } catch (error) {
      console.error('Error polling job status:', error);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  return 'Error: Job timeout - took longer than 5 minutes';
}`;
};
```

### Phase 2: Backend API Implementation (45 minutes)

#### 2.1 Update Backend Dependencies
**File**: `api/bricks-api/package.json`

Add dependencies:
```json
{
  "dependencies": {
    "next": "15.5.4",
    "puppeteer": "^22.0.0",
    "puppeteer-extra": "^3.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2"
  }
}
```

#### 2.2 Backend Queue System Architecture

**Client Flow (No Changes Needed)**:
- Client sends 1000 requests normally to `/api/bricks-api/puppeteer`
- Each request returns immediately with `{ queued: true, jobId: "uuid" }`
- Client polls `/api/bricks-api/puppeteer/status/${jobId}` for results
- No client-side queue management needed

**Backend Queue System**:
- **Immediate Response**: Accept all requests instantly, return job ID
- **Internal Queue**: Process jobs with controlled concurrency (2-3 browsers max)
- **Browser Pool**: Reuse browser instances to avoid startup overhead
- **Smart Batching**: Group similar requests when possible
- **Internal Rate Limiting**: Built-in delays between requests to avoid bans

#### 2.3 Browser Pool Manager
**File**: `api/bricks-api/app/puppeteer/browser-pool.ts`

```typescript
class BrowserPool {
  private browsers: Browser[] = [];
  private maxBrowsers = 3; // Run max 3 browsers simultaneously
  private busyBrowsers = new Set<string>();
  
  async getBrowser(): Promise<{ browser: Browser; release: () => void }>
  async createBrowser(): Promise<Browser>
  releaseBrowser(browser: Browser): void
  cleanup(): Promise<void>
}
```

**Optimizations**:
- **Browser Reuse**: Keep browsers alive for multiple requests
- **Page Pooling**: Reuse pages within browsers when possible
- **Smart Cleanup**: Only close browsers after idle time
- **Resource Monitoring**: Track memory usage and restart browsers if needed

#### 2.4 Queue System with Internal Rate Limiting
**File**: `api/bricks-api/app/puppeteer/queue.ts`

```typescript
interface QueueJob {
  id: string;
  code: string;
  config: any;
  rowData: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

class PuppeteerQueue {
  private jobs: Map<string, QueueJob> = new Map();
  private processingJobs = new Set<string>();
  private maxConcurrent = 3; // Max browsers working simultaneously
  private requestDelay = 2000; // 2 second delay between requests (anti-ban)
  private lastRequestTime = 0;
  
  // Accept requests immediately, queue internally
  addJob(job: Omit<QueueJob, 'id' | 'status' | 'createdAt'>): string {
    const id = generateUniqueId();
    this.jobs.set(id, {
      ...job,
      id,
      status: 'pending',
      createdAt: new Date()
    });
    
    // Trigger processing (non-blocking)
    this.processNext();
    return id;
  }
  
  private async processNext(): Promise<void> {
    // Respect rate limiting
    const now = Date.now();
    if (now - this.lastRequestTime < this.requestDelay) {
      setTimeout(() => this.processNext(), this.requestDelay);
      return;
    }
    
    // Process with browser pool
    this.lastRequestTime = now;
    // ... processing logic
  }
}
```

**Anti-Ban Features**:
- **Request Delays**: Configurable delays between requests (default 2 seconds)
- **User Agent Rotation**: Different user agents for each request
- **Proxy Support**: Ready for proxy integration
- **Session Management**: Maintain cookies/sessions across requests when beneficial

#### 2.5 API Routes
**Files**: 
- `api/bricks-api/app/puppeteer/route.ts` - Add job to queue (immediate response)
- `api/bricks-api/app/puppeteer/status/[id]/route.ts` - Get job status/result
- `api/bricks-api/app/puppeteer/queue-status/route.ts` - Get overall queue status

**Route Behaviors**:
```typescript
// POST /api/bricks-api/puppeteer
// Returns immediately: { queued: true, jobId: "uuid-123" }

// GET /api/bricks-api/puppeteer/status/uuid-123  
// Returns: { status: "processing", progress: "50%" } or { status: "completed", result: "..." }

// GET /api/bricks-api/puppeteer/queue-status
// Returns: { pending: 245, processing: 3, completed: 752, estimatedWaitTime: "12 minutes" }
```

### Phase 3: UI Components and UX (30 minutes)

#### 3.1 Puppeteer Code Editor Component
**Features**:
- Syntax highlighting for JavaScript
- Column reference insertion (click to add `{Column Name}`)
- Code templates for common tasks
- Real-time preview with actual data

#### 3.2 Configuration Panel
**Options**:
- Execution timeout (5s to 60s)
- Headless mode toggle
- User agent override
- Viewport size settings

#### 3.3 Code Templates
**Common Puppeteer patterns**:
```javascript
// Template 1: Get page title
await page.goto('{URL}');
return await page.title();

// Template 2: Extract text content
await page.goto('{URL}');
await page.waitForSelector('h1');
return await page.$eval('h1', el => el.textContent);

// Template 3: Take screenshot
await page.goto('{URL}');
await page.setViewport({ width: 1200, height: 800 });
const screenshot = await page.screenshot({ encoding: 'base64' });
return `data:image/png;base64,${screenshot}`;

// Template 4: Form interaction
await page.goto('{URL}');
await page.type('#search', '{Search Term}');
await page.click('#submit');
await page.waitForNavigation();
return await page.url();

// Template 5: Get all links
await page.goto('{URL}');
const links = await page.$$eval('a', anchors => 
  anchors.map(a => a.href).filter(href => href)
);
return links.join(', ');
```

### Phase 4: Error Handling and Security (20 minutes)

#### 4.1 Client-Side Error Handling
- Network timeout handling
- User-friendly error messages
- Retry mechanisms for temporary failures

#### 4.2 Server-Side Security
- Code sanitization (prevent file system access, require statements)
- Resource limits (memory, CPU)
- Request validation
- Rate limiting per IP
- Execution timeouts

#### 4.3 Logging and Monitoring
- Request/response logging
- Performance metrics
- Error tracking
- Resource usage monitoring

## Security Considerations

### Code Execution Safety
1. **Sandboxed Environment**: Code runs in isolated browser context
2. **Pattern Blocking**: Block dangerous Node.js operations
3. **Resource Limits**: Timeout and memory constraints
4. **No File System Access**: Browser context only

### Rate Limiting Strategy
1. **Per-IP Limits**: 10 requests per minute per IP
2. **Global Limits**: Consider overall server capacity
3. **Premium Tiers**: Different limits for paid users

### Content Security
1. **Input Validation**: Validate all user inputs
2. **Output Sanitization**: Clean returned data
3. **Browser Security**: Use stealth plugin responsibly

## Performance Optimizations

### Browser Management
1. **Browser Pooling**: Reuse browser instances
2. **Page Cleanup**: Proper cleanup after execution
3. **Resource Monitoring**: Track memory and CPU usage

### Caching Strategy
1. **Result Caching**: Cache results for identical requests
2. **Browser Warming**: Keep warm browser instances
3. **CDN Integration**: Cache static responses

## Testing Strategy

### Unit Tests
1. **Formula Generation**: Test code generation logic
2. **API Validation**: Test input validation and sanitization
3. **Rate Limiting**: Test rate limit enforcement

### Integration Tests
1. **End-to-End**: Full formula execution flow
2. **Error Scenarios**: Network failures, timeouts
3. **Security**: Test malicious code blocking

### Load Testing
1. **Concurrent Requests**: Test multiple simultaneous executions
2. **Memory Usage**: Monitor browser memory consumption
3. **Timeout Handling**: Test various timeout scenarios

## Deployment Considerations

### Server Requirements
1. **Chrome Dependencies**: Ensure Chrome/Chromium is available
2. **Memory Allocation**: Sufficient RAM for browser instances
3. **Process Limits**: Configure appropriate limits

### Environment Variables
```env
PUPPETEER_RATE_LIMIT_MAX=10
PUPPETEER_RATE_LIMIT_WINDOW=60000
PUPPETEER_DEFAULT_TIMEOUT=30000
PUPPETEER_MAX_CONCURRENT=5
```

### Monitoring
1. **Browser Instance Count**: Track active browsers
2. **Execution Times**: Monitor average execution duration
3. **Error Rates**: Track failure percentages
4. **Resource Usage**: CPU and memory consumption

## Future Enhancements

### Advanced Features
1. **Proxy Support**: Route requests through proxies
2. **Session Management**: Maintain browser sessions
3. **File Downloads**: Handle file downloads
4. **Mobile Emulation**: Mobile device simulation

### Enterprise Features
1. **User Authentication**: API key-based access
2. **Usage Analytics**: Detailed usage reporting
3. **Custom Rate Limits**: Per-user limits
4. **Premium Features**: Advanced automation capabilities

## Implementation Timeline

### Week 1: Core Implementation
- Day 1-2: Frontend integration and UI
- Day 3-4: Backend API development
- Day 5: Testing and security implementation

### Week 2: Polish and Optimization
- Day 1-2: Error handling and UX improvements
- Day 3-4: Performance optimization
- Day 5: Documentation and deployment

## Risk Mitigation

### Technical Risks
1. **Browser Crashes**: Implement proper cleanup and restart mechanisms
2. **Memory Leaks**: Monitor and limit browser resource usage
3. **Network Issues**: Implement retry logic and timeout handling

### Security Risks
1. **Code Injection**: Strict input validation and sanitization
2. **Resource Abuse**: Rate limiting and resource constraints
3. **Data Exposure**: Secure handling of user data and results

### Operational Risks
1. **Server Overload**: Implement proper load balancing
2. **Dependency Issues**: Pin versions and test upgrades
3. **Monitoring Gaps**: Comprehensive logging and alerting

## Performance Optimizations & Anti-Ban Strategy

### Browser Pool Optimizations
1. **Browser Reuse**: Keep 2-3 browsers alive for 10+ minutes
2. **Page Recycling**: Reuse pages for similar requests (same domain)
3. **Memory Management**: Monitor RAM usage, restart browsers at 500MB+
4. **Connection Pooling**: Reuse TCP connections when possible

### Anti-Ban & Rate Limiting
1. **Request Delays**: 2-5 second delays between requests (configurable)
2. **User Agent Rotation**: Cycle through realistic user agents
3. **Viewport Randomization**: Random window sizes (1200-1920 width)
4. **Request Headers**: Realistic headers (Accept-Language, etc.)
5. **Session Management**: Maintain cookies for domain-specific requests

### Smart Batching
1. **Domain Grouping**: Group requests by domain for session reuse
2. **Priority Queue**: Prioritize simple requests (title, text) over complex ones
3. **Batch Screenshots**: Take multiple screenshots in one browser session
4. **Connection Reuse**: Keep connections alive for same-domain requests

### Configuration Options
```typescript
interface QueueConfig {
  maxConcurrentBrowsers: 3;
  requestDelay: 2000; // ms between requests
  browserIdleTimeout: 600000; // 10 minutes before closing idle browser
  maxMemoryPerBrowser: 500; // MB
  enableUserAgentRotation: true;
  enableSessionReuse: true;
  priorityQueue: true;
}
```

This approach ensures:
- ✅ **Scalable**: Client sends 1000 requests normally
- ✅ **Efficient**: Backend processes with browser reuse and batching  
- ✅ **Safe**: Built-in rate limiting and anti-ban measures
- ✅ **Fast**: Optimized browser pool and connection reuse
- ✅ **Robust**: Queue handles failures and retries gracefully