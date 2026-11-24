import { RUNTIME_PATH } from "../build/runtime-module.ts";

export const RELOAD_PATH = "/__lusia/reload";
const ERROR_DOCS_URL = "/errors";

// Browser script: reload, css and hot swaps, error overlay, and reconnect.
const CLIENT_CODE = `
(function () {
  var protocol = location.protocol === "https:" ? "wss://" : "ws://";
  var url = protocol + location.host + "${RELOAD_PATH}";
  var overlay = null;
  var reconnecting = false;
  var loaded = false;
  var socket = null;
  var queuedReports = [];
  var lastMessage = null;
  var lastReportAt = 0;

  function appendLinked(node, text) {
    var parts = text.split(/(L[12]\\d{3})/);
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        node.appendChild(document.createTextNode(parts[i]));
        continue;
      }
      var link = document.createElement("a");
      link.href = "${ERROR_DOCS_URL}#" + parts[i].toLowerCase();
      link.textContent = parts[i];
      link.style.color = "inherit";
      node.appendChild(link);
    }
  }

  function showError(message) {
    if (!overlay) {
      overlay = document.createElement("pre");
      overlay.setAttribute("style", "position:fixed;inset:0;z-index:2147483647;margin:0;padding:24px;overflow:auto;background:#1a0606;color:#ffb4b4;font:14px/1.5 ui-monospace,monospace;white-space:pre-wrap");
      document.body.appendChild(overlay);
    }
    overlay.textContent = "";
    appendLinked(overlay, "Build failed\\n\\n" + message);
  }

  function sendReady() {
    if (loaded && socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ready" }));
  }

  function messageOf(value) {
    return value && value.message ? value.message : String(value);
  }

  function stackOf(value) {
    return value && value.stack ? value.stack : String(value);
  }

  function stackText(stack) {
    return String(stack).split(location.origin + "/").join("");
  }

  function sendReport(text) {
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(text);
    else if (queuedReports.length < 10) queuedReports.push(text);
  }

  function flushReports() {
    for (var i = 0; i < queuedReports.length; i++) socket.send(queuedReports[i]);
    queuedReports = [];
  }

  function reportError(message, stack) {
    var now = Date.now();
    if (String(message) === lastMessage && now - lastReportAt < 1000) return;
    lastMessage = String(message);
    lastReportAt = now;
    sendReport(JSON.stringify({
      type: "browser-error",
      page: location.pathname,
      message: String(message),
      stack: stackText(stack)
    }));
  }

  // The browser defers the extra size notices to the next frame, so nothing is lost.
  function isResizeObserverNotice(event) {
    return typeof event.message === "string" && event.message.indexOf("ResizeObserver loop") === 0;
  }

  function reportWindowError(event) {
    if (isResizeObserverNotice(event)) return;
    var stack = event.error ? stackOf(event.error) : event.message + "\\n" + event.filename + ":" + event.lineno + ":" + event.colno;
    reportError(event.message, stack);
  }

  function reportRejection(event) {
    reportError(messageOf(event.reason), stackOf(event.reason));
  }

  function findStyle(id) {
    var styles = document.querySelectorAll("style[data-lusia]");
    for (var i = 0; i < styles.length; i++) {
      if (styles[i].dataset.lusia === id) return styles[i];
    }
    return null;
  }

  // A component whose style is not in the page yet cannot be swapped, so the page reloads.
  function swapStyle(message) {
    var style = findStyle(message.id);
    if (!style) return location.reload();
    style.textContent = message.css;
    sendReady();
  }

  // Imports the new module and swaps every mounted instance of it. A module without an id cannot be swapped.
  function hotUpdate(message) {
    Promise.all([import(message.url), import("${RUNTIME_PATH}")]).then(function (loaded) {
      var component = loaded[0].default;
      if (!component || !component.id) return location.reload();
      loaded[1].swapComponent(component);
      hideError();
      sendReady();
    }).catch(function (error) {
      showError("Hot update failed\\n\\n" + stackOf(error));
      reportError("Hot update failed", stackOf(error));
    });
  }

  function hideError() {
    if (overlay) overlay.remove();
    overlay = null;
  }

  function connect() {
    socket = new WebSocket(url);
    socket.onopen = function () {
      flushReports();
      if (reconnecting) location.reload();
      else sendReady();
    };
    socket.onmessage = function (event) {
      var message = JSON.parse(event.data);
      if (message.type === "reload") location.reload();
      else if (message.type === "css") swapStyle(message);
      else if (message.type === "hot") hotUpdate(message);
      else showError(message.message);
    };
    socket.onclose = function () {
      reconnecting = true;
      setTimeout(connect, 1000);
    };
  }

  window.addEventListener("load", function () {
    loaded = true;
    sendReady();
  });
  window.addEventListener("error", reportWindowError);
  window.addEventListener("unhandledrejection", reportRejection);
  connect();
})();
`;

const CLIENT_TAG = `<script>${CLIENT_CODE}</script>`;

export function withReloadClient(html: string): string {
  if (html.includes("</body>")) return html.replace("</body>", () => `${CLIENT_TAG}</body>`);
  return html + CLIENT_TAG;
}
