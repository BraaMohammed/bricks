const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
for (const line of env.split('\n')) {
  if (line.trim() && !line.startsWith('#')) {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^"|"$/g, '');
  }
}
const TOKEN = process.env.DIFFBOT_TOKEN;

async function testRateLimit() {
  const url = 'https://en.wikipedia.org/wiki/OpenAI';
  const apiUrl = `https://api.diffbot.com/v3/article?token=${TOKEN}&url=${encodeURIComponent(url)}`;
  
  console.log('Sending 10 rapid requests...');
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      fetch(apiUrl)
        .then(res => res.status)
        .catch(err => err.message)
    );
  }
  const results = await Promise.all(promises);
  console.log('Statuses:', results);
}
testRateLimit();
