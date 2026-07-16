const https = require('https');
const API_KEY = 'AIzaSyCDasLgSKUycf9-p4Ar9Wch3gq-E6-wGbw';

https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const models = JSON.parse(data).models;
    const bidiModels = models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('bidiGenerateContent'));
    console.log("Bidi Models (v1beta):", bidiModels.map(m => m.name));
  });
});

https.get(`https://generativelanguage.googleapis.com/v1alpha/models?key=${API_KEY}`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const models = JSON.parse(data).models;
    const bidiModels = models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('bidiGenerateContent'));
    console.log("Bidi Models (v1alpha):", bidiModels.map(m => m.name));
  });
});
