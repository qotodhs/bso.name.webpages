// 실습 환경의 셸 — 메모리 파일시스템 + 기본 유닉스 명령 + kubectl 연결
// ---------------------------------------------------------------------------
// 파이프(|)와 리다이렉션(>, >>)을 먼저 떼어 내고, 세그먼트마다 토큰을 자른다.
// kubectl 전용 파서를 따로 두는 이유: 채점기(grader.js)의 파서는 리소스 축약을
// 정규형으로 바꿔 버려서, `create secret` 의 'secret' 까지 'secrets' 가 된다.
// ---------------------------------------------------------------------------
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.K8sLab = Object.assign(root.K8sLab || {}, api);
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const VALUE_SHORT = { n: "namespace", o: "output", l: "selector", f: "filename", c: "container", r: "replicas", L: "label-columns", p: "patch", k: "kustomize" };
  const BOOL_SHORT = { A: "all-namespaces", w: "watch", i: "stdin", t: "tty", R: "recursive", h: "help", a: "all" };
  const BOOL_LONG = new Set(["previous", "all-namespaces", "watch", "recursive", "force", "now", "follow", "ignore-daemonsets",
    "delete-emptydir-data", "delete-local-data", "help", "stdin", "tty", "overwrite", "no-headers", "show-labels", "rm",
    "quiet", "ignore-not-found", "record", "all", "containers", "print-join-command", "client", "server-side"]);
  const VERB_OVERRIDE = { logs: { f: { name: "follow", bool: true }, p: { name: "previous", bool: true } } };

  function tokenize(line) {
    const out = [];
    let cur = "", quote = null, started = false;
    const src = String(line || "").replace(/\\\r?\n/g, " ");
    for (let i = 0; i < src.length; i += 1) {
      const ch = src[i];
      if (quote) { if (ch === quote) quote = null; else cur += ch; continue; }
      if (ch === '"' || ch === "'") { quote = ch; started = true; continue; }
      if (/\s/.test(ch)) { if (started || cur) { out.push(cur); cur = ""; started = false; } continue; }
      cur += ch; started = true;
    }
    if (started || cur) out.push(cur);
    return out;
  }

  // 따옴표 밖의 구분자 위치로만 자른다
  function splitOutsideQuotes(line, separator) {
    const parts = [];
    let cur = "", quote = null;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (quote) { cur += ch; if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
      if (ch === separator) { parts.push(cur); cur = ""; continue; }
      cur += ch;
    }
    parts.push(cur);
    return parts;
  }

  function parse(segment) {
    const tokens = tokenize(segment);
    const argv = [];
    const flags = Object.create(null);
    let command = null;
    const verb = (tokens[1] || "").toLowerCase();
    const overrides = VERB_OVERRIDE[verb] || {};
    const setFlag = (name, value) => {
      if (flags[name] === undefined) flags[name] = value;
      else if (Array.isArray(flags[name])) flags[name].push(value);
      else flags[name] = [flags[name], value];
    };
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token === "--") { command = tokens.slice(i + 1); break; }
      if (token.startsWith("--")) {
        const body = token.slice(2);
        const eq = body.indexOf("=");
        if (eq >= 0) { setFlag(body.slice(0, eq), body.slice(eq + 1)); continue; }
        const next = tokens[i + 1];
        if (!BOOL_LONG.has(body) && next !== undefined && next !== "--" && !next.startsWith("-")) { setFlag(body, next); i += 1; }
        else setFlag(body, true);
        continue;
      }
      if (token.length > 1 && token[0] === "-") {
        const body = token.slice(1);
        const eq = body.indexOf("=");
        if (eq >= 0) {
          const short = body.slice(0, eq);
          const o = overrides[short];
          setFlag((o && o.name) || VALUE_SHORT[short] || BOOL_SHORT[short] || short, body.slice(eq + 1));
          continue;
        }
        const head = body[0];
        const o = overrides[head];
        const takesValue = o ? !o.bool : Boolean(VALUE_SHORT[head]);
        const name = (o && o.name) || VALUE_SHORT[head] || BOOL_SHORT[head] || head;
        if (takesValue) {
          if (body.length > 1) { setFlag(name, body.slice(1)); continue; }
          const next = tokens[i + 1];
          if (next !== undefined && next !== "--" && !next.startsWith("-")) { setFlag(name, next); i += 1; }
          else setFlag(name, true);
          continue;
        }
        body.split("").forEach((ch) => {
          const ov = overrides[ch];
          setFlag((ov && ov.name) || BOOL_SHORT[ch] || VALUE_SHORT[ch] || ch, true);
        });
        continue;
      }
      argv.push(token);
    }
    return { argv, flags, command };
  }

  class Shell {
    constructor(options) {
      this.cluster = options.cluster;
      this.kubectl = options.kubectl;
      this.openEditor = options.openEditor;
      this.files = Object.assign({}, options.files || {});
      this.cwd = "/root";
      this.history = [];
    }

    resolve(path) {
      if (!path) return this.cwd;
      let full = path.startsWith("/") ? path : `${this.cwd}/${path}`;
      const parts = [];
      full.split("/").forEach((part) => {
        if (!part || part === ".") return;
        if (part === "..") parts.pop();
        else parts.push(part);
      });
      return "/" + parts.join("/");
    }

    readFile(path) {
      const key = this.resolve(path);
      return this.files[key] === undefined ? null : this.files[key];
    }

    writeFile(path, text) { this.files[this.resolve(path)] = text; }

    listDir(path) {
      const dir = this.resolve(path);
      const prefix = dir === "/" ? "/" : dir + "/";
      const names = new Set();
      Object.keys(this.files).forEach((key) => {
        if (!key.startsWith(prefix)) return;
        names.add(key.slice(prefix.length).split("/")[0]);
      });
      return [...names].sort();
    }

    // 한 줄 실행 → { out, error }
    exec(line) {
      const raw = String(line || "").trim();
      if (!raw) return { out: "" };
      this.history.push(raw);

      // 리다이렉션 먼저 떼어 낸다
      let redirect = null, append = false, body = raw;
      const redirectMatch = /\s(>>?)\s*("[^"]+"|'[^']+'|\S+)\s*$/.exec(raw);
      if (redirectMatch) {
        append = redirectMatch[1] === ">>";
        redirect = redirectMatch[2].replace(/^["']|["']$/g, "");
        body = raw.slice(0, redirectMatch.index);
      }

      const segments = splitOutsideQuotes(body, "|").map((s) => s.trim()).filter(Boolean);
      let piped = "";
      let error = null;
      for (let i = 0; i < segments.length; i += 1) {
        const result = this.runSegment(segments[i], piped, i > 0);
        if (result.error) { error = result.error; piped = ""; break; }
        piped = result.out === undefined ? "" : result.out;
      }
      if (error) return { error };
      if (redirect) {
        const path = this.resolve(redirect);
        this.files[path] = append ? (this.files[path] || "") + piped + "\n" : piped + (piped.endsWith("\n") ? "" : "\n");
        return { out: "" };
      }
      return { out: piped };
    }

    runSegment(segment, input, isPipe) {
      const tokens = tokenize(segment);
      const cmd = tokens[0];
      const args = tokens.slice(1);
      try {
        if (cmd === "kubectl" || cmd === "k") {
          const parsed = parse(segment.replace(/^k\b/, "kubectl"));
          parsed.argv[0] = "kubectl";
          return { out: this.kubectl.run(parsed) };
        }
        const builtin = this.builtins[cmd];
        if (!builtin) return { error: `${cmd}: command not found` };
        return { out: builtin.call(this, args, input, segment) };
      } catch (e) {
        return { error: e.expected ? e.message : `${cmd}: ${e.message}` };
      }
    }

    get builtins() {
      const sh = this;
      return {
        help() {
          return [
            "실습 환경에서 쓸 수 있는 것",
            "",
            "  kubectl (k)   get describe create apply run expose delete scale set label annotate",
            "                taint logs exec rollout edit patch config top explain auth drain autoscale",
            "  파일          ls cat vi(vim/nano) echo rm mkdir pwd cd cp mv",
            "  텍스트        grep wc head tail sort base64 | 파이프, > >> 리다이렉션",
            "  기타          clear history reset help",
            "",
            "  vi <파일>     오른쪽 편집기에서 열립니다. 저장하면 파일에 반영됩니다.",
            "  kubectl edit  같은 편집기로 열리고, 저장하면 클러스터에 반영됩니다."
          ].join("\n");
        },
        ls(args) {
          const target = args.find((a) => !a.startsWith("-")) || ".";
          const names = sh.listDir(target);
          if (!names.length) return "";
          if (args.some((a) => a.startsWith("-") && a.includes("l"))) {
            return names.map((n) => {
              const full = sh.resolve(`${target}/${n}`);
              const size = sh.files[full] === undefined ? 4096 : sh.files[full].length;
              return `-rw-r--r-- 1 root root ${String(size).padStart(6)} ${n}`;
            }).join("\n");
          }
          return names.join("  ");
        },
        cat(args) {
          const out = args.filter((a) => !a.startsWith("-")).map((path) => {
            const text = sh.readFile(path);
            if (text === null) throw Object.assign(new Error(`cat: ${path}: No such file or directory`), { expected: true });
            return text;
          });
          return out.join("\n").replace(/\n$/, "");
        },
        echo(args, input, segment) {
          const m = /^echo\s+([\s\S]*)$/.exec(segment);
          if (!m) return "";
          return m[1].replace(/^["']|["']$/g, "");
        },
        pwd() { return sh.cwd; },
        cd(args) {
          const next = sh.resolve(args[0] || "/root");
          sh.cwd = next || "/";
          return "";
        },
        mkdir() { return ""; },
        rm(args) {
          args.filter((a) => !a.startsWith("-")).forEach((path) => { delete sh.files[sh.resolve(path)]; });
          return "";
        },
        cp(args) {
          const [from, to] = args.filter((a) => !a.startsWith("-"));
          const text = sh.readFile(from);
          if (text === null) throw Object.assign(new Error(`cp: cannot stat '${from}'`), { expected: true });
          sh.writeFile(to, text);
          return "";
        },
        mv(args) {
          const [from, to] = args.filter((a) => !a.startsWith("-"));
          const text = sh.readFile(from);
          if (text === null) throw Object.assign(new Error(`mv: cannot stat '${from}'`), { expected: true });
          sh.writeFile(to, text);
          delete sh.files[sh.resolve(from)];
          return "";
        },
        vi(args) {
          const path = sh.resolve(args.find((a) => !a.startsWith("-")) || "untitled.yaml");
          if (sh.files[path] === undefined) sh.files[path] = "";
          sh.openEditor(path, sh.files[path], (text) => { sh.files[path] = text; });
          return `${path} 를 오른쪽 편집기에서 열었습니다.`;
        },
        grep(args, input) {
          const flags = args.filter((a) => a.startsWith("-")).join("");
          const terms = args.filter((a) => !a.startsWith("-"));
          const pattern = terms[0] || "";
          const source = terms.length > 1 ? (sh.readFile(terms[1]) || "") : input;
          const invert = flags.includes("v");
          const icase = flags.includes("i");
          const re = new RegExp(flags.includes("w") ? `\\b${pattern}\\b` : pattern, icase ? "i" : "");
          const lines = String(source || "").split("\n").filter((l) => (invert ? !re.test(l) : re.test(l)));
          return flags.includes("c") ? String(lines.length) : lines.join("\n");
        },
        wc(args, input) {
          const text = String(input || "");
          const lines = text ? text.split("\n").length : 0;
          if (args.includes("-l")) return String(lines);
          if (args.includes("-w")) return String(text.split(/\s+/).filter(Boolean).length);
          return `${lines} ${text.split(/\s+/).filter(Boolean).length} ${text.length}`;
        },
        head(args, input) {
          const n = Number((args.find((a) => /^-n?\d*$/.test(a)) || "-10").replace(/\D/g, "")) || 10;
          const source = args.find((a) => !a.startsWith("-") && !/^\d+$/.test(a));
          return String(source ? sh.readFile(source) || "" : input).split("\n").slice(0, n).join("\n");
        },
        tail(args, input) {
          const n = Number((args.find((a) => /^-n?\d*$/.test(a)) || "-10").replace(/\D/g, "")) || 10;
          const source = args.find((a) => !a.startsWith("-") && !/^\d+$/.test(a));
          return String(source ? sh.readFile(source) || "" : input).split("\n").slice(-n).join("\n");
        },
        sort(args, input) {
          const lines = String(input || "").split("\n");
          const sorted = lines.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
          return (args.includes("-r") ? sorted.reverse() : sorted).join("\n");
        },
        base64(args, input) {
          const decode = args.includes("-d") || args.includes("--decode");
          const source = args.find((a) => !a.startsWith("-"));
          const text = source ? (sh.readFile(source) || source) : String(input || "");
          try {
            if (decode) return typeof atob === "function" ? atob(text.trim()) : Buffer.from(text.trim(), "base64").toString();
            return typeof btoa === "function" ? btoa(text) : Buffer.from(text).toString("base64");
          } catch (e) { return text; }
        },
        history() { return sh.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join("\n"); },
        clear() { return "\u000c"; },
        systemctl(args) {
          return `(실습 환경에는 systemd 가 없습니다. '${args.join(" ")}' 는 실제 노드에서 확인하세요.)`;
        },
        crictl() { return "(실습 환경에는 컨테이너 런타임이 없습니다. crictl 은 실제 노드에서 쓰세요.)"; }
      };
    }
  }

  return { Shell, tokenize, parseCommandLine: parse };
});
