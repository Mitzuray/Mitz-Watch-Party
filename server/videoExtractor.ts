import axios from "axios";
import * as cheerio from "cheerio";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
};

function normalizeUrl(url: string | undefined, baseUrl: string): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : new URL(url, baseUrl).href;
}

export async function extractTokyVideoUrl(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, { headers, timeout: 10000 });
    const $ = cheerio.load(response.data);

    // Try to find video source in various common patterns
    let videoUrl: string | null = null;

    // Pattern 1: <video src="...">
    const videoTag = $("video source").attr("src");
    if (videoTag) return normalizeUrl(videoTag, url);

    // Pattern 2: Look for m3u8 or mp4 in script tags
    const scripts = $("script");
    scripts.each((_, script) => {
      const content = $(script).html() || "";
      const m3u8Match = content.match(/["']([^"']*\.m3u8[^"']*)/);
      const mp4Match = content.match(/["']([^"']*\.mp4[^"']*)/);
      if (m3u8Match && !videoUrl) {
        videoUrl = normalizeUrl(m3u8Match[1], url);
      } else if (mp4Match && !videoUrl) {
        videoUrl = normalizeUrl(mp4Match[1], url);
      }
    });

    if (videoUrl) return videoUrl;

    // Pattern 3: Look for iframe with src
    const iframe = $("iframe").attr("src");
    if (iframe && (iframe.includes("mp4") || iframe.includes("m3u8"))) {
      return normalizeUrl(iframe, url);
    }

    return null;
  } catch (error) {
    console.error("[VideoExtractor] Error extracting tokyvideo:", error);
    return null;
  }
}

export async function extractAnimeOnlineUrl(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, { headers, timeout: 10000 });
    const $ = cheerio.load(response.data);

    let videoUrl: string | null = null;

    // Pattern 1: Look for iframe with src containing video
    const iframes = $("iframe");
    iframes.each((_, iframe) => {
      const src = $(iframe).attr("src");
      if (src && (src.includes("mp4") || src.includes("m3u8") || src.includes("video"))) {
        videoUrl = normalizeUrl(src, url);
      }
    });

    if (videoUrl) return videoUrl;

    // Pattern 2: Look in script tags for video URL
    const scripts = $("script");
    scripts.each((_, script) => {
      const content = $(script).html() || "";
      const m3u8Match = content.match(/["']([^"']*\.m3u8[^"']*)/);
      const mp4Match = content.match(/["']([^"']*\.mp4[^"']*)/);
      if (m3u8Match && !videoUrl) {
        videoUrl = normalizeUrl(m3u8Match[1], url);
      } else if (mp4Match && !videoUrl) {
        videoUrl = normalizeUrl(mp4Match[1], url);
      }
    });

    if (videoUrl) return videoUrl;

    // Pattern 3: Look for video tag
    const videoTag = $("video source").attr("src");
    if (videoTag) return normalizeUrl(videoTag, url);

    return null;
  } catch (error) {
    console.error("[VideoExtractor] Error extracting animesonline:", error);
    return null;
  }
}

export async function extractVideoUrl(url: string): Promise<string | null> {
  try {
    // Determine which extractor to use based on URL
    if (url.includes("tokyvideo.com")) {
      return await extractTokyVideoUrl(url);
    } else if (url.includes("animesonlinecc.to") || url.includes("animesonline")) {
      return await extractAnimeOnlineUrl(url);
    } else {
      // Generic extraction attempt
      return await extractGenericVideoUrl(url);
    }
  } catch (error) {
    console.error("[VideoExtractor] Error extracting video:", error);
    return null;
  }
}

async function extractGenericVideoUrl(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, { headers, timeout: 10000 });
    const $ = cheerio.load(response.data);

    // Try video tag first
    const videoTag = $("video source").attr("src");
    if (videoTag) return normalizeUrl(videoTag, url);

    // Try iframe
    const iframe = $("iframe").attr("src");
    if (iframe && (iframe.includes("mp4") || iframe.includes("m3u8"))) {
      return normalizeUrl(iframe, url);
    }

    // Try script tags
    let videoUrl: string | null = null;
    const scripts = $("script");
    scripts.each((_, script) => {
      const content = $(script).html() || "";
      const m3u8Match = content.match(/["']([^"']*\.m3u8[^"']*)/);
      const mp4Match = content.match(/["']([^"']*\.mp4[^"']*)/);
      if (m3u8Match && !videoUrl) {
        videoUrl = normalizeUrl(m3u8Match[1], url);
      } else if (mp4Match && !videoUrl) {
        videoUrl = normalizeUrl(mp4Match[1], url);
      }
    });

    return videoUrl;
  } catch (error) {
    console.error("[VideoExtractor] Error extracting generic video:", error);
    return null;
  }
}
