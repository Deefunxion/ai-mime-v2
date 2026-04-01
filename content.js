// AI-MIME v2 — Content Script
// Detects AI assistant responses + displays GIF overlay

(function () {
  "use strict";

  // ============================================================
  // PART 1: SITE ADAPTERS
  // ============================================================

  const ADAPTERS = {
    claude: {
      hostMatch: "claude.ai",
      messageSelectors: [
        "[data-is-streaming='false'] [class*='claude'] .whitespace-pre-wrap",
        "[data-is-streaming='false'] .font-claude-message",
        "[data-is-streaming='false'] .prose",
        "[data-is-streaming='false'] .whitespace-pre-wrap",
        ".font-claude-message",
        "[data-is-streaming='false']",
      ],
      fallbackSelectors: ["[role='article']", ".prose", "[class*='message'] .whitespace-pre-wrap"],
      excludeSelectors: ["details", "[class*='thinking']", "[class*='Thinking']", "summary"],
      streamingSelector: "[data-is-streaming='true']",
      minLength: 20,
    },
    chatgpt: {
      hostMatch: "chatgpt.com",
      messageSelectors: [
        "[data-message-author-role='assistant'] .markdown",
        "[data-message-author-role='assistant'] .whitespace-pre-wrap",
        "[data-message-author-role='assistant']",
      ],
      fallbackSelectors: ["[role='article']", ".prose", "[class*='assistant']"],
      streamingSelector: "button[aria-label='Stop generating'], button[data-testid='stop-button']",
      minLength: 20,
    },
    gemini: {
      hostMatch: "gemini.google.com",
      messageSelectors: [
        "message-content .model-response-text",
        "message-content .markdown",
        ".response-container .markdown",
        "model-response message-content",
      ],
      fallbackSelectors: ["[role='article']", ".prose", "[class*='response']"],
      streamingSelector: ".loading-indicator, .streaming-indicator",
      minLength: 20,
    },
    grok: {
      hostMatch: "grok",
      messageSelectors: [
        ".response-content-markdown",
        "[class*='response-content'] .markdown",
        "[class*='response-content']",
      ],
      fallbackSelectors: [".markdown", "p.break-words", "[role='article']"],
      streamingSelector: null,
      minLength: 20,
    },
    deepseek: {
      hostMatch: "chat.deepseek.com",
      messageSelectors: [".ds-message .ds-markdown", ".ds-markdown", ".ds-markdown-paragraph", ".ds-markdown--block"],
      fallbackSelectors: ["[role='article']", ".prose", "[class*='assistant']"],
      streamingSelector: ".ds-loading, [class*='loading']",
      minLength: 20,
    },
  };

  // ============================================================
  // PART 2: SITE DETECTION
  // ============================================================

  function detectSite() {
    const host = window.location.hostname;
    const path = window.location.pathname;
    for (const [name, config] of Object.entries(ADAPTERS)) {
      if (host.includes(config.hostMatch)) {
        return { name, config };
      }
    }
    if (host === "x.com" && path.startsWith("/i/grok")) {
      return { name: "grok", config: ADAPTERS.grok };
    }
    return null;
  }

  const site = detectSite();
  if (!site) return;
  console.log("[AI-MIME] Detected site:", site.name);

  // ============================================================
  // PART 3: MESSAGE DETECTION
  // ============================================================

  let lastSentText = "";
  let debounceTimer = null;
  let lastMatchedSelector = null;
  let lastMessageTime = Date.now();
  let healthCheckWarned = false;
  let lastElementCount = 0;

  function getCleanText(element) {
    const excludes = site.config.excludeSelectors || [];
    if (excludes.length === 0) return element.textContent?.trim() || "";
    const clone = element.cloneNode(true);
    for (const sel of excludes) {
      try { clone.querySelectorAll(sel).forEach((el) => el.remove()); } catch (e) {}
    }
    return clone.textContent?.trim() || "";
  }

  function getLastAssistantMessage() {
    let bestText = null;
    let bestCount = 0;
    let bestSelector = null;

    const allSelectors = [...site.config.messageSelectors, ...(site.config.fallbackSelectors || [])];

    for (const selector of allSelectors) {
      try {
        const msgs = document.querySelectorAll(selector);
        if (msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          const text = getCleanText(lastMsg);
          if (text && text.length >= site.config.minLength) {
            if (msgs.length > bestCount || (msgs.length === bestCount && text.length > (bestText?.length || 0))) {
              bestText = text;
              bestCount = msgs.length;
              bestSelector = selector;
            }
          }
        }
      } catch (e) {}
    }

    if (bestText) {
      if (lastMatchedSelector !== bestSelector) {
        lastMatchedSelector = bestSelector;
        console.log("[AI-MIME] Matched selector:", bestSelector, "(" + bestCount + " elements)");
      }
      lastElementCount = bestCount;
    }
    return bestText;
  }

  setInterval(() => {
    if (Date.now() - lastMessageTime > 30000 && !healthCheckWarned) {
      healthCheckWarned = true;
      console.warn("[AI-MIME] No messages detected for 30s — selectors may be outdated for", site.name);
    }
  }, 15000);

  function checkIsStreaming() {
    if (!site.config.streamingSelector) return false;
    return !!document.querySelector(site.config.streamingSelector);
  }

  let wasStreaming = false;

  function checkForNewMessage() {
    if (checkIsStreaming()) { wasStreaming = true; return; }
    wasStreaming = false;

    const fullText = getLastAssistantMessage();
    if (!fullText) return;

    const compareKey = lastElementCount + ":" + fullText.length + ":" + fullText.slice(-200);
    if (compareKey === lastSentText) return;

    lastSentText = compareKey;
    lastMessageTime = Date.now();
    healthCheckWarned = false;

    // v2: Send to background.js instead of WebSocket
    try {
      chrome.runtime.sendMessage({
        type: "ai-message",
        source: site.name,
        content: fullText.slice(0, 2000),
        timestamp: Date.now(),
      });
      console.log("[AI-MIME] Sent from", site.name, "(" + fullText.length + " chars)");
    } catch (err) {
      console.warn("[AI-MIME] Extension context lost:", err.message);
    }
  }

  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => checkForNewMessage(), wasStreaming ? 800 : 300);
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  setInterval(() => checkForNewMessage(), 3000);

  // ============================================================
  // PART 4: GIF OVERLAY
  // ============================================================

  let overlayEl = null;
  let gifImgEl = null;
  let titleEl = null;
  let nudgeEl = null;
  let currentSequence = [];
  let currentIndex = 0;
  let loopTimer = null;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  function createOverlay() {
    overlayEl = document.createElement("div");
    overlayEl.id = "ai-mime-overlay";

    // Apply saved size
    chrome.storage.sync.get({ overlaySize: "medium" }, (s) => {
      overlayEl.className = "size-" + (s.overlaySize || "medium");
    });

    gifImgEl = document.createElement("img");
    gifImgEl.id = "ai-mime-gif";
    gifImgEl.draggable = false;

    titleEl = document.createElement("a");
    titleEl.id = "ai-mime-title";
    titleEl.target = "_blank";
    titleEl.rel = "noopener noreferrer";

    const poweredEl = document.createElement("a");
    poweredEl.id = "ai-mime-powered";
    poweredEl.href = "https://klipy.com";
    poweredEl.target = "_blank";
    poweredEl.rel = "noopener noreferrer";
    poweredEl.textContent = "Powered by KLIPY";

    const bottomBar = document.createElement("div");
    bottomBar.id = "ai-mime-bottom";
    bottomBar.appendChild(titleEl);
    bottomBar.appendChild(poweredEl);

    const closeBtn = document.createElement("button");
    closeBtn.id = "ai-mime-close";
    closeBtn.textContent = "\u2715";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      overlayEl.style.display = "none";
    });

    // Nudge message (shown when daily limit reached)
    nudgeEl = document.createElement("div");
    nudgeEl.id = "ai-mime-nudge";
    nudgeEl.innerHTML = 'Daily free reactions used! <a id="ai-mime-nudge-link" href="https://openrouter.ai/keys" target="_blank">Add your free key for unlimited</a>';
    nudgeEl.style.display = "none";

    overlayEl.appendChild(gifImgEl);
    overlayEl.appendChild(bottomBar);
    overlayEl.appendChild(nudgeEl);
    overlayEl.appendChild(closeBtn);

    // Dragging
    overlayEl.addEventListener("mousedown", (e) => {
      if (e.target === closeBtn || e.target === titleEl || e.target === poweredEl) return;
      isDragging = true;
      const rect = overlayEl.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      overlayEl.style.cursor = "grabbing";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      overlayEl.style.right = "auto";
      overlayEl.style.bottom = "auto";
      overlayEl.style.left = (e.clientX - dragOffset.x) + "px";
      overlayEl.style.top = (e.clientY - dragOffset.y) + "px";
    });

    document.addEventListener("mouseup", () => {
      if (isDragging && overlayEl) {
        const rect = overlayEl.getBoundingClientRect();
        chrome.storage.local.set({
          overlayLeft: Math.round(rect.left),
          overlayTop: Math.round(rect.top),
        });
      }
      isDragging = false;
      if (overlayEl) overlayEl.style.cursor = "grab";
    });

    // Restore saved position
    chrome.storage.local.get({ overlayLeft: null, overlayTop: null }, (pos) => {
      if (pos.overlayLeft !== null && pos.overlayTop !== null) {
        overlayEl.style.right = "auto";
        overlayEl.style.bottom = "auto";
        overlayEl.style.left = pos.overlayLeft + "px";
        overlayEl.style.top = pos.overlayTop + "px";
      }
    });

    document.body.appendChild(overlayEl);
  }

  function showGifAtIndex(index) {
    if (currentSequence.length === 0) return;
    const safeIndex = index % currentSequence.length;
    currentIndex = safeIndex;
    const gif = currentSequence[safeIndex];

    gifImgEl.style.opacity = "0";
    setTimeout(() => {
      gifImgEl.src = gif.url;
      gifImgEl.alt = gif.title;
      titleEl.textContent = gif.title + " \u2197";
      titleEl.href = gif.sourceUrl;
      gifImgEl.style.opacity = "1";
    }, 200);

    if (currentSequence.length > 1) {
      const isLast = safeIndex === currentSequence.length - 1;
      const area = gif.width * gif.height;
      const duration = isLast ? 4000 : (area > 200000 ? 3500 : 2500);
      loopTimer = setTimeout(() => showGifAtIndex(safeIndex + 1), duration);
    }
  }

  function playSequence(gifs) {
    if (gifs.length === 0) return;

    if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }

    if (!overlayEl) createOverlay();
    overlayEl.style.display = "flex";

    // Preload
    gifs.forEach((g) => { const img = new Image(); img.src = g.url; });

    currentSequence = gifs;
    currentIndex = 0;
    showGifAtIndex(0);

    console.log("[AI-MIME] Playing:", gifs.map((g) => g.title).join(" \u2192 "));
  }

  // Listen for GIF results from background.js
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "show-gifs") {
      playSequence(message.gifs);
      if (nudgeEl) {
        nudgeEl.style.display = message.limited ? "block" : "none";
      }
    }
  });

  // Listen for settings changes (size, mute from popup)
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.overlaySize && overlayEl) {
      overlayEl.className = "size-" + changes.overlaySize.newValue;
    }
    if (changes.enabled) {
      if (!changes.enabled.newValue && overlayEl) {
        overlayEl.style.display = "none";
      }
    }
  });

  console.log("[AI-MIME] Observing", site.name, "for new messages");
})();
