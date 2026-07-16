const WebSocket = require('ws');
const API_KEY = 'AIzaSyCDasLgSKUycf9-p4Ar9Wch3gq-E6-wGbw';
const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('Connected! Sending setup...');
  const setupMsg = {
    setup: {
      model: 'models/gemini-2.5-flash-native-audio-latest',
      generationConfig: {
        responseModalities: ["AUDIO", "TEXT"],
      },
    }
  };
  ws.send(JSON.stringify(setupMsg));
});

ws.on('message', (data) => {
  console.log('Received message.');
  const response = JSON.parse(data.toString());
  if (response.setupComplete) {
     console.log('Sending audio chunk...');
     
     // 4096 samples of silence
     const buffer = Buffer.alloc(4096 * 2); 
     const b64 = buffer.toString('base64');
     
     ws.send(JSON.stringify({
       realtimeInput: {
         mediaChunks: [{
           mimeType: "audio/pcm;rate=16000",
           data: b64
         }]
       }
     }));
     
     console.log('Sending text turnComplete...');
     ws.send(JSON.stringify({
       clientContent: { 
         turns: [{ role: "user", parts: [{ text: "Hello!" }] }],
         turnComplete: true 
       }
     }));
  }
  
  if (response.serverContent) {
     console.log('Received serverContent:', JSON.stringify(response.serverContent, null, 2));
  }
});

ws.on('close', (code, reason) => {
  console.log('Closed:', code, reason.toString());
});
