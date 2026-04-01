// AI-MIME v2 — Background Service Worker
// Handles OpenRouter + KLIPY API calls, sends GIF results to content script

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "google/gemini-2.5-flash-lite";

const KLIPY_FALLBACK_KEY = ""; // Set your KLIPY partner key here
const KLIPY_DEFAULT_ENDPOINT = "https://api.klipy.co";

// Shared defaults — popup.js reads these via get-settings message
const SETTINGS_DEFAULTS = {
  openrouterKey: "",
  klipyKey: "",
  klipyEndpoint: KLIPY_DEFAULT_ENDPOINT,
  enabled: true,
  overlaySize: "medium",
  reactionDelay: 0,
};

// --- Daily Limit ---
const DAILY_FREE_LIMIT = 15;
const SHARED_OPENROUTER_KEY = ""; // Placeholder — real key only in Chrome Web Store build

async function getDailyCount() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await chrome.storage.local.get({ dailyCount: 0, dailyResetDate: "" });
  if (data.dailyResetDate !== today) {
    await chrome.storage.local.set({ dailyCount: 0, dailyResetDate: today });
    return 0;
  }
  return data.dailyCount;
}

async function incrementDailyCount() {
  const data = await chrome.storage.local.get({ dailyCount: 0 });
  await chrome.storage.local.set({ dailyCount: data.dailyCount + 1 });
}

const GIF_SYSTEM_PROMPT = `You are a GIF search expert. Given an AI assistant's response, return 2-3 SHORT search terms for finding the perfect reaction GIF.

CRITICAL RULE: Focus on the SCENE, ACTION, or VISUAL described in the message — NOT just the emotion.

Good examples:
- AI explains a code bug → ["computer on fire", "this is fine dog", "debugging pain"]
- AI talks about food recipes → ["chef kiss", "cooking disaster", "gordon ramsay"]
- AI discusses math/logic → ["confused math lady", "galaxy brain", "calculating"]
- AI mentions money/business → ["money printer", "stonks", "shut up take my money"]
- AI gives step-by-step instructions → ["taking notes furiously", "write that down"]
- AI talks about AI/robots → ["terminator thumbs up", "robot dance", "skynet"]
- AI apologizes/can't help → ["sad violin", "tumbleweed", "awkward seal"]

Bad examples (AVOID): "happy" "sad" "celebration" "thinking" "reaction" "funny"

Return ONLY valid JSON: {"gif_queries": ["term1", "term2", "term3"]}`;

// --- Settings ---

async function getSettings() {
  try {
    const stored = await chrome.storage.sync.get(SETTINGS_DEFAULTS);
    return { ...SETTINGS_DEFAULTS, ...stored };
  } catch {
    return SETTINGS_DEFAULTS;
  }
}

async function checkApiStatus(openrouterKey, klipyKey) {
  const result = { openrouter: "unknown", klipy: "unknown" };

  const orKey = openrouterKey || SHARED_OPENROUTER_KEY;
  if (orKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { "Authorization": `Bearer ${orKey}` },
        signal: AbortSignal.timeout(5000),
      });
      result.openrouter = res.ok ? "ok" : "error";
    } catch {
      result.openrouter = "error";
    }
  } else {
    result.openrouter = "no-key";
  }

  const kKey = (klipyKey && klipyKey.length > 10) ? klipyKey : KLIPY_FALLBACK_KEY;
  if (kKey) {
    try {
      const res = await fetch(`${KLIPY_DEFAULT_ENDPOINT}/api/v1/${kKey}/gifs/search?q=test&per_page=1`, {
        signal: AbortSignal.timeout(5000),
      });
      const json = await res.json();
      result.klipy = json.result ? "ok" : "error";
    } catch {
      result.klipy = "error";
    }
  } else {
    result.klipy = "no-key";
  }

  return result;
}

// --- Smart Truncation ---

function smartTruncate(text, maxChars = 400) {
  if (text.length <= maxChars) return text;
  return text.slice(0, 300) + "\n...\n" + text.slice(-100);
}

// --- OpenRouter API ---

async function getGifQueries(text, openrouterKey) {
  if (!openrouterKey) {
    console.log("[AI-MIME] No OpenRouter key — using keyword fallback");
    return keywordFallback(text);
  }

  const truncated = smartTruncate(text);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openrouterKey}`,
        "HTTP-Referer": "https://github.com/Deefunxion/ai-mime",
        "X-Title": "AI-MIME",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: GIF_SYSTEM_PROMPT },
          { role: "user", content: `What SCENE or ACTION is this AI describing? Pick 2-3 specific GIF search terms:\n\n"${truncated}"` },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    // Parse JSON — handle markdown code blocks if present
    const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed.gif_queries) && parsed.gif_queries.length > 0) {
      console.log("[AI-MIME] OpenRouter queries:", parsed.gif_queries);
      return parsed.gif_queries;
    }
    throw new Error("Invalid format");
  } catch (err) {
    console.warn("[AI-MIME] OpenRouter failed, using fallback:", err);
    return keywordFallback(text);
  }
}

// --- Keyword Fallback (no API needed) ---

function keywordFallback(text) {
  if (!text.trim()) return ["waiting patiently"];

  if (/```[\s\S]*```/m.test(text)) return ["hacker typing fast", "this is fine fire", "matrix code"];
  if (/\b(bug|error|exception|crash|fix)\b/i.test(text)) return ["computer on fire", "this is fine dog", "debugging pain"];
  if (/\b(python|javascript|typescript|react|code)\b/i.test(text)) return ["programmer cat typing", "code matrix", "hackerman"];
  if (/\b(food|cook|recipe|eat|restaurant)\b/i.test(text)) return ["chef kiss perfection", "cooking disaster", "hungry eating"];
  if (/\b(money|price|cost|budget|dollar|euro)\b/i.test(text)) return ["money printer go brrr", "shut up take my money", "stonks"];
  if (/\b(math|calcul|equation|number|statistic)\b/i.test(text)) return ["confused math lady", "galaxy brain", "calculating intensifies"];
  if (/\b(ai|artificial intelligence|machine learning|robot|neural)\b/i.test(text)) return ["terminator thumbs up", "robot dance", "future technology"];
  if (/\b(car|drive|road|traffic|vehicle)\b/i.test(text)) return ["fast driving", "tokyo drift", "road trip"];
  if (/\b(music|song|sing|guitar|piano)\b/i.test(text)) return ["air guitar", "dancing to music", "headbanging rock"];
  if (/\b(sport|football|basketball|game|score)\b/i.test(text)) return ["sports celebration", "slam dunk", "victory dance"];
  if (/\b(cat|dog|pet|animal)\b/i.test(text)) return ["cute cat reaction", "dog excited", "animals being funny"];
  if (/\b(sleep|tired|night|morning|coffee)\b/i.test(text)) return ["need coffee desperately", "falling asleep", "monday morning"];
  if (/\b(weather|rain|sun|cold|hot)\b/i.test(text)) return ["dramatic rain walking", "melting hot", "freezing cold"];
  if (/\b(sorry|apologize|unfortunately|can't help)\b/i.test(text)) return ["sad violin playing", "tumbleweed blowing", "awkward seal"];
  if (/\b(warning|caution|careful|danger|avoid)\b/i.test(text)) return ["red alarm flashing", "run away scared", "danger zone"];
  if (/\b(great|awesome|excellent|perfect|wonderful)\b/i.test(text)) return ["mic drop walk away", "nailed it", "victory fireworks"];
  if (/\b(haha|lol|funny|joke)\b/i.test(text)) return ["laughing hysterically", "rolling on floor", "comedy drum"];
  if (/\b(hello|hi|hey|welcome|greetings)\b/i.test(text)) return ["cool entrance walking", "hey there wave", "sup nod"];
  if (/\b(explain|basically|here's how|step)\b/i.test(text)) return ["professor teaching", "write that down", "pay attention"];

  return ["interesting reaction", "processing information"];
}

// --- KLIPY API ---

let lastSearchTime = 0;
const MIN_SEARCH_INTERVAL = 2000;
const gifCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function searchGif(query, klipyKey, klipyEndpoint) {
  // Cache check
  const cached = gifCache.get(query);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  gifCache.delete(query);

  // Rate limit
  const wait = MIN_SEARCH_INTERVAL - (Date.now() - lastSearchTime);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastSearchTime = Date.now();

  const key = (klipyKey && klipyKey.length > 10) ? klipyKey : KLIPY_FALLBACK_KEY;
  const base = klipyEndpoint || KLIPY_DEFAULT_ENDPOINT;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const params = new URLSearchParams({ q: query, per_page: "5" });
      const res = await fetch(`${base}/api/v1/${key}/gifs/search?${params}`);
      const json = await res.json();

      if (!json.result || !json.data?.data?.length) {
        gifCache.set(query, { result: null, timestamp: Date.now() });
        return null;
      }

      const items = json.data.data;
      const item = items[Math.floor(Math.random() * items.length)];

      const result = {
        url: item.file.md.gif.url,
        title: item.title,
        slug: item.slug,
        sourceUrl: `https://klipy.com/gifs/${item.slug}`,
        width: item.file.md.gif.width,
        height: item.file.md.gif.height,
      };

      gifCache.set(query, { result, timestamp: Date.now() });
      return result;
    } catch (err) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        console.warn("[AI-MIME] KLIPY failed:", query, err);
        return null;
      }
    }
  }
  return null;
}

async function searchGifSequence(queries, klipyKey, klipyEndpoint) {
  const results = [];
  for (const q of queries) {
    const r = await searchGif(q, klipyKey, klipyEndpoint);
    if (r) results.push(r);
  }
  return results;
}

// --- Message Handler ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ai-message") {
    handleAiMessage(message, sender.tab?.id);
    return false;
  }
  if (message.type === "get-settings") {
    getSettings().then(sendResponse);
    return true;
  }
  if (message.type === "get-daily-count") {
    getDailyCount().then((count) => sendResponse({ count, limit: DAILY_FREE_LIMIT }));
    return true;
  }
  if (message.type === "check-status") {
    checkApiStatus(message.openrouterKey, message.klipyKey).then(sendResponse);
    return true;
  }
});

async function handleAiMessage(message, tabId) {
  if (!tabId) return;

  const settings = await getSettings();
  if (!settings.enabled) return;

  // Apply reaction delay
  if (settings.reactionDelay > 0) {
    await new Promise((r) => setTimeout(r, settings.reactionDelay * 1000));
  }

  let limited = false;

  try {
    // Determine which OpenRouter key to use
    let activeKey = settings.openrouterKey; // User's own key (unlimited)

    if (!activeKey && SHARED_OPENROUTER_KEY) {
      // No user key — check daily limit for shared key
      const count = await getDailyCount();
      if (count < DAILY_FREE_LIMIT) {
        activeKey = SHARED_OPENROUTER_KEY;
        await incrementDailyCount();
      } else {
        limited = true;
      }
    }

    // Step 1: Get GIF search terms
    const queries = limited
      ? keywordFallback(message.content)
      : await getGifQueries(message.content, activeKey);

    // Step 2: Search KLIPY for GIFs
    const gifs = await searchGifSequence(queries, settings.klipyKey, settings.klipyEndpoint);

    if (gifs.length > 0) {
      // Step 3: Send GIFs + limit status to content script
      chrome.tabs.sendMessage(tabId, {
        type: "show-gifs",
        gifs: gifs,
        limited: limited,
      });
    }
  } catch (err) {
    console.error("[AI-MIME] Pipeline failed:", err);
  }
}

// --- Install handler ---

chrome.runtime.onInstalled.addListener(() => {
  console.log("[AI-MIME] Extension v2.0 installed");
});
