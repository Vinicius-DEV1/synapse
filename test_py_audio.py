import os
import asyncio
from google import genai
from google.genai import types
import logging

os.environ['GEMINI_API_KEY'] = 'REDACTED_GEMINI_API_KEY'

logging.basicConfig(level=logging.DEBUG)
logging.getLogger('websockets').setLevel(logging.DEBUG)

async def run():
    client = genai.Client()
    async with client.aio.live.connect(model='gemini-2.5-flash-native-audio-latest', config={"system_instruction": "Test"}) as session:
        print("Connected")
        # Send a tiny bit of audio (dummy PCM)
        await session.send(input={"mime_type": "audio/pcm;rate=16000", "data": b"\x00" * 4096}, end_of_turn=True)
        print('Sent audio and end of turn')
        async for msg in session.receive():
            print(msg)
            break

asyncio.run(run())
