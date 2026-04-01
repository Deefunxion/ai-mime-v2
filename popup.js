// AI-MIME v2 — Settings Popup
// Defaults live in background.js (SETTINGS_DEFAULTS) — load via get-settings message

// Load saved settings from background
chrome.runtime.sendMessage({ type: "get-settings" }, (settings) => {
  if (!settings) return;
  document.getElementById("enabled").checked = settings.enabled;
  document.getElementById("openrouterKey").value = settings.openrouterKey;
  document.getElementById("klipyKey").value = settings.klipyKey;
});

// Save
document.getElementById("save").addEventListener("click", () => {
  const settings = {
    enabled: document.getElementById("enabled").checked,
    openrouterKey: document.getElementById("openrouterKey").value.trim(),
    klipyKey: document.getElementById("klipyKey").value.trim(),
  };

  chrome.storage.sync.set(settings, () => {
    const status = document.getElementById("status");
    status.textContent = "Saved!";
    status.className = "status ok";
    setTimeout(() => { status.textContent = ""; }, 2000);
  });
});
