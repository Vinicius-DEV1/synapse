import os
import asyncio
from google import genai
from google.genai import types
import logging

os.environ['GEMINI_API_KEY'] = 'AIzaSyCDasLgSKUycf9-p4Ar9Wch3gq-E6-wGbw'

# Enable debug logging for websockets to see the raw JSON frames
logging.basicConfig(level=logging.DEBUG)
logging.getLogger('websockets').setLevel(logging.DEBUG)

async def run():
    client = genai.Client()
    async with client.aio.live.connect(model='gemini-2.5-flash-native-audio-latest') as session:
        await session.send(end_of_turn=True)
        print('Sent end of turn')

asyncio.run(run())
