# AI-MIME Privacy Policy

**Last updated:** April 2026

## What AI-MIME does

AI-MIME is a Chrome extension that adds fun GIF reactions to your AI chat conversations. It reads AI assistant responses on supported sites to find contextually relevant GIFs.

## What data is collected

- **AI assistant responses only** — AI-MIME reads the text of AI responses on supported sites (Claude, ChatGPT, Gemini, Grok, DeepSeek). It **never** reads or stores your messages (what you type).
- **GIF search terms** — Short keywords (2-3 words) derived from AI responses are sent to the KLIPY API to find matching GIFs. These are generic terms like "computer typing" or "chef cooking", not your conversation content.
- **AI response excerpts** — If an OpenRouter API key is configured, a truncated excerpt of AI responses (max 400 characters) is sent to OpenRouter for analysis. This is used solely to generate GIF search terms.

## What data is NOT collected

- Your typed messages or prompts
- Your account information or credentials
- Browsing history outside of supported AI chat sites
- Personally identifiable information (PII)
- Cookies, passwords, or form data

## Where data goes

- **OpenRouter API** (openrouter.ai) — receives truncated AI response excerpts (max 400 chars) to generate GIF search keywords. Processing is ephemeral — no data is stored.
- **KLIPY API** (klipy.com) — receives only GIF search keywords (2-3 words), not conversation content
- **No other servers** — AI-MIME does not have its own server or analytics

## Data storage

- Settings (API keys, preferences) are stored locally in your browser via Chrome storage
- No data is written to external databases
- GIF cache is in-memory only and cleared when the browser restarts

## Contact

For questions about this privacy policy: https://github.com/Deefunxion/ai-mime-v2/issues
