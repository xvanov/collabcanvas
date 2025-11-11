#!/usr/bin/env node
/**
 * Verify SerpAPI Key
 * Quick test script to verify your SerpAPI key is valid
 */

const https = require('https');

const apiKey = process.argv[2] || process.env.SERP_API_KEY;

if (!apiKey) {
  console.error('❌ Error: SERP_API_KEY not provided');
  console.log('Usage: node verify-serpapi-key.js <your-api-key>');
  console.log('   OR: SERP_API_KEY=<your-key> node verify-serpapi-key.js');
  process.exit(1);
}

console.log(`🔑 Testing SerpAPI key: ${apiKey.substring(0, 10)}... (length: ${apiKey.length})`);

const params = new URLSearchParams({
  engine: 'home_depot',
  q: 'drywall',
  api_key: apiKey.trim(),
  ps: '1',
});

const url = `https://serpapi.com/search.json?${params.toString()}`;

console.log('🌐 Making test request to SerpAPI...');

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        if (json.error) {
          console.error(`❌ SerpAPI Error: ${json.error}`);
          process.exit(1);
        } else {
          console.log('✅ SerpAPI key is valid!');
          console.log(`📦 Found ${json.organic_results?.length || 0} results`);
          if (json.organic_results?.[0]) {
            console.log(`💰 First result: ${json.organic_results[0].title}`);
            console.log(`   Price: ${json.organic_results[0].price || 'N/A'}`);
          }
        }
      } catch (e) {
        console.error('❌ Failed to parse response:', e.message);
        process.exit(1);
      }
    } else {
      console.error(`❌ HTTP ${res.statusCode}: ${data.substring(0, 200)}`);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error(`❌ Request failed: ${err.message}`);
  process.exit(1);
});

