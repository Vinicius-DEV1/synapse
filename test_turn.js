const WebSocket = require('ws');
const API_KEY = 'REDACTED_GEMINI_API_KEY';
const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('Connected! Sending setup...');
  const setupMsg = {
    setup: {
      model: 'models/gemini-2.5-flash-native-audio-latest',
      generationConfig: {
        responseModalities: ["AUDIO"],
      }
    }
  };
  ws.send(JSON.stringify(setupMsg));
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
  const response = JSON.parse(data.toString());
  if (response.setupComplete) {
     console.log('Sending empty audio turnComplete...');
     ws.send(JSON.stringify({
       clientContent: { turnComplete: true }
     }));
  }
});

ws.on('close', (code, reason) => {
  console.log('Closed:', code, reason.toString());
});
