// kubectl 명령·매니페스트 채점기
// ---------------------------------------------------------------------------
// 브라우저에서는 window.K8SGrader, Node 에서는 module.exports 로 쓴다.
// 채점 결과는 항상 { pass, score, checks:[{ok,label,got}], notes:[] } 형태다.
// score 는 통과한 조건 / 전체 조건 이라 모의 세션의 부분점수로 그대로 쓴다.
// ---------------------------------------------------------------------------
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.K8SGrader = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 값을 받는 짧은 플래그 / 불리언 짧은 플래그
  const VALUE_SHORT = {
    n: "namespace", o: "output", l: "selector", f: "filename", c: "container",
    r: "replicas", L: "label-columns", v: "v", k: "kustomize", e: "env", s: "server"
  };
  const BOOL_SHORT = {
    A: "all-namespaces", p: "previous", w: "watch", i: "stdin", t: "tty",
    R: "recursive", h: "help"
  };
  // 같은 글자가 명령마다 다른 뜻을 갖는 경우
  const VERB_SHORT_OVERRIDE = {
    logs: { f: { name: "follow", bool: true } },
    attach: { c: { name: "container", bool: false } },
    patch: { p: { name: "patch", bool: false } },
    apply: { p: { name: "prune", bool: true } }
  };
  const BOOL_LONG = new Set([
    "previous", "all-namespaces", "watch", "recursive", "force", "now", "follow",
    "ignore-daemonsets", "delete-emptydir-data", "delete-local-data", "help",
    "stdin", "tty", "overwrite", "no-headers", "show-labels", "rm", "quiet",
    "ignore-not-found", "server-side", "prune", "save-config", "record",
    "insecure-skip-tls-verify", "allow-missing-template-keys", "export"
  ]);
  // 축약 리소스 이름을 정규형으로 모은다. `po` `pod` `pods` 를 같게 본다.
  const RESOURCE_ALIASES = {
    po: "pods", pod: "pods", pods: "pods",
    deploy: "deployments", deployment: "deployments", deployments: "deployments",
    rs: "replicasets", replicaset: "replicasets", replicasets: "replicasets",
    sts: "statefulsets", statefulset: "statefulsets", statefulsets: "statefulsets",
    ds: "daemonsets", daemonset: "daemonsets", daemonsets: "daemonsets",
    svc: "services", service: "services", services: "services",
    ns: "namespaces", namespace: "namespaces", namespaces: "namespaces",
    no: "nodes", node: "nodes", nodes: "nodes",
    cm: "configmaps", configmap: "configmaps", configmaps: "configmaps",
    secret: "secrets", secrets: "secrets",
    pv: "persistentvolumes", persistentvolume: "persistentvolumes", persistentvolumes: "persistentvolumes",
    pvc: "persistentvolumeclaims", persistentvolumeclaim: "persistentvolumeclaims", persistentvolumeclaims: "persistentvolumeclaims",
    sc: "storageclasses", storageclass: "storageclasses", storageclasses: "storageclasses",
    sa: "serviceaccounts", serviceaccount: "serviceaccounts", serviceaccounts: "serviceaccounts",
    ing: "ingresses", ingress: "ingresses", ingresses: "ingresses",
    ingressclass: "ingressclasses", ingressclasses: "ingressclasses",
    endpointslice: "endpointslices", endpointslices: "endpointslices",
    netpol: "networkpolicies", networkpolicy: "networkpolicies", networkpolicies: "networkpolicies",
    cj: "cronjobs", cronjob: "cronjobs", cronjobs: "cronjobs",
    job: "jobs", jobs: "jobs",
    hpa: "horizontalpodautoscalers", horizontalpodautoscaler: "horizontalpodautoscalers",
    pdb: "poddisruptionbudgets", poddisruptionbudget: "poddisruptionbudgets",
    quota: "resourcequotas", resourcequota: "resourcequotas", resourcequotas: "resourcequotas",
    limits: "limitranges", limitrange: "limitranges", limitranges: "limitranges",
    ep: "endpoints", endpoint: "endpoints",
    ev: "events", event: "events", events: "events",
    role: "roles", roles: "roles",
    rolebinding: "rolebindings", rolebindings: "rolebindings",
    clusterrole: "clusterroles", clusterroles: "clusterroles",
    clusterrolebinding: "clusterrolebindings", clusterrolebindings: "clusterrolebindings",
    crd: "customresourcedefinitions", crds: "customresourcedefinitions",
    pc: "priorityclasses", priorityclass: "priorityclasses"
  };
  // kubectl 을 빠뜨리고 친 입력을 살려주기 위한 동사 목록
  const VERBS = new Set([
    "get", "run", "create", "apply", "delete", "describe", "edit", "expose", "scale",
    "set", "label", "annotate", "taint", "drain", "cordon", "uncordon", "logs",
    "exec", "port-forward", "rollout", "top", "explain", "patch", "replace", "cp",
    "auth", "config", "api-resources", "api-versions", "cluster-info", "certificate",
    "diff", "wait", "debug", "attach", "proxy", "kustomize", "version", "events", "autoscale"
  ]);

  // 따옴표를 살려서 자른다. 백슬래시 줄바꿈은 공백으로 본다.
  function tokenize(line) {
    const out = [];
    let cur = "", quote = null, started = false;
    const src = String(line == null ? "" : line).replace(/\\\r?\n/g, " ").replace(/\r/g, "");
    for (let i = 0; i < src.length; i += 1) {
      const ch = src[i];
      if (quote) {
        if (ch === quote) quote = null;
        else cur += ch;
        continue;
      }
      if (ch === '"' || ch === "'") { quote = ch; started = true; continue; }
      if (/\s/.test(ch)) {
        if (started || cur) { out.push(cur); cur = ""; started = false; }
        continue;
      }
      cur += ch;
      started = true;
    }
    if (started || cur) out.push(cur);
    return out;
  }

  function canonicalResource(token) {
    const key = String(token).toLowerCase();
    return RESOURCE_ALIASES[key] || token;
  }

  // `deploy/web` 처럼 붙여 쓴 형태를 두 토큰으로 편다.
  function expandArgvToken(token) {
    if (token.includes("/")) {
      const [kind, ...rest] = token.split("/");
      const canon = RESOURCE_ALIASES[String(kind).toLowerCase()];
      if (canon && rest.length === 1 && rest[0]) return [canon, rest[0]];
    }
    return [canonicalResource(token)];
  }

  // 명령줄 한 줄 → { argv, flags, command, redirect, piped, raw }
  function parseCommand(line) {
    let tokens = tokenize(line);
    if (tokens[0] === "$" || tokens[0] === "#") tokens = tokens.slice(1);
    if (tokens[0] === "sudo") tokens = tokens.slice(1);
    if (tokens.length && /^;+$/.test(tokens[tokens.length - 1])) tokens.pop();

    // 리다이렉션은 파이프 끝에 붙는 일이 많아 파이프를 자르기 전에 먼저 떼어 낸다.
    let redirect = null;
    const kept = [];
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token === ">" || token === ">>" || token === "1>") { redirect = tokens[i + 1] || ""; i += 1; continue; }
      if (/^>>?[^>]/.test(token)) { redirect = token.replace(/^>+/, ""); continue; }
      kept.push(token);
    }
    tokens = kept;

    // 파이프 뒤는 채점하지 않고 기록만 한다.
    let piped = null;
    const pipeAt = tokens.indexOf("|");
    if (pipeAt >= 0) { piped = tokens.slice(pipeAt + 1).join(" "); tokens = tokens.slice(0, pipeAt); }

    if (tokens[0] === "k" || tokens[0] === "kubectl") tokens[0] = "kubectl";
    else if (VERBS.has(String(tokens[0]).toLowerCase())) tokens.unshift("kubectl");

    const verb = tokens[1] ? String(tokens[1]).toLowerCase() : "";
    const overrides = VERB_SHORT_OVERRIDE[verb] || {};
    const argv = [];
    const flags = Object.create(null);
    // 같은 플래그를 여러 번 준 경우(--from-literal 등)는 배열로 모은다.
    const setFlag = (name, value) => {
      if (flags[name] === undefined) { flags[name] = value; return; }
      if (Array.isArray(flags[name])) flags[name].push(value);
      else flags[name] = [flags[name], value];
    };
    let command = null;

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token === "--") { command = tokens.slice(i + 1); break; }

      if (token.startsWith("--")) {
        const body = token.slice(2);
        const eq = body.indexOf("=");
        if (eq >= 0) { setFlag(body.slice(0, eq), body.slice(eq + 1)); continue; }
        const next = tokens[i + 1];
        if (!BOOL_LONG.has(body) && next !== undefined && next !== "--" && !next.startsWith("-")) {
          setFlag(body, next); i += 1;
        } else {
          setFlag(body, true);
        }
        continue;
      }

      if (token.length > 1 && token[0] === "-") {
        const body = token.slice(1);
        const eq = body.indexOf("=");
        if (eq >= 0) {
          const short = body.slice(0, eq);
          const name = (overrides[short] && overrides[short].name) || VALUE_SHORT[short] || BOOL_SHORT[short] || short;
          setFlag(name, body.slice(eq + 1));
          continue;
        }
        const head = body[0];
        const override = overrides[head];
        const takesValue = override ? !override.bool : Boolean(VALUE_SHORT[head]);
        const name = (override && override.name) || VALUE_SHORT[head] || BOOL_SHORT[head] || head;
        if (takesValue) {
          if (body.length > 1) { setFlag(name, body.slice(1)); continue; }   // -nweb
          const next = tokens[i + 1];
          if (next !== undefined && next !== "--" && !next.startsWith("-")) { setFlag(name, next); i += 1; }
          else setFlag(name, true);
          continue;
        }
        // -it 처럼 붙여 쓴 불리언 묶음
        body.split("").forEach((ch) => {
          const o = overrides[ch];
          setFlag((o && o.name) || BOOL_SHORT[ch] || VALUE_SHORT[ch] || ch, true);
        });
        continue;
      }

      expandArgvToken(token).forEach((part) => argv.push(part));
    }

    return { argv, flags, command, redirect, piped, raw: String(line || "").trim() };
  }

  function flagText(name, want) {
    if (want === true) return "`--" + name + "`";
    if (want && typeof want === "object") {
      if (want.all) return want.all.map((v) => "`--" + name + "=" + v + "`").join(", ");
      if (want.oneOf) return "`--" + name + "=" + want.oneOf.join("|") + "`";
      if (want.matches) return "`--" + name + "` (" + want.matches + ")";
      return "`--" + name + "`";
    }
    return "`--" + name + "=" + want + "`";
  }

  function matchFlagValue(have, want) {
    if (have === undefined) return false;
    if (want === true) return true;
    const values = (Array.isArray(have) ? have : [have]).map(String);
    if (want && typeof want === "object") {
      if (want.all) return want.all.every((v) => values.includes(String(v)));
      if (want.oneOf) return values.some((v) => want.oneOf.some((w) => String(w) === v));
      if (want.matches) { const re = new RegExp(want.matches); return values.some((v) => re.test(v)); }
      return true;
    }
    return values.includes(String(want));
  }

  // 필요한 토큰이 순서대로 들어 있으면 통과. 사이에 다른 토큰이 끼는 건 허용한다.
  function missingInOrder(required, actual) {
    let cursor = 0;
    for (const need of required) {
      let found = -1;
      for (let i = cursor; i < actual.length; i += 1) {
        if (String(actual[i]).toLowerCase() === String(need).toLowerCase()) { found = i; break; }
      }
      if (found < 0) return need;
      cursor = found + 1;
    }
    return null;
  }

  function gradeOne(input, spec) {
    const parsed = parseCommand(input);
    const checks = [];
    const notes = [];

    const required = [];
    (spec.argv || []).forEach((token) => expandArgvToken(token).forEach((t) => required.push(t)));
    if (required.length) {
      const missing = missingInOrder(required, parsed.argv);
      checks.push({
        ok: !missing,
        // 표시는 과제에 적힌 원래 형태로, 비교는 정규화한 토큰으로 한다.
        label: "명령 형태 `" + (spec.argv || []).join(" ") + "`",
        got: missing ? "`" + missing + "` 가 없거나 순서가 다릅니다" : ""
      });
    }

    Object.keys(spec.flags || {}).forEach((name) => {
      const want = spec.flags[name];
      const have = parsed.flags[name];
      checks.push({
        ok: matchFlagValue(have, want),
        label: (spec.labels && spec.labels[name]) || flagText(name, want),
        got: have === undefined ? "빠졌습니다" : (have === true ? "" : "지금 값 `" + [].concat(have).join(", ") + "`")
      });
    });

    (spec.forbid || []).forEach((name) => {
      const present = parsed.flags[name] !== undefined;
      checks.push({ ok: !present, label: "`--" + name + "` 없이 풀기", got: present ? "사용했습니다" : "" });
    });

    if (spec.command) {
      const actual = parsed.command || [];
      const missing = missingInOrder(spec.command, actual);
      checks.push({
        ok: !missing,
        label: "`-- " + spec.command.join(" ") + "` 인자",
        got: missing ? (actual.length ? "`" + missing + "` 가 없습니다" : "`--` 뒤 인자가 없습니다") : ""
      });
    }

    if (spec.redirect) {
      const ok = parsed.redirect && parsed.redirect.replace(/^["']|["']$/g, "") === spec.redirect;
      checks.push({ ok: Boolean(ok), label: "결과를 `" + spec.redirect + "` 로 저장", got: parsed.redirect ? "지금 `" + parsed.redirect + "`" : "리다이렉션이 없습니다" });
    }

    const known = new Set(Object.keys(spec.flags || {}).concat(spec.optional || []));
    const extras = Object.keys(parsed.flags).filter((name) => !known.has(name));
    if (extras.length) notes.push("추가로 준 옵션: " + extras.map((n) => "`--" + n + "`").join(", "));
    if (parsed.piped) notes.push("파이프 뒤(`" + parsed.piped + "`)는 채점하지 않습니다.");

    const passed = checks.filter((c) => c.ok).length;
    return {
      pass: checks.length > 0 && passed === checks.length,
      score: checks.length ? passed / checks.length : 0,
      checks, notes, parsed
    };
  }

  function gradeCommand(input, spec) {
    if (!String(input || "").trim()) {
      return { pass: false, score: 0, checks: [{ ok: false, label: "명령을 입력하세요", got: "" }], notes: [] };
    }
    const specs = Array.isArray(spec) ? spec : [spec || {}];
    let best = null;
    specs.forEach((one, index) => {
      const result = gradeOne(input, one);
      result.variant = index;
      if (!best || result.score > best.score) best = result;
    });
    if (specs.length > 1 && best) best.notes = best.notes.concat("정답 형태가 여러 개인 과제입니다. 가장 가까운 쪽으로 채점했습니다.");
    return best;
  }

  // ---- 매니페스트 ---------------------------------------------------------

  // "spec.containers[0].image", "spec.containers[name=app].image" 를 따라간다.
  function getPath(root, path) {
    const parts = String(path).match(/[^.[\]]+|\[[^\]]*\]/g) || [];
    let node = root;
    for (let raw of parts) {
      if (node === undefined || node === null) return undefined;
      if (raw.startsWith("[")) {
        const inner = raw.slice(1, -1);
        if (/^-?\d+$/.test(inner)) { node = Array.isArray(node) ? node[Number(inner)] : undefined; continue; }
        const eq = inner.indexOf("=");
        if (eq < 0 || !Array.isArray(node)) return undefined;
        const key = inner.slice(0, eq), value = inner.slice(eq + 1);
        node = node.find((item) => item && String(item[key]) === value);
        continue;
      }
      node = node[raw];
    }
    return node;
  }

  function checkValue(value, check) {
    if (check.absent) return value === undefined || value === null;
    if (value === undefined || value === null) return false;
    if (check.exists) return true;
    if (check.oneOf) return check.oneOf.some((v) => String(v) === String(value));
    if (check.matches) return new RegExp(check.matches).test(String(value));
    if (check.contains !== undefined) {
      if (Array.isArray(value)) return value.some((v) => String(v) === String(check.contains));
      return String(value).includes(String(check.contains));
    }
    if (check.equals !== undefined) return String(value) === String(check.equals);
    return true;
  }

  function describeValue(value) {
    if (value === undefined) return "값이 없습니다";
    if (value === null) return "null";
    if (typeof value === "object") return "현재 `" + JSON.stringify(value).slice(0, 60) + "`";
    return "현재 `" + String(value) + "`";
  }

  function gradeManifest(text, checks, yaml) {
    const list = Array.isArray(checks) ? checks : [];
    const loader = yaml || (typeof jsyaml !== "undefined" ? jsyaml : null);
    const fail = (message) => ({
      pass: false, score: 0, error: message,
      checks: list.map((c) => ({ ok: false, label: c.label || c.path, got: "" })), notes: []
    });
    if (!loader) return fail("YAML 파서를 불러오지 못했습니다.");
    if (!String(text || "").trim()) return fail("매니페스트가 비어 있습니다.");

    let docs;
    try {
      docs = loader.loadAll(text).filter((doc) => doc && typeof doc === "object");
    } catch (error) {
      return fail("YAML 문법 오류 — " + (error.reason || error.message));
    }
    if (!docs.length) return fail("문서를 읽지 못했습니다. 들여쓰기를 확인하세요.");

    const results = list.map((check) => {
      const doc = check.kind
        ? docs.find((d) => String(d.kind || "").toLowerCase() === String(check.kind).toLowerCase())
        : docs[typeof check.doc === "number" ? check.doc : 0];
      if (!doc) return { ok: false, label: check.label || check.path, got: "`kind: " + check.kind + "` 문서가 없습니다" };
      const value = getPath(doc, check.path);
      const ok = checkValue(value, check);
      return { ok, label: check.label || check.path, got: ok ? "" : describeValue(value), path: check.path };
    });

    const passed = results.filter((r) => r.ok).length;
    return {
      pass: results.length > 0 && passed === results.length,
      score: results.length ? passed / results.length : 0,
      checks: results,
      notes: docs.length > 1 ? ["문서 " + docs.length + "개를 읽었습니다."] : [],
      docs
    };
  }

  return { tokenize, parseCommand, gradeCommand, gradeManifest, getPath, canonicalResource };
});
