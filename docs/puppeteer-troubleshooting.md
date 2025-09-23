# Puppeteer Mode - Troubleshooting Guide

## 🔧 Enhanced Error Handling & Logging

The Puppeteer Mode now includes comprehensive error handling and logging to help you debug issues quickly.

## 📋 Common Error Messages & Solutions

### 1. Connection Errors

**Error**: `"Cannot connect to Puppeteer API. Make sure the dev server is running on localhost:3000"`

**Solution**:
1. Check if the API server is running:
   ```bash
   cd api/bricks-api
   npm run dev
   ```
2. Verify the server is accessible at `http://localhost:3000`
3. Check for port conflicts

### 2. API Endpoint Errors

**Error**: `"Puppeteer API endpoint not found. Make sure the API server is running"`

**Solution**:
1. Ensure the API server is properly configured
2. Check that the `/api/puppeteer` endpoint exists
3. Verify the correct API structure

### 3. Timeout Errors

**Error**: `"Job timeout - execution took longer than 300 seconds"`

**Solution**:
1. Increase the timeout value in Puppeteer settings
2. Optimize your code for better performance
3. Check server resources and performance

### 4. Validation Errors

**Error**: `"No Puppeteer code provided"`

**Solution**:
1. Make sure you've entered code in the Puppeteer editor
2. Check that the code is not just whitespace

**Error**: `"Timeout must be between 5-60 seconds"`

**Solution**:
1. Set timeout between 5000ms and 60000ms
2. Use the slider in the UI for valid values

## 🔍 Debugging with Enhanced Logging

### Browser Console Logging

Open your browser's developer console (F12) to see detailed logs:

1. **Job Submission Logs**:
   ```
   🤖 Puppeteer Mode: Starting browser automation
   📋 Code length: 127 characters
   ⚙️ Config: {"timeout": 30000, "headless": true}
   📊 Row data keys: ["URL", "Company", "Email"]
   🚀 Submitting job at: 2025-09-23T10:30:00.123Z
   ```

2. **API Response Logs**:
   ```
   📡 Response received in 45 ms
   📊 Response status: 200
   ✅ Job successfully queued
   🆔 Job ID: job_abc123def456
   ```

3. **Polling Logs**:
   ```
   🔄 Starting result polling
   🔄 Poll attempt 1/60
   📊 Job status: processing
   ⏳ Job processing, elapsed: 5s
   ✅ Puppeteer job completed successfully
   ⏱️ Total execution time: 8234ms
   ```

### Network Error Recovery

The system automatically handles network issues:

```
❌ Poll attempt 3 failed: TypeError: Failed to fetch
🔄 Network error during polling, will retry...
⏸️ Waiting 5000ms before next poll...
```

## 📊 Performance Monitoring

### Real-time Status

The UI shows real-time system status:
- Server connection status
- Queue status  
- Browser pool status
- Stealth mode status

### Metrics Access

Check performance metrics via API:
```
GET http://localhost:3000/api/puppeteer/performance?action=stats
```

Response:
```json
{
  "totalJobs": 125,
  "completedJobs": 120,
  "failedJobs": 5,
  "averageExecutionTime": 4500,
  "queueLength": 2
}
```

## 🐛 Step-by-Step Debugging

### 1. Check System Status
1. Look at the status indicators in the Puppeteer Mode UI
2. Verify all systems show green status

### 2. Test Simple Code
Start with a basic test:
```javascript
await page.goto('https://example.com');
return await page.title();
```

### 3. Check Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for Puppeteer logs (🤖, 📡, 🔄 icons)

### 4. Monitor Network Tab
1. Open Network tab in DevTools
2. Look for failed requests to `/api/puppeteer`
3. Check response codes and timing

### 5. Verify Code Syntax
Make sure your Puppeteer code:
- Uses proper `await` syntax
- Has a `return` statement
- Uses valid JavaScript syntax

## 🔧 Server-Side Debugging

### Check Server Logs

In the API server terminal, look for:
```
📥 Received Puppeteer job: job_abc123
🎭 Creating browser with stealth plugin
✅ Job completed successfully: job_abc123
```

### Performance Monitoring

Check queue status:
```bash
curl http://localhost:3000/api/puppeteer/queue-status
```

### Browser Pool Status

Monitor browser instances and memory usage through the performance API.

## 📞 Getting Help

If you're still experiencing issues:

1. **Check the full user guide**: `docs/puppeteer-mode-user-guide.md`
2. **Review server logs** in the terminal
3. **Copy browser console logs** for debugging
4. **Test with minimal code** to isolate the issue
5. **Check network connectivity** to localhost:3000

## 🎯 Best Practices for Error Prevention

1. **Always test with simple code first**
2. **Use appropriate timeouts** for your use case
3. **Include error handling** in your Puppeteer code
4. **Monitor the browser console** during development
5. **Keep code efficient** to avoid timeouts
6. **Use the built-in templates** as starting points

The enhanced error handling system will guide you through most issues with clear, actionable error messages and detailed logging information.