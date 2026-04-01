// AI-MIME v2 — Settings Popup
// Defaults live in background.js — load via get-settings message

let currentSize = "medium";

// --- Load settings ---
chrome.runtime.sendMessage({ type: "get-settings" }, (settings) => {
  if (!settings) return;

  document.getElementById("enabled").checked = settings.enabled;
  document.getElementById("muteState").textContent = settings.enabled ? "Active" : "Muted";
  document.getElementById("openrouterKey").value = settings.openrouterKey || "";
  document.getElementById("klipyKey").value = settings.klipyKey || "";
  document.getElementById("reactionDelay").value = settings.reactionDelay || 0;
  document.getElementById("delayVal").textContent = (settings.reactionDelay || 0) + "s";

  // Size selector
  currentSize = settings.overlaySize || "medium";
  document.querySelectorAll(".size-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.size === currentSize);
  });

  // Check API status
  chrome.runtime.sendMessage({
    type: "check-status",
    openrouterKey: settings.openrouterKey,
    klipyKey: settings.klipyKey,
  }, (status) => {
    if (!status) return;
    setDot("dotOpenrouter", "statusOpenrouter", status.openrouter);
    setDot("dotKlipy", "statusKlipy", status.klipy);
  });
});

// --- Load daily counter ---
chrome.runtime.sendMessage({ type: "get-daily-count" }, (data) => {
  if (!data) return;
  document.getElementById("countUsed").textContent = data.count;
  document.getElementById("countLimit").textContent = data.limit;
});

// --- Status dot helper ---
function setDot(dotId, textId, status) {
  const dot = document.getElementById(dotId);
  const text = document.getElementById(textId);
  dot.className = "dot";
  if (status === "ok") {
    dot.classList.add("ok");
    text.textContent = "connected";
  } else if (status === "no-key") {
    text.textContent = "no key";
  } else {
    dot.classList.add("err");
    text.textContent = "error";
  }
}

// --- Quick mute toggle ---
document.getElementById("enabled").addEventListener("change", (e) => {
  const enabled = e.target.checked;
  document.getElementById("muteState").textContent = enabled ? "Active" : "Muted";
  chrome.storage.sync.set({ enabled });
});

// --- Size selector ---
document.querySelectorAll(".size-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentSize = btn.dataset.size;
    document.querySelectorAll(".size-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.size === currentSize)
    );
  });
});

// --- Delay slider ---
document.getElementById("reactionDelay").addEventListener("input", (e) => {
  document.getElementById("delayVal").textContent = e.target.value + "s";
});

// --- Save ---
document.getElementById("save").addEventListener("click", () => {
  const settings = {
    enabled: document.getElementById("enabled").checked,
    openrouterKey: document.getElementById("openrouterKey").value.trim(),
    klipyKey: document.getElementById("klipyKey").value.trim(),
    overlaySize: currentSize,
    reactionDelay: parseFloat(document.getElementById("reactionDelay").value),
  };

  chrome.storage.sync.set(settings, () => {
    const el = document.getElementById("saveStatus");
    el.textContent = "Saved!";
    el.className = "save-status ok";
    setTimeout(() => { el.textContent = ""; }, 2000);
  });
});
