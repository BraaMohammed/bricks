/**
 * Phase 4.4: Documentation and User Guides
 * Complete documentation for Puppeteer Mode implementation
 */

# Puppeteer Mode Documentation

## Overview

Puppeteer Mode enables powerful browser automation directly from your data sheets. It allows you to:

- **Scrape website data** using real browser interactions
- **Automate form submissions** and interactions
- **Take screenshots** of web pages
- **Extract dynamic content** that requires JavaScript
- **Bypass basic anti-bot measures** with stealth mode

## Architecture

```
Frontend (FormulaEditor) → API (/api/bricks-api/puppeteer) → Queue System → Browser Pool → Results
```

### Components

1. **FormulaEditor**: User interface for writing Puppeteer code
2. **API Endpoints**: RESTful API for job submission and status checking
3. **Queue System**: Manages job processing with rate limiting and concurrency
4. **Browser Pool**: Efficient browser instance management with anti-ban features
5. **Performance Monitor**: Tracks metrics and performance statistics

## Getting Started

### 1. Open the Formula Editor

1. Select a column in your data sheet
2. Click the "Edit Formula" button
3. Navigate to the "Puppeteer Mode" tab

### 2. Write Your Automation Code

Puppeteer Mode uses standard Puppeteer API with some enhancements:

```javascript
// Basic page navigation
await page.goto('{URL}');
await page.waitForSelector('h1');
const title = await page.title();
return title;
```

### 3. Use Column References

Reference data from other columns using `{Column Name}` syntax:

```javascript
// Form automation using column data
await page.goto('https://example.com/search');
await page.type('#search-input', '{Search Term}');
await page.click('#search-button');
await page.waitForNavigation();
return await page.url();
```

### 4. Configure Execution Settings

- **Timeout**: Set execution timeout (5-120 seconds)
- **Headless Mode**: Run browsers in background (recommended)
- **Queue Priority**: Higher priority for urgent jobs

## Code Templates

### Template 1: Basic Web Scraping

```javascript
// Navigate to page and extract title
await page.goto('{URL}');
await page.waitForSelector('h1', { timeout: 10000 });
const title = await page.$eval('h1', el => el.textContent);
return title;
```

### Template 2: Text Content Extraction

```javascript
// Extract all paragraph text
await page.goto('{URL}');
await page.waitForSelector('p', { timeout: 10000 });
const paragraphs = await page.$$eval('p', elements => 
  elements.map(el => el.textContent.trim()).filter(text => text.length > 0)
);
return paragraphs.join(' | ');
```

### Template 3: Screenshot Capture

```javascript
// Take a screenshot of the page
await page.goto('{URL}');
await page.setViewport({ width: 1200, height: 800 });
await page.waitForLoadState('networkidle');
const screenshot = await page.screenshot({ 
  encoding: 'base64',
  type: 'png',
  fullPage: false
});
return \`data:image/png;base64,\${screenshot}\`;
```

### Template 4: Form Interaction

```javascript
// Fill and submit a form
await page.goto('{Form URL}');
await page.waitForSelector('form', { timeout: 10000 });

// Fill form fields
await page.fill('input[name="email"]', '{Email}');
await page.fill('input[name="message"]', '{Message}');

// Submit form
await page.click('button[type="submit"]');
await page.waitForNavigation();

return 'Form submitted successfully';
```

### Template 5: Dynamic Content Extraction

```javascript
// Wait for dynamic content to load
await page.goto('{URL}');
await page.waitForSelector('.dynamic-content', { timeout: 15000 });

// Wait for specific content to appear
await page.waitForFunction(() => {
  const element = document.querySelector('.price');
  return element && element.textContent.includes('$');
});

const price = await page.$eval('.price', el => el.textContent);
return price;
```

### Template 6: Link Collection

```javascript
// Extract all links from a page
await page.goto('{URL}');
await page.waitForSelector('a', { timeout: 10000 });

const links = await page.$$eval('a', anchors => 
  anchors
    .map(a => ({ text: a.textContent.trim(), url: a.href }))
    .filter(link => link.url && link.url.startsWith('http'))
    .slice(0, 10) // Limit to first 10 links
);

return links.map(link => \`\${link.text}: \${link.url}\`).join('; ');
```

## Best Practices

### Performance

1. **Use Specific Selectors**: Target specific elements to reduce wait times
2. **Set Appropriate Timeouts**: Balance between reliability and speed
3. **Minimize Screenshots**: Screenshots are resource-intensive
4. **Batch Similar Operations**: Group related tasks for efficiency

### Anti-Detection

1. **Random Delays**: Add random waits to mimic human behavior
2. **Realistic User Agents**: Use current, common user agents
3. **Viewport Variation**: Use different screen sizes
4. **Session Management**: Maintain cookies for multi-step processes

### Error Handling

1. **Graceful Degradation**: Handle missing elements gracefully
2. **Timeout Management**: Set appropriate timeouts for operations
3. **Error Messages**: Return meaningful error descriptions

## API Reference

### Job Submission

```
POST /api/bricks-api/puppeteer
{
  "code": "await page.goto('https://example.com'); return await page.title();",
  "config": {
    "timeout": 30000,
    "headless": true
  },
  "rowData": {
    "URL": "https://example.com",
    "Search Term": "puppeteer"
  }
}
```

**Response:**
```json
{
  "queued": true,
  "jobId": "job_1234567890_abc123",
  "message": "Job added to queue successfully",
  "estimatedWaitTime": 5000,
  "queuePosition": 3
}
```

### Job Status Check

```
GET /api/bricks-api/puppeteer/status/{jobId}
```

**Response (Completed):**
```json
{
  "id": "job_1234567890_abc123",
  "status": "completed",
  "result": "Example Domain",
  "createdAt": "2025-09-23T19:30:00Z",
  "startedAt": "2025-09-23T19:30:02Z",
  "completedAt": "2025-09-23T19:30:08Z",
  "executionTime": 6000,
  "message": "Job completed successfully"
}
```

### Queue Status

```
GET /api/bricks-api/puppeteer/queue-status
```

**Response:**
```json
{
  "pending": 5,
  "processing": 2,
  "completed": 1248,
  "failed": 23,
  "estimatedWaitTime": "2 minutes",
  "avgProcessingTime": 8500
}
```

### Performance Metrics

```
GET /api/bricks-api/puppeteer/performance?action=stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalJobs": 1276,
    "successfulJobs": 1248,
    "failedJobs": 28,
    "successRate": 97.8,
    "averageProcessingTime": 8421,
    "averageQueueTime": 2156,
    "peakConcurrency": 3,
    "uptime": 3600000
  }
}
```

## Troubleshooting

### Common Issues

#### Job Timeout
- **Cause**: Page takes too long to load or selector not found
- **Solution**: Increase timeout or use more specific selectors
- **Example**: `await page.waitForSelector('h1', { timeout: 15000 })`

#### Selector Not Found
- **Cause**: Element doesn't exist or hasn't loaded yet
- **Solution**: Use `page.waitForSelector()` or check element existence
- **Example**: 
```javascript
const element = await page.$('h1');
if (element) {
  return await element.textContent();
} else {
  return 'Title not found';
}
```

#### Anti-Bot Detection
- **Cause**: Website detected automated browser
- **Solution**: Use stealth mode (enabled by default) and add delays
- **Example**:
```javascript
await page.goto('{URL}');
await page.waitForTimeout(2000); // Random delay
await page.mouse.move(100, 100); // Simulate mouse movement
```

#### Memory Issues
- **Cause**: Large pages or multiple screenshots
- **Solution**: Optimize code and limit resource usage
- **Example**: Use smaller viewports and avoid full-page screenshots

### Error Codes

- **400**: Invalid request (missing code, invalid config)
- **404**: Job not found (expired or invalid ID)
- **429**: Rate limit exceeded
- **500**: Internal server error (browser crash, timeout)

### Getting Help

1. **Check Performance Metrics**: Monitor queue status and performance
2. **Review Error Messages**: Look for specific error details in responses
3. **Test with Simple Code**: Start with basic navigation and build complexity
4. **Use Browser DevTools**: Test selectors in browser console first

## Security Considerations

### Code Safety

The system automatically blocks dangerous operations:
- File system access (`require('fs')`)
- Process execution (`require('child_process')`)
- System information (`require('os')`)
- Direct eval() usage

### Resource Limits

- **Memory**: 500MB per browser instance
- **Execution Time**: 120 seconds maximum
- **Code Size**: 50KB maximum
- **Concurrent Jobs**: 3 browsers maximum

### Data Privacy

- Jobs are processed in isolated environments
- Browser data is cleared after each job
- No persistent storage of automation results
- Network requests are logged for debugging only

## Performance Optimization

### Browser Pool Management

The system automatically manages browser instances:
- **Reuse**: Browsers are reused for multiple jobs
- **Cleanup**: Idle browsers are closed after 10 minutes
- **Memory Monitoring**: High memory usage triggers restarts
- **Anti-Ban**: Built-in delays and stealth measures

### Queue Optimization

- **Priority Processing**: Critical jobs get higher priority
- **Batch Operations**: Similar requests are grouped
- **Rate Limiting**: 2-second delays between requests
- **Smart Routing**: Jobs routed to optimal browser instances

### Monitoring and Alerts

The system provides real-time monitoring:
- **Success Rates**: Track job completion rates
- **Performance Trends**: Monitor processing times
- **Resource Usage**: Track memory and CPU usage
- **Error Patterns**: Identify common failure points

## Advanced Usage

### Custom Headers

```javascript
await page.setExtraHTTPHeaders({
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent': 'Mozilla/5.0 (custom agent)'
});
await page.goto('{URL}');
```

### Viewport Customization

```javascript
await page.setViewport({ 
  width: 1366, 
  height: 768,
  deviceScaleFactor: 1
});
```

### Cookie Management

```javascript
// Set cookies before navigation
await page.context().addCookies([{
  name: 'session',
  value: '{Session Token}',
  domain: 'example.com',
  path: '/'
}]);
```

### PDF Generation

```javascript
await page.goto('{URL}');
await page.waitForLoadState('networkidle');
const pdf = await page.pdf({ 
  format: 'A4',
  printBackground: true
});
return \`data:application/pdf;base64,\${pdf.toString('base64')}\`;
```

### Mobile Emulation

```javascript
await page.setViewport({ 
  width: 375, 
  height: 667,
  isMobile: true,
  hasTouch: true
});
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)');
```

This comprehensive documentation provides everything users need to effectively use Puppeteer Mode, from basic concepts to advanced automation techniques.