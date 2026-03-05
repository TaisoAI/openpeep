/**
 * OpenPeep SDK — include in every peep's index.html
 * <script src="../_sdk/peep-sdk.js"></script>
 */
(function () {
  const PeepSDK = {
    _handlers: {},
    _initData: null,
    _ready: false,

    /** Register a handler for app messages */
    on(event, handler) {
      this._handlers[event] = handler;
    },

    /** Send a message to the host app */
    send(type, payload = {}) {
      window.parent.postMessage({ source: "peep", type, ...payload }, "*");
    },

    /** Tell the app this peep is ready */
    ready() {
      this._ready = true;
      this.send("peep:ready");
    },

    /** Request a file save */
    save(content) {
      this.send("peep:save", { content });
    },

    /** Request a tool run */
    runTool(toolId, args = {}) {
      this.send("peep:run-tool", { toolId, args });
    },

    /** Send verification results */
    verifyResult(errors = [], warnings = []) {
      this.send("peep:verify-result", { errors, warnings });
    },

    /** Request resize */
    resize(height) {
      this.send("peep:resize", { height });
    },

    /** Get the init data (file content, settings, etc.) */
    getInitData() {
      return this._initData;
    },

    /** Construct a URL to load a raw file via the backend */
    rawFileUrl(filePath) {
      const base =
        (this._initData && this._initData.apiBase) ||
        "http://localhost:8000/api";
      return `${base}/file/raw?path=${encodeURIComponent(filePath)}`;
    },
  };

  // Listen for messages from the host app
  window.addEventListener("message", (event) => {
    const { type, ...payload } = event.data || {};
    if (!type) return;

    if (type === "peep:init") {
      PeepSDK._initData = payload;
      if (PeepSDK._handlers["init"]) {
        PeepSDK._handlers["init"](payload);
      }
    } else if (type === "peep:theme") {
      // Inject theme CSS variables from host app
      var theme = payload.theme || {};
      var css = ":root { " + Object.keys(theme).map(function(k) {
        return k + ": " + theme[k];
      }).join("; ") + "; }\nbody { background: var(--bg-app) !important; color: var(--text-primary) !important; }";
      var existing = document.getElementById("peep-theme");
      if (existing) existing.remove();
      var style = document.createElement("style");
      style.id = "peep-theme";
      style.textContent = css;
      document.head.appendChild(style);
      if (PeepSDK._handlers["theme"]) {
        PeepSDK._handlers["theme"](payload);
      }
    } else if (type === "peep:file-changed") {
      if (PeepSDK._handlers["file-changed"]) {
        PeepSDK._handlers["file-changed"](payload);
      }
    } else if (type === "peep:settings-changed") {
      if (PeepSDK._handlers["settings-changed"]) {
        PeepSDK._handlers["settings-changed"](payload);
      }
    }

    // Generic handler
    if (PeepSDK._handlers[type]) {
      PeepSDK._handlers[type](payload);
    }
  });

  window.PeepSDK = PeepSDK;
})();
