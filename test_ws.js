const WebSocket = require('ws');
const API_KEY = 'REDACTED_GEMINI_API_KEY';
const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
// Also test v1beta in a second connection if this fails
const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('Connected! Sending setup...');
  const setupMsg = {
    setup: {
      model: 'models/gemini-2.5-flash-native-audio-latest',
      generationConfig: {
        responseModalities: ["AUDIO"],
      },
      systemInstruction: {
        parts: [{ text: 'You are a close human friend of the user.' }]
      },
      tools: [
        {
          functionDeclarations: [
            {
              name: "extract_core_memories",
              description: "Save an important fact about the user's life into long term memory.",
              parameters: {
                type: "OBJECT",
                properties: {
                  fact: { type: "STRING", description: "The important fact to remember" },
                  category: { type: "STRING", description: "Category of the fact (e.g. work, family, goal, problem)" }
                },
                required: ["fact", "category"]
              }
            }
          ]
        }
      ]
    }
  };
  ws.send(JSON.stringify(setupMsg));
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('close', (code, reason) => {
  console.log('Closed:', code, reason.toString());
});

ws.on('error', (err) => {
  console.error('Error:', err);
});
