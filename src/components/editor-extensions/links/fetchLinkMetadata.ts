import type { LinkMetadata } from './types';
import { isYouTubeUrl } from './youtubeUtils';

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  const isYouTube = isYouTubeUrl(url);
  let oEmbedChannel: string | null = null;

  const proxies = [
    ...(isYouTube
      ? [
          async () => {
            const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
            if (!res.ok) throw new Error('Noembed failed');
            const json = await res.json();
            if (json.title && typeof json.title === 'string') {
              if (json.author_name) oEmbedChannel = json.author_name;
              return json.title;
            }
            throw new Error('No title in Noembed response');
          },
          async () => {
            const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
            if (!res.ok) throw new Error('YouTube oEmbed failed');
            const json = await res.json();
            if (json.title && typeof json.title === 'string') {
              if (json.author_name) oEmbedChannel = json.author_name;
              return json.title;
            }
            throw new Error('No title in YouTube oEmbed response');
          },
        ]
      : []),
    async () => {
      const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Microlink failed');
      const json = await res.json();
      if (json.data && json.data.title && typeof json.data.title === 'string') {
        return json.data.title;
      }
      throw new Error('No title in Microlink response');
    },
    async () => {
      const res = await fetch(`https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('JSONLink failed');
      const json = await res.json();
      if (json.title && typeof json.title === 'string') {
        return json.title;
      }
      throw new Error('No title in JSONLink response');
    },
    async () => {
      const res = await fetch(`https://api.linkpreview.net/?key=${encodeURIComponent(url)}&q=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('LinkPreview failed');
      const json = await res.json();
      if (json.title && typeof json.title === 'string') {
        return json.title;
      }
      throw new Error('No title in LinkPreview response');
    },
    async () => {
      const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Codetabs failed');
      const html = await res.text();
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (match && match[1]) {
        return match[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      }
      throw new Error('Regex failed on Codetabs HTML');
    },
    async () => {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('CORSProxy failed');
      const html = await res.text();
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (match && match[1]) {
        return match[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      }
      throw new Error('Regex failed on CORSProxy HTML');
    },
    async () => {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('AllOrigins failed');
      const data = await res.json();
      const html = typeof data?.contents === 'string' ? data.contents : '';
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (match && match[1]) {
        return match[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      }
      throw new Error('Regex failed on AllOrigins HTML');
    },
  ];

  let fetchedTitleStr = '';
  for (const proxyFn of proxies) {
    try {
      fetchedTitleStr = await proxyFn();
      if (fetchedTitleStr) break;
    } catch {
      // Continue to next fallback parser
    }
  }

  let finalTitle = fetchedTitleStr;
  let finalChannel: string | null = oEmbedChannel;
  let finalDuration: number | null = null;
  let finalIsPlaylist = url.includes('list=');
  let finalUploadDate: string | null = null;

  if (isYouTube && window.api?.youtube?.fetchPlaylistInfo && !url.includes('/@')) {
    try {
      const ytInfo = await window.api.youtube.fetchPlaylistInfo(url);
      if (ytInfo?.title) {
        finalTitle = ytInfo.title;
        finalChannel = ytInfo.uploader || ytInfo.uploader_id || finalChannel;
        finalDuration = ytInfo.duration;
        finalIsPlaylist = ytInfo._type === 'playlist' || url.includes('list=');
        finalUploadDate = ytInfo.upload_date;
      }
    } catch (ytErr) {
      console.warn('yt-dlp fetch failed, falling back to oEmbed metadata', ytErr);
    }
  }

  if (!finalTitle) {
    try {
      finalTitle = new URL(url).hostname;
    } catch {
      finalTitle = url;
    }
  }

  return {
    title: finalTitle,
    channel: finalChannel,
    duration: finalDuration,
    isPlaylist: finalIsPlaylist,
    uploadDate: finalUploadDate,
  };
}
