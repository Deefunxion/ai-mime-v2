# AI-MIME Privacy Policy

**Last updated:** April 2026

## What AI-MIME does

AI-MIME is a Chrome extension that adds fun GIF reactions to your AI chat conversations. It reads AI assistant responses on supported sites to find contextually relevant GIFs.

## What data is collected

- **AI assistant responses only** — AI-MIME reads the text of AI responses on supported sites (Claude, ChatGPT, Gemini, Grok, DeepSeek). It **never** reads or stores your messages (what you type).
- **GIF search terms** — When API keys are configured, short keywords (2-3 words) derived from AI responses are sent to the KLIPY API to find matching GIFs. These are generic terms like "computer typing" or "chef cooking", not your conversation content.
- **AI response excerpts** — When the user provides their own OpenRouter API key, a truncated excerpt of AI responses (max 400 characters) is sent to OpenRouter for analysis. This is used solely to generate GIF search terms. Without an API key, no data is sent externally.

## What data is NOT collected

- Your typed messages or prompts
- Your account information or credentials
- Browsing history outside of supported AI chat sites
- Personally identifiable information (PII)
- Cookies, passwords, or form data

## User control

- **No API keys configured** — the extension works entirely offline using keyword matching. No external requests are made. No data leaves your browser.
- **With API keys** — the user chooses to enable AI-powered GIF matching by providing their own API keys. Data is sent only to the services the user has configured (OpenRouter, KLIPY). The user can remove their keys at any time to stop all external data transmission.

## Where data goes (only when user provides API keys)

- **OpenRouter API** (openrouter.ai) — receives truncated AI response excerpts (max 400 chars) to generate GIF search keywords. Processing is ephemeral — no data is stored by OpenRouter for free-tier usage.
- **KLIPY API** (klipy.com) — receives only GIF search keywords (2-3 words), not conversation content.
- **No first-party servers** — AI-MIME does not operate any server. There is no analytics, telemetry, or data collection by the developer.

## Data storage

- Settings (API keys, preferences) are stored locally in your browser via Chrome storage
- No data is written to external databases
- GIF cache is in-memory only and cleared when the browser restarts

## Contact

For questions about this privacy policy: https://github.com/Deefunxion/ai-mime-v2/issues
