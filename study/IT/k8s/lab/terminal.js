// 터미널 UI — PTY 가 없으므로 줄 편집·히스토리·완성을 직접 구현한다
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.K8sLab = Object.assign(root.K8sLab || {}, api);
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const escapeHtml = (text) => String(text == null ? "" : text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  class Terminal {
    constructor(options) {
      this.out = options.output;        // 출력 영역
      this.input = options.input;       // <input>
      this.prompt = options.prompt;     // 프롬프트 <span>
      this.onRun = options.onRun;       // (line) => {out, error}
      this.complete = options.complete; // (line) => string[]
      this.history = [];
      this.cursor = 0;
      this.draft = "";
      this.bind();
    }

    bind() {
      this.input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") { event.preventDefault(); this.submit(); return; }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          if (!this.history.length) return;
          if (this.cursor === this.history.length) this.draft = this.input.value;
          this.cursor = Math.max(0, this.cursor - 1);
          this.input.value = this.history[this.cursor];
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          if (this.cursor >= this.history.length) return;
          this.cursor += 1;
          this.input.value = this.cursor === this.history.length ? this.draft : this.history[this.cursor];
          return;
        }
        if (event.key === "Tab") {
          event.preventDefault();
          this.tryComplete();
          return;
        }
        if (event.key === "l" && event.ctrlKey) { event.preventDefault(); this.clear(); return; }
        if (event.key === "c" && event.ctrlKey) {
          event.preventDefault();
          this.write(`${this.promptText()}${this.input.value}^C`, "echo");
          this.input.value = "";
        }
      });
      this.out.addEventListener("click", () => {
        if (!window.getSelection || String(window.getSelection()) === "") this.input.focus();
      });
    }

    promptText() { return this.prompt.textContent + " "; }

    tryComplete() {
      if (!this.complete) return;
      const options = this.complete(this.input.value) || [];
      if (options.length === 1) {
        const parts = this.input.value.split(/\s+/);
        parts[parts.length - 1] = options[0];
        this.input.value = parts.join(" ") + " ";
      } else if (options.length > 1) {
        this.write(`${this.promptText()}${this.input.value}`, "echo");
        this.write(options.join("  "), "out");
      }
    }

    submit() {
      const line = this.input.value;
      this.input.value = "";
      this.write(`${this.promptText()}${line}`, "echo");
      if (line.trim()) {
        this.history.push(line.trim());
        this.cursor = this.history.length;
        const result = this.onRun(line) || {};
        if (result.clear) { this.clear(); return; }
        if (result.error) this.write(result.error, "err");
        else if (result.out) this.write(result.out, "out");
      }
      this.scroll();
    }

    write(text, kind) {
      if (String(text).includes("\u000c")) { this.clear(); return; }
      const line = document.createElement("pre");
      line.className = `term-line ${kind || "out"}`;
      line.innerHTML = escapeHtml(text);
      this.out.appendChild(line);
      this.scroll();
    }

    clear() { this.out.innerHTML = ""; }

    scroll() {
      const shell = this.out.parentElement;
      shell.scrollTop = shell.scrollHeight;
    }

    focus() { this.input.focus(); }
  }

  return { Terminal };
});
