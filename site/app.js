"use strict";

const numberFormatter = new Intl.NumberFormat("ja-JP");
const updatedAtFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Asia/Tokyo",
});
const PUBLIC_KEYS = new Set([
  "schema_version",
  "event_name",
  "target",
  "total",
  "remaining",
  "achievement_rate",
  "data_through",
  "updated_at",
  "is_stale",
  "stores",
]);
const STORE_KEYS = new Set(["name", "count"]);
const STORE_CLASSES = new Map([
  ["岡山店", "store--okayama"],
  ["高松店", "store--takamatsu"],
  ["茨木店", "store--ibaraki"],
]);
const CACHE_KEY = "homerun-challenge-latest-v1";

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatUpdatedAt(value) {
  const date = parseDate(value);
  return date ? updatedAtFormatter.format(date) : "--";
}

function requireNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${name} is invalid`);
  }
  return value;
}

function validateData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data) || !Array.isArray(data.stores)) {
    throw new Error("data is invalid");
  }
  if (Object.keys(data).some((key) => !PUBLIC_KEYS.has(key))) {
    throw new Error("data contains an unexpected key");
  }
  if (typeof data.schema_version !== "number" || typeof data.event_name !== "string") {
    throw new Error("metadata is invalid");
  }
  if (typeof data.data_through !== "string" || typeof data.updated_at !== "string") {
    throw new Error("timestamps are invalid");
  }
  if (typeof data.is_stale !== "boolean") throw new Error("is_stale is invalid");
  requireNumber(data.total, "total");
  requireNumber(data.target, "target");
  requireNumber(data.remaining, "remaining");
  requireNumber(data.achievement_rate, "achievement_rate");
  for (const store of data.stores) {
    if (!store || typeof store !== "object" || Object.keys(store).some((key) => !STORE_KEYS.has(key))) {
      throw new Error("store is invalid");
    }
    if (typeof store.name !== "string") throw new Error("store name is invalid");
    requireNumber(store.count, "store count");
  }
  return data;
}

function isUpdateStale(updatedAt) {
  const timestamp = Date.parse(updatedAt);
  if (Number.isNaN(timestamp)) return true;
  return Date.now() - timestamp >= 36 * 60 * 60 * 1000;
}

function createStoreCard(store) {
  const card = document.createElement("article");
  card.className = `store ${STORE_CLASSES.get(store.name) || ""}`.trim();

  const name = document.createElement("span");
  name.textContent = store.name;

  const count = document.createElement("strong");
  const value = document.createElement("b");
  value.textContent = numberFormatter.format(store.count);
  const unit = document.createElement("small");
  unit.textContent = "本";
  count.append(value, unit);
  card.append(name, count);
  return card;
}

function render(data, forceStale = false) {
  const formattedTotal = numberFormatter.format(data.total);
  setText("total", formattedTotal);
  setText("participating-total", formattedTotal);
  setText("target", numberFormatter.format(data.target));
  setText("remaining", numberFormatter.format(data.remaining));
  setText("achievement-rate", numberFormatter.format(data.achievement_rate));
  setText("progress-badge", `${numberFormatter.format(data.achievement_rate)}%`);
  setText("progress-target", `目標 ${numberFormatter.format(data.target)}本`);
  setText("updated-at", formatUpdatedAt(data.updated_at));

  const progressRate = Math.max(0, Math.min(data.achievement_rate, 100));
  const progressFill = document.getElementById("progress-fill");
  progressFill.style.width = `${progressRate}%`;
  const progressTrack = document.getElementById("progress-track");
  progressTrack.setAttribute("aria-valuenow", String(progressRate));
  progressTrack.setAttribute("aria-valuetext", `${data.achievement_rate}%`);

  const staleWarning = document.getElementById("stale-warning");
  staleWarning.hidden = !(forceStale || data.is_stale || isUpdateStale(data.updated_at));

  const stores = document.getElementById("stores");
  stores.replaceChildren(...data.stores.map(createStoreCard));
}

function saveCachedData(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable in privacy mode; live data remains usable.
  }
}

function loadCachedData() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? validateData(JSON.parse(cached)) : null;
  } catch {
    return null;
  }
}

fetch(`data/latest.json?t=${Date.now()}`, { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(validateData)
  .then((data) => {
    saveCachedData(data);
    render(data);
  })
  .catch(() => {
    const cached = loadCachedData();
    if (cached) render(cached, true);
    document.getElementById("load-error").hidden = false;
  });
