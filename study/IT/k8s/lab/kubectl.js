// 가짜 클러스터 위에서 도는 kubectl
// ---------------------------------------------------------------------------
// 시험에서 실제로 치는 범위만 구현한다. 지원하지 않는 것은 조용히 무시하지 말고
// "이 실습 환경에서는 …" 이라고 분명히 말해 준다 — 모르고 지나가는 게 제일 나쁘다.
// ---------------------------------------------------------------------------
(function (root, factory) {
  const api = factory(typeof require === "function" ? require("./cluster.js") : root.K8sLab);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.K8sLab = Object.assign(root.K8sLab || {}, api);
})(typeof self !== "undefined" ? self : this, function (core) {
  "use strict";

  const { RESOURCES, resolveKind, clone } = core;
  const pad = (text, width) => String(text) + " ".repeat(Math.max(1, width - String(text).length));

  // 내부용 필드를 떼어낸 깨끗한 오브젝트
  function clean(obj) {
    const out = clone(obj);
    Object.keys(out).forEach((k) => { if (k.startsWith("_")) delete out[k]; });
    if (out.metadata) {
      out.metadata.creationTimestamp = new Date(out.metadata.creationTimestamp || Date.now()).toISOString();
    }
    return out;
  }

  const COLUMNS = {
    pods: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["READY", (o) => `${o.status.ready ? 1 : 0}/1`],
      ["STATUS", (o) => o.status.reason || (o.status.phase === "Succeeded" ? "Completed" : o.status.phase)],
      ["RESTARTS", (o) => String(o.status.restartCount || 0)],
      ["AGE", (o) => c.age(o)],
      ["IP", (o) => o.status.podIP || "<none>", true],
      ["NODE", (o) => o.spec.nodeName || "<none>", true]
    ],
    deployments: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["READY", (o) => `${o.status.readyReplicas || 0}/${o.spec.replicas}`],
      ["UP-TO-DATE", (o) => String(o.status.updatedReplicas || 0)],
      ["AVAILABLE", (o) => String(o.status.readyReplicas || 0)],
      ["AGE", (o) => c.age(o)]
    ],
    replicasets: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["DESIRED", (o) => String(o.spec.replicas)],
      ["CURRENT", (o) => String((o.status && o.status.replicas) || 0)],
      ["READY", (o) => String((o.status && o.status.readyReplicas) || 0)],
      ["AGE", (o) => c.age(o)]
    ],
    services: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["TYPE", (o) => o.spec.type],
      ["CLUSTER-IP", (o) => o.spec.clusterIP || "None"],
      ["EXTERNAL-IP", (o) => o.spec.externalName || "<none>"],
      ["PORT(S)", (o) => (o.spec.ports || []).map((p) => `${p.port}${p.nodePort ? ":" + p.nodePort : ""}/${p.protocol}`).join(",") || "<none>"],
      ["AGE", (o) => c.age(o)]
    ],
    nodes: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["STATUS", (o) => (o.status.conditions || []).some((x) => x.type === "Ready" && x.status === "True") ? "Ready" : "NotReady"],
      ["ROLES", (o) => o._role || "<none>"],
      ["AGE", (o) => c.age(o)],
      ["VERSION", (o) => (o.status.nodeInfo || {}).kubeletVersion || "v1.32.1"]
    ],
    namespaces: (c) => [["NAME", (o) => o.metadata.name], ["STATUS", () => "Active"], ["AGE", (o) => c.age(o)]],
    configmaps: (c) => [["NAME", (o) => o.metadata.name], ["DATA", (o) => String(Object.keys(o.data || {}).length)], ["AGE", (o) => c.age(o)]],
    secrets: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["TYPE", (o) => o.type || "Opaque"],
      ["DATA", (o) => String(Object.keys(o.data || o.stringData || {}).length)],
      ["AGE", (o) => c.age(o)]
    ],
    serviceaccounts: (c) => [["NAME", (o) => o.metadata.name], ["SECRETS", () => "0"], ["AGE", (o) => c.age(o)]],
    persistentvolumes: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["CAPACITY", (o) => (o.spec.capacity || {}).storage || ""],
      ["ACCESS MODES", (o) => (o.spec.accessModes || []).map((m) => m.replace("ReadWriteOnce", "RWO").replace("ReadOnlyMany", "ROX").replace("ReadWriteMany", "RWX").replace("ReadWriteOncePod", "RWOP")).join(",")],
      ["RECLAIM POLICY", (o) => o.spec.persistentVolumeReclaimPolicy || "Retain"],
      ["STATUS", (o) => o.status.phase],
      ["CLAIM", (o) => o.spec.claimRef ? `${o.spec.claimRef.namespace}/${o.spec.claimRef.name}` : ""],
      ["STORAGECLASS", (o) => o.spec.storageClassName || ""],
      ["AGE", (o) => c.age(o)]
    ],
    persistentvolumeclaims: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["STATUS", (o) => o.status.phase],
      ["VOLUME", (o) => o.spec.volumeName || ""],
      ["CAPACITY", (o) => (o.status.capacity || {}).storage || ""],
      ["ACCESS MODES", (o) => (o.spec.accessModes || []).map((m) => m.replace("ReadWriteOnce", "RWO")).join(",")],
      ["STORAGECLASS", (o) => o.spec.storageClassName || ""],
      ["AGE", (o) => c.age(o)]
    ],
    storageclasses: (c) => [
      ["NAME", (o) => o.metadata.name + (((o.metadata.annotations || {})["storageclass.kubernetes.io/is-default-class"] === "true") ? " (default)" : "")],
      ["PROVISIONER", (o) => o.provisioner || ""],
      ["RECLAIMPOLICY", (o) => o.reclaimPolicy || "Delete"],
      ["VOLUMEBINDINGMODE", (o) => o.volumeBindingMode || "Immediate"],
      ["AGE", (o) => c.age(o)]
    ],
    endpoints: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["ENDPOINTS", (o) => {
        const list = [];
        (o.subsets || []).forEach((s) => (s.addresses || []).forEach((a) => list.push(`${a.ip}:${(s.ports || [{}])[0].port}`)));
        return list.length ? list.join(",") : "<none>";
      }],
      ["AGE", (o) => c.age(o)]
    ],
    jobs: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["COMPLETIONS", (o) => `${(o.status && o.status.succeeded) || 0}/${o.spec.completions || 1}`],
      ["AGE", (o) => c.age(o)]
    ],
    cronjobs: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["SCHEDULE", (o) => o.spec.schedule],
      ["SUSPEND", (o) => String(Boolean(o.spec.suspend))],
      ["ACTIVE", () => "0"],
      ["AGE", (o) => c.age(o)]
    ],
    daemonsets: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["DESIRED", (o) => String(c.list("nodes", "-").filter((n) => c.nodeFits(n, o.spec.template || {})).length)],
      ["CURRENT", (o) => String(c.list("pods", o.metadata.namespace).filter((p) => (p.metadata.ownerReferences || []).some((x) => x.kind === "DaemonSet" && x.name === o.metadata.name)).length)],
      ["READY", (o) => String(c.list("pods", o.metadata.namespace).filter((p) => p.status.ready && (p.metadata.ownerReferences || []).some((x) => x.kind === "DaemonSet" && x.name === o.metadata.name)).length)],
      ["AGE", (o) => c.age(o)]
    ],
    statefulsets: (c) => [["NAME", (o) => o.metadata.name], ["READY", (o) => `0/${o.spec.replicas}`], ["AGE", (o) => c.age(o)]],
    ingresses: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["CLASS", (o) => o.spec.ingressClassName || "<none>"],
      ["HOSTS", (o) => (o.spec.rules || []).map((r) => r.host || "*").join(",") || "*"],
      ["ADDRESS", () => ""],
      ["PORTS", () => "80"],
      ["AGE", (o) => c.age(o)]
    ],
    networkpolicies: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["POD-SELECTOR", (o) => {
        const m = (o.spec.podSelector || {}).matchLabels || {};
        return Object.keys(m).length ? Object.entries(m).map(([k, v]) => `${k}=${v}`).join(",") : "<none>";
      }],
      ["AGE", (o) => c.age(o)]
    ],
    roles: (c) => [["NAME", (o) => o.metadata.name], ["CREATED AT", (o) => new Date(o.metadata.creationTimestamp).toISOString()]],
    rolebindings: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["ROLE", (o) => `${(o.roleRef || {}).kind}/${(o.roleRef || {}).name}`],
      ["AGE", (o) => c.age(o)]
    ],
    clusterrolebindings: (c) => [
      ["NAME", (o) => o.metadata.name],
      ["ROLE", (o) => `${(o.roleRef || {}).kind}/${(o.roleRef || {}).name}`],
      ["AGE", (o) => c.age(o)]
    ]
  };

  function defaultColumns(c) {
    return [["NAME", (o) => o.metadata.name], ["AGE", (o) => c.age(o)]];
  }

  // ---- JSONPath (시험에서 쓰는 범위만) ------------------------------------
  function pick(node, path) {
    const parts = String(path).replace(/^\./, "").match(/[^.[\]]+|\[[^\]]*\]/g) || [];
    let cur = node;
    for (const raw of parts) {
      if (cur === undefined || cur === null) return undefined;
      if (raw === "[*]" || raw === "*") return cur;
      if (raw.startsWith("[")) {
        const inner = raw.slice(1, -1);
        cur = Array.isArray(cur) ? cur[Number(inner)] : undefined;
        continue;
      }
      cur = cur[raw];
    }
    return cur;
  }

  function jsonpath(expr, root) {
    const literal = (text) => text.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
    const rangeMatch = /\{range\s+([^}]+)\}([\s\S]*)\{end\}/.exec(expr);
    if (rangeMatch) {
      const items = pick(root, rangeMatch[1].trim().replace(/\[\*\]$/, "")) || [];
      return (Array.isArray(items) ? items : [items]).map((item) =>
        rangeMatch[2].replace(/\{([^}]*)\}/g, (_, inner) => {
          if (/^["'].*["']$/.test(inner.trim())) return literal(inner.trim().slice(1, -1));
          const v = pick(item, inner.trim());
          return v === undefined ? "" : (typeof v === "object" ? JSON.stringify(v) : String(v));
        })).join("");
    }
    return expr.replace(/\{([^}]*)\}/g, (_, inner) => {
      const text = inner.trim();
      if (/^["'].*["']$/.test(text)) return literal(text.slice(1, -1));
      const starAt = text.indexOf("[*]");
      if (starAt >= 0) {
        const head = text.slice(0, starAt);
        const tail = text.slice(starAt + 3);
        const arr = pick(root, head.replace(/^\./, "")) || [];
        return (Array.isArray(arr) ? arr : [arr]).map((item) => {
          const v = tail ? pick(item, tail) : item;
          return v === undefined ? "" : (typeof v === "object" ? JSON.stringify(v) : String(v));
        }).join(" ");
      }
      const v = pick(root, text);
      return v === undefined ? "" : (typeof v === "object" ? JSON.stringify(v) : String(v));
    });
  }

  // ---- kubectl ------------------------------------------------------------
  class Kubectl {
    constructor(cluster, io) {
      this.c = cluster;
      this.io = io || {};          // { yaml, readFile, writeFile, openEditor }
    }

    fail(message) { const e = new Error(message); e.expected = true; throw e; }

    ns(flags) {
      if (flags["all-namespaces"]) return "*";
      return flags.namespace || this.c.namespace;
    }

    kindOf(word) {
      const plural = resolveKind(word);
      if (!plural) this.fail(`error: the server doesn't have a resource type "${word}"`);
      return plural;
    }

    run(parsed) {
      const argv = parsed.argv.slice(1);     // kubectl 제거
      const verb = (argv[0] || "").toLowerCase();
      const rest = argv.slice(1);
      const f = parsed.flags;
      const handler = {
        get: () => this.cmdGet(rest, f),
        describe: () => this.cmdDescribe(rest, f),
        create: () => this.cmdCreate(rest, f, parsed),
        apply: () => this.cmdApply(rest, f),
        run: () => this.cmdRun(rest, f, parsed),
        expose: () => this.cmdExpose(rest, f),
        delete: () => this.cmdDelete(rest, f),
        scale: () => this.cmdScale(rest, f),
        set: () => this.cmdSet(rest, f),
        label: () => this.cmdLabelAnnotate(rest, f, "labels"),
        annotate: () => this.cmdLabelAnnotate(rest, f, "annotations"),
        taint: () => this.cmdTaint(rest, f),
        logs: () => this.cmdLogs(rest, f),
        exec: () => this.cmdExec(rest, f, parsed),
        rollout: () => this.cmdRollout(rest, f),
        edit: () => this.cmdEdit(rest, f),
        patch: () => this.cmdPatch(rest, f),
        config: () => this.cmdConfig(rest, f),
        top: () => this.cmdTop(rest, f),
        explain: () => this.cmdExplain(rest, f),
        auth: () => this.cmdAuth(rest, f),
        drain: () => this.cmdDrain(rest, f, "drain"),
        cordon: () => this.cmdDrain(rest, f, "cordon"),
        uncordon: () => this.cmdDrain(rest, f, "uncordon"),
        autoscale: () => this.cmdAutoscale(rest, f),
        "api-resources": () => this.cmdApiResources(),
        "cluster-info": () => "Kubernetes control plane is running at https://127.0.0.1:6443\nCoreDNS is running at https://127.0.0.1:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy",
        version: () => "Client Version: v1.32.1\nServer Version: v1.32.1",
        "port-forward": () => "Forwarding from 127.0.0.1:8080 -> 80\n(실습 환경에서는 실제 연결은 일어나지 않습니다. Ctrl+C 로 끊은 셈 칩니다.)"
      }[verb];
      if (!handler) this.fail(`error: unknown command "${verb}" for "kubectl"\n이 실습 환경이 아는 명령: ${Object.keys({ get: 1, describe: 1, create: 1, apply: 1, run: 1, expose: 1, delete: 1, scale: 1, set: 1, label: 1, annotate: 1, taint: 1, logs: 1, exec: 1, rollout: 1, edit: 1, patch: 1, config: 1, top: 1, explain: 1, auth: 1, drain: 1, autoscale: 1 }).join(", ")}`);
      return handler();
    }

    // ---- 출력 ----
    toYaml(obj) {
      if (!this.io.yaml) return JSON.stringify(obj, null, 2);
      return this.io.yaml.dump(obj, { lineWidth: 120, noRefs: true });
    }

    output(objects, f, plural, single) {
      const o = f.output;
      if (o === "yaml" || o === "json") {
        const docs = objects.map(clean);
        const payload = single ? docs[0] : { apiVersion: "v1", kind: "List", items: docs };
        return o === "yaml" ? this.toYaml(payload).trimEnd() : JSON.stringify(payload, null, 2);
      }
      if (o === "name") {
        const meta = RESOURCES[plural];
        return objects.map((x) => `${meta.kind.toLowerCase()}.${x.apiVersion.includes("/") ? x.apiVersion.split("/")[0] : ""}/${x.metadata.name}`.replace("./", "/")).join("\n");
      }
      if (typeof o === "string" && o.startsWith("jsonpath")) {
        const expr = o.replace(/^jsonpath=?/, "").replace(/^["']|["']$/g, "");
        const root = single ? clean(objects[0]) : { items: objects.map(clean) };
        return jsonpath(expr, root);
      }
      if (typeof o === "string" && o.startsWith("custom-columns")) {
        const spec = o.replace(/^custom-columns=?/, "").replace(/^["']|["']$/g, "");
        const cols = spec.split(",").map((part) => part.split(":"));
        const rows = objects.map((x) => cols.map(([, path]) => {
          const v = jsonpath(`{${path}}`, clean(x));
          return v === "" ? "<none>" : v;
        }));
        return this.table(cols.map(([h]) => h.toUpperCase()), rows);
      }
      const wide = o === "wide";
      const maker = COLUMNS[plural] || defaultColumns;
      let cols = maker(this.c).filter((col) => wide || !col[2]);
      if (f["show-labels"]) {
        cols = cols.concat([["LABELS", (x) => Object.entries(x.metadata.labels || {}).map(([k, v]) => `${k}=${v}`).join(",") || "<none>"]]);
      }
      const showNs = f["all-namespaces"];
      const headers = (showNs ? ["NAMESPACE"] : []).concat(cols.map((x) => x[0]));
      const rows = objects.map((x) => (showNs ? [x.metadata.namespace] : []).concat(cols.map(([, fn]) => fn(x))));
      return this.table(headers, rows, f["no-headers"]);
    }

    table(headers, rows, noHeaders) {
      const widths = headers.map((h, i) => Math.max(String(h).length, ...rows.map((r) => String(r[i] === undefined ? "" : r[i]).length)) + 3);
      const lines = [];
      if (!noHeaders) lines.push(headers.map((h, i) => pad(h, widths[i])).join("").trimEnd());
      rows.forEach((r) => lines.push(r.map((cell, i) => pad(cell === undefined ? "" : cell, widths[i])).join("").trimEnd()));
      return lines.join("\n");
    }

    selectorMatch(obj, selector) {
      if (!selector) return true;
      return String(selector).split(",").every((part) => {
        const [k, v] = part.split("=");
        return String((obj.metadata.labels || {})[k.trim()]) === String((v || "").trim());
      });
    }

    // ---- 동사 ----
    cmdGet(rest, f) {
      if (!rest.length) this.fail("error: You must specify the type of resource to get.");
      const plural = this.kindOf(rest[0]);
      const names = rest.slice(1);
      const ns = this.ns(f);
      let objects = names.length
        ? names.map((n) => {
            const found = this.c.get(plural, ns === "*" ? "default" : ns, n);
            if (!found) this.fail(`Error from server (NotFound): ${RESOURCES[plural].kind.toLowerCase()}s "${n}" not found`);
            return found;
          })
        : this.c.list(plural, ns).filter((x) => this.selectorMatch(x, f.selector));
      if (f["field-selector"]) {
        objects = objects.filter((x) => String(f["field-selector"]).split(",").every((part) => {
          const [path, value] = part.split("=");
          return String(pick(x, path.trim())) === String(value.trim());
        }));
      }
      if (f["sort-by"]) {
        const path = String(f["sort-by"]).replace(/^\./, "");
        objects = objects.slice().sort((a, b) => {
          const va = pick(a, path), vb = pick(b, path);
          return String(va === undefined ? "" : va).localeCompare(String(vb === undefined ? "" : vb), undefined, { numeric: true });
        });
      }
      if (!objects.length) {
        return ns === "*" ? "No resources found" : `No resources found in ${ns} namespace.`;
      }
      return this.output(objects, f, plural, names.length === 1);
    }

    cmdDescribe(rest, f) {
      if (rest.length < 2) this.fail("error: 리소스 종류와 이름을 모두 주세요.");
      const plural = this.kindOf(rest[0]);
      const ns = this.ns(f) === "*" ? "default" : this.ns(f);
      const obj = this.c.get(plural, ns, rest[1]);
      if (!obj) this.fail(`Error from server (NotFound): ${RESOURCES[plural].kind.toLowerCase()}s "${rest[1]}" not found`);
      const lines = [
        `Name:         ${obj.metadata.name}`,
        RESOURCES[plural].ns ? `Namespace:    ${obj.metadata.namespace}` : null,
        `Labels:       ${Object.entries(obj.metadata.labels || {}).map(([k, v]) => `${k}=${v}`).join("\n              ") || "<none>"}`,
        `Annotations:  ${Object.entries(obj.metadata.annotations || {}).filter(([k]) => k !== "lab/fault").map(([k, v]) => `${k}: ${v}`).join("\n              ") || "<none>"}`
      ].filter(Boolean);
      if (obj.kind === "Pod") {
        lines.push(`Node:         ${obj.spec.nodeName || "<none>"}`);
        lines.push(`Status:       ${obj.status.reason || obj.status.phase}`);
        lines.push(`IP:           ${obj.status.podIP || "<none>"}`);
        lines.push("Containers:");
        (obj.spec.containers || []).forEach((ct) => {
          lines.push(`  ${ct.name}:`);
          lines.push(`    Image:        ${ct.image}`);
          if (ct.ports) lines.push(`    Port:         ${ct.ports.map((p) => p.containerPort).join(", ")}`);
          if (ct.command) lines.push(`    Command:      ${ct.command.join(" ")}`);
          lines.push(`    Restart Count: ${obj.status.restartCount || 0}`);
          if (ct.resources) lines.push(`    Requests/Limits: ${JSON.stringify(ct.resources)}`);
        });
        if (obj.spec.tolerations) lines.push(`Tolerations:  ${obj.spec.tolerations.map((t) => `${t.key}=${t.value}:${t.effect}`).join(", ")}`);
        if (obj.spec.nodeSelector) lines.push(`Node-Selectors: ${Object.entries(obj.spec.nodeSelector).map(([k, v]) => `${k}=${v}`).join(",")}`);
      }
      if (obj.kind === "Service") {
        lines.push(`Type:         ${obj.spec.type}`);
        lines.push(`IP:           ${obj.spec.clusterIP || "None"}`);
        lines.push(`Selector:     ${Object.entries(obj.spec.selector || {}).map(([k, v]) => `${k}=${v}`).join(",") || "<none>"}`);
        (obj.spec.ports || []).forEach((p) => lines.push(`Port:         ${p.port}/${p.protocol}  TargetPort: ${p.targetPort}${p.nodePort ? `  NodePort: ${p.nodePort}` : ""}`));
        const ep = this.c.get("endpoints", ns, obj.metadata.name);
        const eps = [];
        ((ep && ep.subsets) || []).forEach((s) => (s.addresses || []).forEach((a) => eps.push(`${a.ip}:${(s.ports || [{}])[0].port}`)));
        lines.push(`Endpoints:    ${eps.join(",") || "<none>"}`);
      }
      if (obj.kind === "Deployment") {
        lines.push(`Replicas:     ${obj.spec.replicas} desired | ${obj.status.updatedReplicas || 0} updated | ${obj.status.readyReplicas || 0} available`);
        lines.push(`Selector:     ${Object.entries((obj.spec.selector || {}).matchLabels || {}).map(([k, v]) => `${k}=${v}`).join(",")}`);
        lines.push(`Image:        ${((obj.spec.template || {}).spec || {}).containers ? obj.spec.template.spec.containers.map((c) => c.image).join(", ") : ""}`);
      }
      if (obj.kind === "Node") {
        lines.push(`Taints:       ${((obj.spec || {}).taints || []).map((t) => `${t.key}=${t.value || ""}:${t.effect}`).join("\n              ") || "<none>"}`);
        lines.push(`Unschedulable: ${Boolean((obj.spec || {}).unschedulable)}`);
      }
      if (obj.kind === "PersistentVolumeClaim") {
        lines.push(`Status:       ${obj.status.phase}`);
        lines.push(`Volume:       ${obj.spec.volumeName || ""}`);
        lines.push(`StorageClass: ${obj.spec.storageClassName || ""}`);
      }
      lines.push("Events:");
      const fault = (obj.metadata.annotations || {})["lab/fault"];
      if (obj.kind === "Pod" && obj.status.reason === "Unschedulable") {
        lines.push("  Type     Reason            Message");
        lines.push("  ----     ------            -------");
        lines.push("  Warning  FailedScheduling  0/3 nodes are available: 1 node(s) had untolerated taint, 2 node(s) didn't match Pod's node affinity/selector.");
      } else if (fault === "ImagePullBackOff") {
        lines.push("  Type     Reason   Message");
        lines.push("  ----     ------   -------");
        lines.push(`  Warning  Failed   Failed to pull image "${(obj.spec.containers || [{}])[0].image}": not found`);
      } else if (fault === "CrashLoopBackOff") {
        lines.push("  Type     Reason     Message");
        lines.push("  ----     ------     -------");
        lines.push("  Warning  BackOff    Back-off restarting failed container");
      } else {
        lines.push("  <none>");
      }
      return lines.join("\n");
    }

    applyDryRun(obj, f, verbText) {
      if (f["dry-run"] === "client" || f["dry-run"] === "server" || f["dry-run"] === true) {
        if (f.output === "yaml") return this.toYaml(clean(this.withDefaults(obj))).trimEnd();
        if (f.output === "json") return JSON.stringify(clean(this.withDefaults(obj)), null, 2);
        return `${verbText} (dry run)`;
      }
      return null;
    }

    withDefaults(obj) {
      const copy = clone(obj);
      copy.metadata = copy.metadata || {};
      copy.metadata.creationTimestamp = copy.metadata.creationTimestamp || null;
      return copy;
    }

    created(obj, f) {
      const dry = this.applyDryRun(obj, f, `${RESOURCES[resolveKind(obj.kind)].kind.toLowerCase()}/${obj.metadata.name} created`);
      if (dry !== null) return dry;
      const made = this.c.add(obj, { namespace: this.ns(f) === "*" ? "default" : this.ns(f) });
      this.c.tick();
      return `${RESOURCES[made._plural].kind.toLowerCase()}/${made.metadata.name} created`;
    }

    cmdCreate(rest, f, parsed) {
      if (f.filename) return this.cmdApply(rest, f, "created");
      const sub = (rest[0] || "").toLowerCase();
      const name = rest[1];
      const ns = this.ns(f) === "*" ? "default" : this.ns(f);
      const base = (kind, api, extra) => Object.assign({ apiVersion: api, kind, metadata: { name, namespace: RESOURCES[resolveKind(kind)].ns ? ns : undefined } }, extra);
      const list = (v) => (v === undefined ? [] : [].concat(v).join(",").split(",").map((x) => x.trim()).filter(Boolean));

      if (sub === "namespace" || sub === "ns") return this.created({ apiVersion: "v1", kind: "Namespace", metadata: { name } }, f);
      if (sub === "deployment" || sub === "deploy") {
        if (!f.image) this.fail("error: --image is required");
        const labels = { app: name };
        return this.created(base("Deployment", "apps/v1", {
          spec: {
            replicas: Number(f.replicas || 1),
            selector: { matchLabels: labels },
            template: { metadata: { labels }, spec: { containers: [{ name, image: f.image }] } }
          }
        }), f);
      }
      if (sub === "configmap" || sub === "cm") {
        const data = {};
        list(f["from-literal"]).forEach((pair) => { const i = pair.indexOf("="); data[pair.slice(0, i)] = pair.slice(i + 1); });
        list(f["from-file"]).forEach((entry) => {
          const [k, path] = entry.includes("=") ? entry.split("=") : [entry.split("/").pop(), entry];
          data[k] = (this.io.readFile && this.io.readFile(path)) || "";
        });
        return this.created(base("ConfigMap", "v1", { data }), f);
      }
      if (sub === "secret") {
        const type = (rest[1] || "").toLowerCase();
        const secretName = rest[2];
        const data = {};
        if (type === "generic") {
          list(f["from-literal"]).forEach((pair) => { const i = pair.indexOf("="); data[pair.slice(0, i)] = btoaSafe(pair.slice(i + 1)); });
        } else if (type === "tls") {
          data["tls.crt"] = btoaSafe((this.io.readFile && this.io.readFile(f.cert)) || "cert");
          data["tls.key"] = btoaSafe((this.io.readFile && this.io.readFile(f.key)) || "key");
        }
        return this.created({
          apiVersion: "v1", kind: "Secret", metadata: { name: secretName, namespace: ns },
          type: type === "tls" ? "kubernetes.io/tls" : type === "docker-registry" ? "kubernetes.io/dockerconfigjson" : "Opaque",
          data
        }, f);
      }
      if (sub === "serviceaccount" || sub === "sa") return this.created(base("ServiceAccount", "v1", {}), f);
      if (sub === "role") {
        return this.created(base("Role", "rbac.authorization.k8s.io/v1", {
          rules: [{ apiGroups: [""], resources: list(f.resource), verbs: list(f.verb) }]
        }), f);
      }
      if (sub === "rolebinding" || sub === "clusterrolebinding") {
        const kind = sub === "rolebinding" ? "RoleBinding" : "ClusterRoleBinding";
        const subjects = list(f.serviceaccount).map((sa) => {
          const [sans, saname] = sa.split(":");
          return { kind: "ServiceAccount", name: saname, namespace: sans };
        }).concat(list(f.user).map((u) => ({ kind: "User", name: u })));
        return this.created(Object.assign({
          apiVersion: "rbac.authorization.k8s.io/v1", kind,
          metadata: { name, namespace: kind === "RoleBinding" ? ns : undefined },
          roleRef: { apiGroup: "rbac.authorization.k8s.io", kind: f.role ? "Role" : "ClusterRole", name: f.role || f.clusterrole },
          subjects
        }), f);
      }
      if (sub === "job") {
        if (!f.image) this.fail("error: --image is required");
        return this.created(base("Job", "batch/v1", {
          spec: { template: { spec: { containers: [{ name, image: f.image, command: parsed.command || undefined }], restartPolicy: "Never" } } }
        }), f);
      }
      if (sub === "cronjob" || sub === "cj") {
        if (!f.schedule) this.fail("error: --schedule is required");
        return this.created(base("CronJob", "batch/v1", {
          spec: {
            schedule: f.schedule,
            jobTemplate: { spec: { template: { spec: { containers: [{ name, image: f.image, command: parsed.command || undefined }], restartPolicy: "OnFailure" } } } }
          }
        }), f);
      }
      if (sub === "quota" || sub === "resourcequota") {
        const hard = {};
        list(f.hard).forEach((pair) => { const [k, v] = pair.split("="); hard[k] = v; });
        return this.created(base("ResourceQuota", "v1", { spec: { hard } }), f);
      }
      if (sub === "ingress" || sub === "ing") {
        const rules = list(f.rule).map((rule) => {
          const [left, right] = rule.split("=");
          const [host, ...pathParts] = left.split("/");
          const path = "/" + pathParts.join("/");
          const [svc, port] = (right || "").split(":");
          return {
            host: host || undefined,
            http: { paths: [{ path: path.replace(/\*$/, ""), pathType: path.endsWith("*") ? "Prefix" : "Exact", backend: { service: { name: svc, port: { number: Number(port) || 80 } } } }] }
          };
        });
        return this.created(base("Ingress", "networking.k8s.io/v1", { spec: { ingressClassName: f.class, rules } }), f);
      }
      if (sub === "service" || sub === "svc") {
        const type = (rest[1] || "clusterip").toLowerCase();
        const svcName = rest[2];
        const ports = list(f.tcp).map((pair) => {
          const [port, target] = pair.split(":");
          return { port: Number(port), targetPort: Number(target || port), protocol: "TCP" };
        });
        return this.created({
          apiVersion: "v1", kind: "Service", metadata: { name: svcName, namespace: ns },
          spec: { type: type === "nodeport" ? "NodePort" : type === "clusterip" ? "ClusterIP" : "LoadBalancer", selector: { app: svcName }, ports }
        }, f);
      }
      this.fail(`이 실습 환경에서는 'kubectl create ${sub}' 를 지원하지 않습니다. 매니페스트를 써서 apply 하세요.`);
    }

    cmdApply(rest, f, verbWord) {
      const path = f.filename;
      if (!path) this.fail("error: must specify -f");
      const text = this.io.readFile && this.io.readFile(path);
      if (text === null || text === undefined) this.fail(`error: the path "${path}" does not exist`);
      let docs;
      try {
        docs = this.io.yaml.loadAll(text).filter((d) => d && typeof d === "object");
      } catch (e) {
        this.fail(`error: error parsing ${path}: ${e.reason || e.message}`);
      }
      if (!docs.length) this.fail(`error: no objects passed to apply`);
      const out = [];
      docs.forEach((doc) => {
        const plural = resolveKind(doc.kind);
        if (!plural) this.fail(`error: unable to recognize "${path}": no matches for kind "${doc.kind}"`);
        if (!doc.metadata || !doc.metadata.name) this.fail(`error: ${doc.kind} 에 metadata.name 이 없습니다`);
        const ns = RESOURCES[plural].ns ? (doc.metadata.namespace || (this.ns(f) === "*" ? "default" : this.ns(f))) : undefined;
        const dry = this.applyDryRun(doc, f, "");
        if (dry !== null) { out.push(dry || `${doc.kind.toLowerCase()}/${doc.metadata.name} created (dry run)`); return; }
        const existing = this.c.get(plural, ns, doc.metadata.name);
        if (existing && verbWord === "created") this.fail(`Error from server (AlreadyExists): ${doc.kind.toLowerCase()}s "${doc.metadata.name}" already exists`);
        if (existing) {
          const merged = Object.assign({}, existing, doc, { _plural: plural });
          merged.metadata = Object.assign({}, existing.metadata, doc.metadata);
          this.c.put(merged);
          out.push(`${doc.kind.toLowerCase()}/${doc.metadata.name} configured`);
        } else {
          const made = this.c.add(Object.assign({}, doc, { metadata: Object.assign({}, doc.metadata, { namespace: ns }) }));
          out.push(`${doc.kind.toLowerCase()}/${made.metadata.name} created`);
        }
      });
      this.c.tick();
      return out.join("\n");
    }

    cmdRun(rest, f, parsed) {
      const name = rest[0];
      if (!name) this.fail("error: NAME is required");
      if (!f.image) this.fail('error: --image is required');
      const labels = f.labels
        ? Object.fromEntries(String(f.labels).split(",").map((p) => p.split("=")))
        : { run: name };
      const container = { name, image: f.image };
      if (f.port) container.ports = [{ containerPort: Number(f.port) }];
      if (parsed.command && parsed.command.length) container.command = parsed.command;
      if (f.env) container.env = [].concat(f.env).map((e) => { const [k, v] = String(e).split("="); return { name: k, value: v }; });
      const pod = {
        apiVersion: "v1", kind: "Pod",
        metadata: { name, namespace: this.ns(f) === "*" ? "default" : this.ns(f), labels },
        spec: { containers: [container], restartPolicy: f.restart || "Always" }
      };
      const dry = this.applyDryRun(pod, f, `pod/${name} created`);
      if (dry !== null) return dry;
      this.c.add(pod);
      this.c.tick();
      return f.rm ? `pod/${name} created\n(--rm 은 명령이 끝나면 지워집니다. 실습 환경에서는 남겨 두니 직접 삭제하세요.)` : `pod/${name} created`;
    }

    cmdExpose(rest, f) {
      const plural = this.kindOf(rest[0]);
      const ns = this.ns(f) === "*" ? "default" : this.ns(f);
      const target = this.c.get(plural, ns, rest[1]);
      if (!target) this.fail(`Error from server (NotFound): ${rest[0]} "${rest[1]}" not found`);
      const selector = plural === "deployments"
        ? ((target.spec.selector || {}).matchLabels || {})
        : (target.metadata.labels || {});
      if (!f.port) this.fail("error: --port is required");
      const svc = {
        apiVersion: "v1", kind: "Service",
        metadata: { name: f.name || target.metadata.name, namespace: ns },
        spec: {
          type: f.type || "ClusterIP",
          selector,
          ports: [{ port: Number(f.port), targetPort: Number(f["target-port"] || f.port), protocol: "TCP" }]
        }
      };
      const dry = this.applyDryRun(svc, f, `service/${svc.metadata.name} exposed`);
      if (dry !== null) return dry;
      this.c.add(svc);
      this.c.tick();
      return `service/${svc.metadata.name} exposed`;
    }

    cmdDelete(rest, f) {
      if (f.filename) {
        const text = this.io.readFile(f.filename);
        const docs = this.io.yaml.loadAll(text).filter(Boolean);
        return docs.map((d) => {
          const plural = resolveKind(d.kind);
          this.c.remove(plural, d.metadata.namespace || this.c.namespace, d.metadata.name);
          return `${d.kind.toLowerCase()}/${d.metadata.name} deleted`;
        }).join("\n");
      }
      const plural = this.kindOf(rest[0]);
      const ns = this.ns(f) === "*" ? "default" : this.ns(f);
      let targets = rest.slice(1).map((n) => ({ name: n }));
      if (f.selector) targets = this.c.list(plural, ns).filter((x) => this.selectorMatch(x, f.selector)).map((x) => ({ name: x.metadata.name }));
      if (f.all) targets = this.c.list(plural, ns).map((x) => ({ name: x.metadata.name }));
      if (!targets.length) this.fail("error: 삭제할 대상을 지정하세요.");
      const out = targets.map(({ name }) => {
        const ok = this.c.remove(plural, ns, name);
        if (!ok) this.fail(`Error from server (NotFound): ${RESOURCES[plural].kind.toLowerCase()}s "${name}" not found`);
        return `${RESOURCES[plural].kind.toLowerCase()}/${name} deleted`;
      });
      this.c.tick();
      return out.join("\n");
    }

    cmdScale(rest, f) {
      const [plural, name] = this.target(rest, f);
      const ns = this.ns(f) === "*" ? "default" : this.ns(f);
      const obj = this.c.get(plural, ns, name);
      if (!obj) this.fail(`Error from server (NotFound): ${name} not found`);
      if (f.replicas === undefined) this.fail("error: --replicas is required");
      obj.spec.replicas = Number(f.replicas);
      this.c.put(obj);
      this.c.tick();
      return `${RESOURCES[plural].kind.toLowerCase()}.apps/${name} scaled`;
    }

    target(rest, f) {
      const first = rest[0];
      if (!first) this.fail("error: 대상을 지정하세요.");
      if (first.includes("/")) {
        const [kindWord, name] = first.split("/");
        return [this.kindOf(kindWord), name];
      }
      return [this.kindOf(first), rest[1]];
    }

    cmdSet(rest, f) {
      const what = (rest[0] || "").toLowerCase();
      const [plural, name] = this.target(rest.slice(1), f);
      const ns = this.ns(f) === "*" ? "default" : this.ns(f);
      const obj = this.c.get(plural, ns, name);
      if (!obj) this.fail(`Error from server (NotFound): ${name} not found`);
      const containers = ((obj.spec.template || {}).spec || obj.spec).containers || [];
      if (what === "image") {
        const pair = rest.slice(1).find((x) => x.includes("=") && !x.startsWith("-"));
        if (!pair) this.fail("error: 컨테이너=이미지 형식으로 주세요.");
        const [cname, image] = pair.split("=");
        const ct = containers.find((x) => x.name === cname);
        if (!ct) this.fail(`error: unable to find container named "${cname}"`);
        ct.image = image;
        obj._revision = (obj._revision || 1) + 1;
        this.c.podsOf(obj).forEach((p) => this.c.remove("pods", p.metadata.namespace, p.metadata.name));
      } else if (what === "resources") {
        const parseRes = (text) => Object.fromEntries(String(text || "").split(",").filter(Boolean).map((p) => p.split("=")));
        containers.forEach((ct) => {
          ct.resources = ct.resources || {};
          if (f.requests) ct.resources.requests = parseRes(f.requests);
          if (f.limits) ct.resources.limits = parseRes(f.limits);
        });
        obj._revision = (obj._revision || 1) + 1;
      } else if (what === "serviceaccount" || what === "sa") {
        const saName = rest[rest.length - 1];
        if (obj.spec.template) obj.spec.template.spec.serviceAccountName = saName;
        else obj.spec.serviceAccountName = saName;
      } else {
        this.fail(`이 실습 환경에서는 'kubectl set ${what}' 를 지원하지 않습니다.`);
      }
      this.c.put(obj);
      this.c.tick();
      return `${RESOURCES[plural].kind.toLowerCase()}.apps/${name} ${what} updated`;
    }

    cmdLabelAnnotate(rest, f, field) {
      const [plural, name] = this.target(rest, f);
      const ns = this.ns(f) === "*" ? "default" : this.ns(f);
      const obj = this.c.get(plural, ns, name);
      if (!obj) this.fail(`Error from server (NotFound): ${name} not found`);
      const pairs = rest.filter((x) => !x.startsWith("-") && (x.includes("=") || x.endsWith("-")));
      const bag = obj.metadata[field] = obj.metadata[field] || {};
      pairs.forEach((pair) => {
        if (pair.endsWith("-")) { delete bag[pair.slice(0, -1)]; return; }
        const i = pair.indexOf("=");
        const k = pair.slice(0, i), v = pair.slice(i + 1);
        if (bag[k] !== undefined && !f.overwrite) {
          this.fail(`error: '${k}' already has a value (${bag[k]}), and --overwrite is false`);
        }
        bag[k] = v;
      });
      this.c.put(obj);
      this.c.tick();
      return `${RESOURCES[plural].kind.toLowerCase()}/${name} ${field === "labels" ? "labeled" : "annotated"}`;
    }

    cmdTaint(rest, f) {
      const plural = this.kindOf(rest[0]);
      const name = rest[1];
      const node = this.c.get(plural, "-", name);
      if (!node) this.fail(`Error from server (NotFound): nodes "${name}" not found`);
      const spec = rest.slice(2).filter((x) => !x.startsWith("-"));
      node.spec = node.spec || {};
      node.spec.taints = node.spec.taints || [];
      spec.forEach((item) => {
        if (item.endsWith("-")) {
          const base = item.slice(0, -1);
          const [kv, effect] = base.split(":");
          const [k] = kv.split("=");
          node.spec.taints = node.spec.taints.filter((t) => !(t.key === k && (!effect || t.effect === effect)));
          return;
        }
        const [kv, effect] = item.split(":");
        const [k, v] = kv.split("=");
        node.spec.taints.push({ key: k, value: v, effect });
      });
      this.c.put(node);
      this.c.tick();
      return `node/${name} ${spec.some((s) => s.endsWith("-")) ? "untainted" : "tainted"}`;
    }

    cmdLogs(rest, f) {
      const name = rest[0];
      const ns = this.ns(f) === "*" ? "default" : this.ns(f);
      const pod = this.c.get("pods", ns, name);
      if (!pod) this.fail(`Error from server (NotFound): pods "${name}" not found`);
      const key = `${ns}/${name}${f.container ? "/" + f.container : ""}${f.previous ? "/previous" : ""}`;
      const stored = this.c.logs[key] || this.c.logs[`${ns}/${name}${f.previous ? "/previous" : ""}`];
      if (stored) return [].concat(stored).join("\n");
      if (f.previous) return "Error from server (BadRequest): previous terminated container not found";
      return `(${name} 컨테이너가 아직 아무것도 출력하지 않았습니다)`;
    }

    cmdExec(rest, f, parsed) {
      const name = rest[0];
      const ns = this.ns(f) === "*" ? "default" : this.ns(f);
      const pod = this.c.get("pods", ns, name);
      if (!pod) this.fail(`Error from server (NotFound): pods "${name}" not found`);
      if (!parsed.command || !parsed.command.length) this.fail("error: you must specify at least one command for the container");
      const cmd = parsed.command.join(" ");
      if (/^(sh|bash|\/bin\/sh|\/bin\/bash)$/.test(parsed.command[0])) {
        return "(실습 환경에서는 대화형 셸을 열 수 없습니다. `-- ls`, `-- cat <파일>` 처럼 한 번에 끝나는 명령을 주세요.)";
      }
      if (/^nslookup/.test(cmd)) {
        const host = parsed.command[1] || "";
        const [svcName, svcNs] = host.split(".");
        const svc = this.c.get("services", svcNs || ns, svcName);
        return svc
          ? `Server:    10.96.0.10\nAddress 1: 10.96.0.10 kube-dns.kube-system.svc.cluster.local\n\nName:      ${host}\nAddress 1: ${svc.spec.clusterIP} ${host}`
          : `Server:    10.96.0.10\n\nnslookup: can't resolve '${host}'`;
      }
      if (/^env$/.test(cmd)) {
        const env = ((pod.spec.containers || [])[0] || {}).env || [];
        return env.map((e) => `${e.name}=${e.value !== undefined ? e.value : "(from " + Object.keys(e.valueFrom || {})[0] + ")"}`).join("\n") || "PATH=/usr/local/sbin:/usr/local/bin";
      }
      return `(${cmd} 실행됨 — 실습 환경은 컨테이너 안을 흉내만 냅니다)`;
    }

    cmdRollout(rest, f) {
      const action = (rest[0] || "").toLowerCase();
      const [plural, name] = this.target(rest.slice(1), f);
      const ns = this.ns(f) === "*" ? "default" : this.ns(f);
      const obj = this.c.get(plural, ns, name);
      if (!obj) this.fail(`Error from server (NotFound): ${name} not found`);
      if (action === "status") {
        this.c.tick();
        const ready = (obj.status || {}).readyReplicas || 0;
        return ready >= obj.spec.replicas
          ? `deployment "${name}" successfully rolled out`
          : `Waiting for deployment "${name}" rollout to finish: ${ready} of ${obj.spec.replicas} updated replicas are available...`;
      }
      if (action === "history") {
        const revs = this.c.list("replicasets", ns)
          .filter((rs) => (rs.metadata.ownerReferences || []).some((o) => o.name === name))
          .map((rs) => (rs.metadata.annotations || {})["deployment.kubernetes.io/revision"] || "1");
        return `deployment.apps/${name} \nREVISION  CHANGE-CAUSE\n${[...new Set(revs)].sort().map((r) => `${r}         <none>`).join("\n")}`;
      }
      if (action === "undo") {
        obj._revision = (obj._revision || 1) + 1;
        this.c.podsOf(obj).forEach((p) => this.c.remove("pods", p.metadata.namespace, p.metadata.name));
        this.c.put(obj); this.c.tick();
        return `deployment.apps/${name} rolled back`;
      }
      if (action === "restart") {
        obj.spec.template.metadata = obj.spec.template.metadata || {};
        obj.spec.template.metadata.annotations = Object.assign({}, obj.spec.template.metadata.annotations, {
          "kubectl.kubernetes.io/restartedAt": new Date().toISOString()
        });
        obj._revision = (obj._revision || 1) + 1;
        this.c.podsOf(obj).forEach((p) => this.c.remove("pods", p.metadata.namespace, p.metadata.name));
        this.c.put(obj); this.c.tick();
        return `deployment.apps/${name} restarted`;
      }
      if (action === "pause" || action === "resume") return `deployment.apps/${name} ${action}d`;
      this.fail(`이 실습 환경에서는 'kubectl rollout ${action}' 를 지원하지 않습니다.`);
    }

    cmdEdit(rest, f) {
      const [plural, name] = this.target(rest, f);
      const ns = this.ns(f) === "*" ? "default" : this.ns(f);
      const obj = this.c.get(plural, ns, name);
      if (!obj) this.fail(`Error from server (NotFound): ${name} not found`);
      if (!this.io.openEditor) this.fail("이 환경에서는 편집기를 열 수 없습니다.");
      this.io.openEditor(`${plural}-${name}.yaml`, this.toYaml(clean(obj)), (text) => {
        const doc = this.io.yaml.load(text);
        const merged = Object.assign({}, obj, doc, { _plural: plural });
        this.c.put(merged);
        this.c.tick();
      });
      return `편집기에서 ${RESOURCES[plural].kind.toLowerCase()}/${name} 를 열었습니다. 저장하면 반영됩니다.`;
    }

    cmdPatch(rest, f) {
      const [plural, name] = this.target(rest, f);
      const ns = this.ns(f) === "*" ? "default" : this.ns(f);
      const obj = this.c.get(plural, ns, name);
      if (!obj) this.fail(`Error from server (NotFound): ${name} not found`);
      let patch;
      try { patch = JSON.parse(String(f.patch || f.p || "")); }
      catch (e) { this.fail("error: patch 내용을 JSON 으로 읽지 못했습니다."); }
      const merge = (target, source) => {
        Object.keys(source).forEach((k) => {
          if (source[k] && typeof source[k] === "object" && !Array.isArray(source[k])) {
            target[k] = merge(target[k] || {}, source[k]);
          } else target[k] = source[k];
        });
        return target;
      };
      merge(obj, patch);
      this.c.put(obj);
      this.c.tick();
      return `${RESOURCES[plural].kind.toLowerCase()}/${name} patched`;
    }

    cmdConfig(rest, f) {
      const sub = (rest[0] || "").toLowerCase();
      if (sub === "get-contexts") {
        return this.table(["CURRENT", "NAME", "CLUSTER", "NAMESPACE"],
          this.c.contexts.map((ctx) => [ctx === this.c.context ? "*" : "", ctx, ctx, ctx === this.c.context ? this.c.namespace : "default"]));
      }
      if (sub === "current-context") return this.c.context;
      if (sub === "use-context") {
        const name = rest[1];
        if (!this.c.contexts.includes(name)) this.fail(`error: no context exists with the name: "${name}"`);
        this.c.context = name;
        return `Switched to context "${name}".`;
      }
      if (sub === "set-context") {
        if (f.namespace) { this.c.namespace = f.namespace; return `Context "${this.c.context}" modified.`; }
        return `Context "${this.c.context}" modified.`;
      }
      if (sub === "view") return `current-context: ${this.c.context}\ncontexts:\n${this.c.contexts.map((x) => `- name: ${x}`).join("\n")}`;
      this.fail(`이 실습 환경에서는 'kubectl config ${sub}' 를 지원하지 않습니다.`);
    }

    cmdTop(rest, f) {
      const what = this.kindOf(rest[0] || "pods");
      if (what === "nodes") {
        return this.table(["NAME", "CPU(cores)", "CPU%", "MEMORY(bytes)", "MEMORY%"],
          this.c.list("nodes", "-").map((n, i) => [n.metadata.name, `${120 + i * 45}m`, `${6 + i * 2}%`, `${900 + i * 120}Mi`, `${23 + i * 4}%`]));
      }
      const ns = this.ns(f) === "*" ? "*" : this.ns(f);
      const pods = this.c.list("pods", ns);
      if (!pods.length) return `No resources found in ${ns} namespace.`;
      const rows = pods.map((p, i) => [p.metadata.name, `${3 + (i * 7) % 90}m`, `${12 + (i * 13) % 180}Mi`]);
      if (f["sort-by"] === "cpu") rows.sort((a, b) => parseInt(b[1]) - parseInt(a[1]));
      if (f["sort-by"] === "memory") rows.sort((a, b) => parseInt(b[2]) - parseInt(a[2]));
      return this.table(["NAME", "CPU(cores)", "MEMORY(bytes)"], rows);
    }

    cmdExplain(rest) {
      const path = (rest[0] || "").toLowerCase();
      const docs = {
        pod: "KIND: Pod\nFIELDS:\n   apiVersion, kind, metadata, spec, status",
        "pod.spec": "FIELDS:\n   containers <[]Container> -required-\n   initContainers, volumes, nodeSelector, tolerations,\n   serviceAccountName, restartPolicy, securityContext, affinity",
        "pod.spec.containers": "FIELDS:\n   name <string> -required-\n   image <string>\n   command <[]string>, args <[]string>\n   env, envFrom, ports, resources, volumeMounts,\n   livenessProbe, readinessProbe, startupProbe, securityContext",
        "deployment.spec": "FIELDS:\n   replicas <integer>\n   selector <LabelSelector> -required-\n   template <PodTemplateSpec> -required-\n   strategy <DeploymentStrategy>",
        "service.spec": "FIELDS:\n   type <string>  ClusterIP | NodePort | LoadBalancer | ExternalName\n   selector <map[string]string>\n   ports <[]ServicePort>  (port, targetPort, nodePort)\n   clusterIP <string>"
      };
      return docs[path] || `이 실습 환경의 explain 은 pod, pod.spec, pod.spec.containers, deployment.spec, service.spec 만 담고 있습니다.\n나머지는 공식 문서를 여세요.`;
    }

    cmdAuth(rest, f) {
      if ((rest[0] || "").toLowerCase() !== "can-i") this.fail("이 실습 환경은 'kubectl auth can-i' 만 지원합니다.");
      const verb = rest[1], resource = rest[2];
      const as = f.as || "";
      const m = /^system:serviceaccount:([^:]+):(.+)$/.exec(as);
      if (!m) return "yes";
      const [, saNs, saName] = m;
      const ns = this.ns(f) === "*" ? "default" : this.ns(f);
      const bindings = this.c.list("rolebindings", ns).filter((rb) =>
        (rb.subjects || []).some((s) => s.kind === "ServiceAccount" && s.name === saName && (s.namespace || ns) === saNs));
      const allowed = bindings.some((rb) => {
        const role = this.c.get("roles", ns, (rb.roleRef || {}).name);
        if (!role) return (rb.roleRef || {}).kind === "ClusterRole";
        return (role.rules || []).some((rule) =>
          (rule.verbs || []).some((v) => v === verb || v === "*") &&
          (rule.resources || []).some((r) => r === resource || r === "*" || r === resolveKind(resource)));
      });
      return allowed ? "yes" : "no";
    }

    cmdDrain(rest, f, mode) {
      const name = rest[0];
      const node = this.c.get("nodes", "-", name);
      if (!node) this.fail(`Error from server (NotFound): nodes "${name}" not found`);
      node.spec = node.spec || {};
      if (mode === "uncordon") {
        delete node.spec.unschedulable;
        this.c.put(node);
        return `node/${name} uncordoned`;
      }
      node.spec.unschedulable = true;
      this.c.put(node);
      if (mode === "cordon") return `node/${name} cordoned`;
      const pods = this.c.list("pods", "*").filter((p) => p.spec.nodeName === name);
      const daemon = pods.filter((p) => (p.metadata.ownerReferences || []).some((o) => o.kind === "DaemonSet"));
      if (daemon.length && !f["ignore-daemonsets"]) {
        this.fail(`error: cannot delete DaemonSet-managed Pods (use --ignore-daemonsets to ignore)`);
      }
      const evicted = pods.filter((p) => !(p.metadata.ownerReferences || []).some((o) => o.kind === "DaemonSet"));
      evicted.forEach((p) => this.c.remove("pods", p.metadata.namespace, p.metadata.name));
      this.c.tick();
      return `node/${name} cordoned\n${evicted.map((p) => `evicting pod ${p.metadata.namespace}/${p.metadata.name}`).join("\n")}\nnode/${name} drained`;
    }

    cmdAutoscale(rest, f) {
      const [plural, name] = this.target(rest, f);
      const ns = this.ns(f) === "*" ? "default" : this.ns(f);
      const target = this.c.get(plural, ns, name);
      if (!target) this.fail(`Error from server (NotFound): ${name} not found`);
      const hpa = {
        apiVersion: "autoscaling/v2", kind: "HorizontalPodAutoscaler",
        metadata: { name, namespace: ns },
        spec: {
          scaleTargetRef: { apiVersion: "apps/v1", kind: RESOURCES[plural].kind, name },
          minReplicas: Number(f.min), maxReplicas: Number(f.max),
          metrics: [{ type: "Resource", resource: { name: "cpu", target: { type: "Utilization", averageUtilization: Number(f["cpu-percent"] || 80) } } }]
        }
      };
      const dry = this.applyDryRun(hpa, f, `horizontalpodautoscaler.autoscaling/${name} autoscaled`);
      if (dry !== null) return dry;
      this.c.add(hpa);
      return `horizontalpodautoscaler.autoscaling/${name} autoscaled`;
    }

    cmdApiResources() {
      return this.table(["NAME", "SHORTNAMES", "APIVERSION", "NAMESPACED", "KIND"],
        Object.entries(RESOURCES).map(([plural, m]) => [plural, m.short.join(","), m.api, String(m.ns), m.kind]));
    }
  }

  function btoaSafe(text) {
    try { return typeof btoa === "function" ? btoa(text) : Buffer.from(text).toString("base64"); }
    catch (e) { return text; }
  }

  return { Kubectl, jsonpath, COLUMNS };
});
