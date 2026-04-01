# AI-MIME — GIF Reactions for AI Chats

A Chrome extension that watches your AI conversations and reacts with perfectly-matched GIFs.

When ChatGPT explains a code bug, you see "this is fine" dog. When Claude apologizes, a sad violin plays. When Gemini gets excited — mic drop.

## Install

**Chrome Web Store:** [Install AI-MIME](https://chrome.google.com/webstore) *(link coming soon)*

**Or build from source:**
1. Clone this repo
2. Go to `chrome://extensions` → enable Developer mode
3. Click "Load unpacked" → select the repo folder
4. Click the AI-MIME icon → add your [OpenRouter API key](https://openrouter.ai/keys) (free)

## How it works

1. You chat with an AI (Claude, ChatGPT, Gemini, Grok, or DeepSeek)
2. AI-MIME detects the response and analyzes what it's about
3. A floating GIF overlay appears with 2-3 perfectly-matched reaction GIFs

## Features

- Works on **Claude**, **ChatGPT**, **Gemini**, **Grok**, **DeepSeek**
- **15 free AI-powered reactions/day** (Chrome Web Store version)
- Keyword fallback when no API key — still works, just less precise
- **Draggable** overlay — move it anywhere on the page
- **Closeable** — click X to hide
- GIF sequences loop with dynamic timing
- Powered by KLIPY with source links

## Configuration

Click the AI-MIME extension icon to open settings:

- **OpenRouter API Key** — add your free key for unlimited AI-powered reactions
- **KLIPY API Key** — optional, has a default
- **Enabled** — toggle on/off

Get a free OpenRouter key at [openrouter.ai/keys](https://openrouter.ai/keys)

## Privacy

- Only reads AI assistant responses (never your typed messages)
- GIF search keywords sent to KLIPY API (2-3 generic words, not your conversation)
- AI response excerpts sent to OpenRouter for analysis (max 400 chars)
- No data stored on any server — all processing is ephemeral
- No analytics, no tracking, no accounts

Full privacy policy: [privacy-policy.md](privacy-policy.md)

## Tech Stack

- Chrome Extension Manifest V3
- OpenRouter API (LLM for GIF search term generation)
- KLIPY API (GIF search)
- Vanilla JavaScript (no build step, no frameworks)

## Contributing

PRs welcome! To develop locally:

1. Fork and clone
2. Load unpacked in Chrome (`chrome://extensions`)
3. Add your own API keys in the extension settings
4. Make changes → reload extension to test

## License

MIT — do whatever you want with it.
