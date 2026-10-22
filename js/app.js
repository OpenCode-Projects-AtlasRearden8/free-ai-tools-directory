(function () {
  "use strict";

  const VALID_CATEGORIES = ["chat", "image", "writing", "study", "voice"];

  const cardsEl = document.getElementById("cards");
  const searchEl = document.getElementById("search");
  const countEl = document.getElementById("count");
  const errorEl = document.getElementById("error");
  const noResultsEl = document.getElementById("no-results");
  const verifiedEl = document.getElementById("verified");

  let tools = [];
  let meta = {};
  let activeCategory = "all";

  const state = { query: "" };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCategory(category) {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  function normaliseTool(raw) {
    return {
      id: String(raw.id || ""),
      name: String(raw.name || "Untitled tool"),
      category: String(raw.category || "").toLowerCase(),
      url: String(raw.url || ""),
      whatItDoes: String(raw.whatItDoes || ""),
      actuallyFree: String(raw.actuallyFree || ""),
      access: String(raw.access || "browser").toLowerCase() === "local" ? "local" : "browser",
      limits: String(raw.limits || ""),
      verifiedFreeOn: String(raw.verifiedFreeOn || "unknown"),
      recheckDate: String(raw.recheckDate || "unknown")
    };
  }

  function matches(tool) {
    if (activeCategory !== "all" && tool.category !== activeCategory) {
      return false;
    }
    if (!state.query) {
      return true;
    }
    const haystack = [
      tool.name,
      tool.whatItDoes,
      tool.actuallyFree,
      tool.limits,
      tool.access,
      tool.category
    ].join(" ").toLowerCase();
    return state.query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every(function (word) { return haystack.indexOf(word) !== -1; });
  }

  function renderCard(tool) {
    const isLocal = tool.access === "local";
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML =
      '<h2><a class="open" href="' + escapeHtml(tool.url) + '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(tool.name) + "</a>" +
        '<span class="badge cat-' + escapeHtml(tool.category) + '">' + escapeHtml(formatCategory(tool.category)) + "</span>" +
        '<span class="badge' + (isLocal ? " local" : "") + '">' + (isLocal ? "Runs locally" : "In your browser") + "</span>" +
      "</h2>" +
      "<p>" + escapeHtml(tool.whatItDoes) + "</p>" +
      '<p class="label">What is actually free</p>' +
      "<p>" + escapeHtml(tool.actuallyFree) + "</p>" +
      '<p class="label">Honest limits</p>' +
      '<p class="limits">' + escapeHtml(tool.limits) + "</p>" +
      '<p class="dates">Verified free on ' + escapeHtml(tool.verifiedFreeOn) +
        " &middot; re-check by " + escapeHtml(tool.recheckDate) + "</p>";
    return card;
  }

  function render() {
    cardsEl.textContent = "";
    const visible = tools.filter(matches);
    visible.forEach(function (tool) {
      cardsEl.appendChild(renderCard(tool));
    });
    noResultsEl.hidden = visible.length !== 0;
    countEl.textContent = "Showing " + visible.length + " of " + tools.length + " tools" +
      (activeCategory === "all" ? "" : " in “" + formatCategory(activeCategory) + "”") +
      (state.query ? " for “" + state.query + "”" : "");
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function extractData(container) {
    let payload = container;
    if (typeof container === "string") {
      payload = JSON.parse(container);
    } else if (typeof window.FREE_AI_TOOLS_FULL !== "undefined") {
      payload = window.FREE_AI_TOOLS_FULL;
    }
    const root = payload && (payload.tools ? payload : payload.data);
    if (!root || !Array.isArray(root.tools)) {
      throw new Error("data/tools.json must have a 'tools' array");
    }
    return root;
  }

  function loadData() {
    // Primary path: fetch the canonical JSON (works over http/server).
    if (window.location.protocol !== "file:") {
      return fetch("data/tools.json")
        .then(function (response) {
          if (!response.ok) {
            throw new Error("HTTP " + response.status + " loading data/tools.json");
          }
          return response.text();
        });
    }
    // Offline (file:// doubly-clicked) path: the generated data/tools.js
    // sets window.FREE_AI_TOOLS_FULL from the same source of truth.
    if (typeof window.FREE_AI_TOOLS_FULL === "undefined") {
      return Promise.reject(new Error("Offline data file data/tools.js is missing."));
    }
    return Promise.resolve(JSON.stringify(window.FREE_AI_TOOLS_FULL));
  }

  loadData()
    .then(function (raw) {
      const data = extractData(raw);
      tools = data.tools.map(normaliseTool);
      meta = data.meta || {};
      const unknown = tools.filter(function (t) { return VALID_CATEGORIES.indexOf(t.category) === -1; });
      if (unknown.length) {
        throw new Error("Tool(s) with unknown category: " + unknown.map(function (t) { return t.id; }).join(", "));
      }
      if (meta.updatedOn && verifiedEl) {
        verifiedEl.textContent = meta.updatedOn;
      }
      render();
    })
    .catch(function (err) {
      showError("Could not load the tool list: " + err.message + " If you opened this file directly, make sure data/tools.js exists next to index.html.");
    });

  searchEl.addEventListener("input", function () {
    state.query = searchEl.value.trim();
    render();
  });

  const filterButtons = Array.prototype.slice.call(document.querySelectorAll(".filter-btn"));
  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      activeCategory = button.dataset.category;
      filterButtons.forEach(function (other) {
        other.classList.toggle("active", other === button);
      });
      render();
    });
  });
})();
