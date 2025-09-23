# Puppeteer Mode - Quick Setup Guide

## 🚀 Getting Started in 5 Minutes

### 1. Start the API Server

```bash
cd api/bricks-api
npm install
npm run dev
```

The API will be available at `http://localhost:3000`

### 2. Open Puppeteer Mode

1. Open your data sheet application
2. Select any column 
3. Click "Edit Formula" button
4. Navigate to "Puppeteer Mode" tab

### 3. Try Your First Automation

**Example 1: Get Page Title**
```javascript
await page.goto('https://example.com');
return await page.title();
```

**Example 2: Extract Text**
```javascript
await page.goto('https://httpbin.org/html');
await page.waitForSelector('h1');
const title = await page.$eval('h1', el => el.textContent);
return title;
```

### 4. Use Your Data

Reference columns using `{Column Name}` syntax:

```javascript
// If you have a "URL" column
await page.goto('{URL}');
return await page.title();
```

### 5. Configure Settings

- **Timeout**: 30 seconds (recommended)
- **Headless**: Keep enabled for performance
- **Queue**: Jobs are processed automatically

## 📊 Monitor Performance

Check system status:
```
GET http://localhost:3000/api/puppeteer/performance?action=stats
```

View queue status:
```
GET http://localhost:3000/api/puppeteer/queue-status
```

## 🔧 Common Patterns

### Web Scraping
```javascript
await page.goto('{URL}');
await page.waitForSelector('.content');
const text = await page.$eval('.content', el => el.textContent);
return text;
```

### Form Automation
```javascript
await page.goto('{Form URL}');
await page.fill('input[name="email"]', '{Email}');
await page.click('button[type="submit"]');
return 'Form submitted';
```

### Screenshot
```javascript
await page.goto('{URL}');
const screenshot = await page.screenshot({ encoding: 'base64' });
return \`data:image/png;base64,\${screenshot}\`;
```

## 🛟 Need Help?

- **Documentation**: See `docs/puppeteer-mode-user-guide.md`
- **Templates**: Use built-in code templates in the UI
- **Performance**: Monitor via `/performance` endpoint
- **Errors**: Check job status via `/status/{jobId}` endpoint
- **Debugging**: Open browser console (F12) for detailed execution logs

## ✨ Enhanced Features

- ✅ **Queue System**: Handle thousands of requests
- ✅ **Anti-Ban Protection**: Stealth mode enabled
- ✅ **Performance Monitoring**: Real-time metrics
- ✅ **Enhanced Error Handling**: Comprehensive error reporting with user-friendly messages
- ✅ **Browser Pool**: Efficient resource management
- ✅ **Rate Limiting**: Built-in anti-detection delays
- ✅ **Detailed Logging**: Real-time console logs for debugging
- ✅ **Network Error Recovery**: Automatic retry logic for network issues
- ✅ **Timeout Management**: Configurable timeouts with clear error messages

## 🎯 What's Working

- ✅ **Phase 1**: Frontend integration completed
- ✅ **Phase 2**: Backend API implementation completed  
- ✅ **Phase 3**: Testing and integration completed
- ✅ **Phase 4**: Polish and optimization completed

**Your Puppeteer Mode is ready for production use!** 🎉