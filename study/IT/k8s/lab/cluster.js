// 브라우저 안에서 도는 가짜 쿠버네티스 컨트롤플레인
// ---------------------------------------------------------------------------
// 진짜 클러스터는 정적 호스팅에 올릴 수 없으므로, 시험에서 실제로 쓰는 범위만
// 흉내 낸다. 오브젝트 저장소 + 컨트롤러 루프 + 리소스별 출력 열 정의가 전부다.
//
//   - 저장소 키: `${plural}/${namespace}/${name}` (클러스터 범위는 ns 가 "-")
//   - tick() 한 번이 컨트롤러 한 바퀴다. 1초마다 돌려 파드가 2~3초 뒤 Running 이
//     되게 한다 — 바로 Running 이 되면 "기다렸다 확인하는" 습관이 안 붙는다.
//   - 시드에서 metadata.annotations["lab/fault"] 를 주면 고장난 상태를 만든다.
// ---------------------------------------------------------------------------
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.K8sLab = Object.assign(root.K8sLab || {}, api);
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const clone = (value) => JSON.parse(JSON.stringify(value));

  // 리소스 레지스트리. kubectl 이 아는 종류와 출력 열을 한곳에 모았다.
  const RESOURCES = {
    namespaces:      { kind: "Namespace", api: "v1", ns: false, short: ["ns"] },
    nodes:           { kind: "Node", api: "v1", ns: false, short: ["no"] },
    pods:            { kind: "Pod", api: "v1", ns: true, short: ["po"] },
    replicasets:     { kind: "ReplicaSet", api: "apps/v1", ns: true, short: ["rs"] },
    deployments:     { kind: "Deployment", api: "apps/v1", ns: true, short: ["deploy"] },
    daemonsets:      { kind: "DaemonSet", api: "apps/v1", ns: true, short: ["ds"] },
    statefulsets:    { kind: "StatefulSet", api: "apps/v1", ns: true, short: ["sts"] },
    jobs:            { kind: "Job", api: "batch/v1", ns: true, short: [] },
    cronjobs:        { kind: "CronJob", api: "batch/v1", ns: true, short: ["cj"] },
    services:        { kind: "Service", api: "v1", ns: true, short: ["svc"] },
    endpoints:       { kind: "Endpoints", api: "v1", ns: true, short: ["ep"] },
    ingresses:       { kind: "Ingress", api: "networking.k8s.io/v1", ns: true, short: ["ing"] },
    ingressclasses:  { kind: "IngressClass", api: "networking.k8s.io/v1", ns: false, short: [] },
    networkpolicies: { kind: "NetworkPolicy", api: "networking.k8s.io/v1", ns: true, short: ["netpol"] },
    configmaps:      { kind: "ConfigMap", api: "v1", ns: true, short: ["cm"] },
    secrets:         { kind: "Secret", api: "v1", ns: true, short: [] },
    serviceaccounts: { kind: "ServiceAccount", api: "v1", ns: true, short: ["sa"] },
    persistentvolumes:      { kind: "PersistentVolume", api: "v1", ns: false, short: ["pv"] },
    persistentvolumeclaims: { kind: "PersistentVolumeClaim", api: "v1", ns: true, short: ["pvc"] },
    storageclasses:  { kind: "StorageClass", api: "storage.k8s.io/v1", ns: false, short: ["sc"] },
    roles:           { kind: "Role", api: "rbac.authorization.k8s.io/v1", ns: true, short: [] },
    rolebindings:    { kind: "RoleBinding", api: "rbac.authorization.k8s.io/v1", ns: true, short: [] },
    clusterroles:    { kind: "ClusterRole", api: "rbac.authorization.k8s.io/v1", ns: false, short: [] },
    clusterrolebindings: { kind: "ClusterRoleBinding", api: "rbac.authorization.k8s.io/v1", ns: false, short: [] },
    resourcequotas:  { kind: "ResourceQuota", api: "v1", ns: true, short: ["quota"] },
    limitranges:     { kind: "LimitRange", api: "v1", ns: true, short: ["limits"] },
    horizontalpodautoscalers: { kind: "HorizontalPodAutoscaler", api: "autoscaling/v2", ns: true, short: ["hpa"] },
    poddisruptionbudgets: { kind: "PodDisruptionBudget", api: "policy/v1", ns: true, short: ["pdb"] },
    events:          { kind: "Event", api: "v1", ns: true, short: ["ev"] }
  };

  // 축약·단수 → 정규 복수형
  const ALIASES = {};
  Object.entries(RESOURCES).forEach(([plural, meta]) => {
    ALIASES[plural] = plural;
    ALIASES[plural.replace(/e?s$/, "")] = plural;
    ALIASES[meta.kind.toLowerCase()] = plural;
    meta.short.forEach((s) => { ALIASES[s] = plural; });
  });
  ALIASES.po = "pods"; ALIASES.pod = "pods";
  ALIASES.ep = "endpoints"; ALIASES.endpoint = "endpoints";
  ALIASES.netpol = "networkpolicies";
  ALIASES.ing = "ingresses";
  ALIASES.sc = "storageclasses";
  ALIASES.quota = "resourcequotas";
  ALIASES.limits = "limitranges";

  const resolveKind = (word) => ALIASES[String(word || "").toLowerCase()] || null;

  function formatAge(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return s % 60 && m < 10 ? `${m}m${s % 60}s` : `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h${m % 60 ? m % 60 + "m" : ""}`;
    return `${Math.floor(h / 24)}d`;
  }

  class Cluster {
    constructor() { this.reset(); }

    reset() {
      this.objects = new Map();
      this.seq = 0;
      this.started = Date.now();
      this.contexts = ["k8s-c1", "k8s-c2"];
      this.context = "k8s-c1";
      this.namespace = "default";
      this.logs = {};
      this.ipSeed = 10;

      ["default", "kube-system", "kube-public", "kube-node-lease"].forEach((name) =>
        this.add({ apiVersion: "v1", kind: "Namespace", metadata: { name } }, { quiet: true }));

      [["controlplane", "control-plane"], ["node01", "<none>"], ["node02", "<none>"]].forEach(([name, role]) => {
        this.add({
          apiVersion: "v1", kind: "Node",
          metadata: { name, labels: { "kubernetes.io/hostname": name, "kubernetes.io/os": "linux" } },
          spec: role === "control-plane"
            ? { taints: [{ key: "node-role.kubernetes.io/control-plane", effect: "NoSchedule" }] }
            : {},
          status: {
            conditions: [{ type: "Ready", status: "True" }],
            nodeInfo: { kubeletVersion: "v1.32.1", osImage: "Ubuntu 22.04.4 LTS", containerRuntimeVersion: "containerd://1.7.13" }
          },
          _role: role
        }, { quiet: true });
      });
    }

    // ---- 저장소 --------------------------------------------------------
    key(plural, ns, name) {
      const meta = RESOURCES[plural];
      return `${plural}/${meta && meta.ns ? (ns || "default") : "-"}/${name}`;
    }

    add(object, options) {
      const opts = options || {};
      const plural = resolveKind(object.kind);
      if (!plural) throw new Error(`서버가 모르는 종류입니다: ${object.kind}`);
      const meta = RESOURCES[plural];
      const obj = clone(object);
      obj.apiVersion = obj.apiVersion || meta.api;
      obj.metadata = obj.metadata || {};
      if (meta.ns) obj.metadata.namespace = obj.metadata.namespace || opts.namespace || this.namespace;
      else delete obj.metadata.namespace;
      obj.metadata.uid = obj.metadata.uid || `uid-${++this.seq}`;
      obj.metadata.creationTimestamp = obj.metadata.creationTimestamp || Date.now();
      obj.metadata.resourceVersion = String(++this.seq);
      obj._plural = plural;
      this.applyDefaults(obj);
      const key = this.key(plural, obj.metadata.namespace, obj.metadata.name);
      if (this.objects.has(key) && !opts.replace) {
        const error = new Error(`${meta.kind.toLowerCase()} "${obj.metadata.name}" already exists`);
        error.alreadyExists = true;
        throw error;
      }
      this.objects.set(key, obj);
      return obj;
    }

    put(obj) {
      obj.metadata.resourceVersion = String(++this.seq);
      this.objects.set(this.key(obj._plural, obj.metadata.namespace, obj.metadata.name), obj);
      return obj;
    }

    get(plural, ns, name) {
      return this.objects.get(this.key(plural, ns, name)) || null;
    }

    list(plural, ns) {
      const meta = RESOURCES[plural];
      const out = [];
      this.objects.forEach((obj) => {
        if (obj._plural !== plural) return;
        if (meta.ns && ns && ns !== "*" && obj.metadata.namespace !== ns) return;
        out.push(obj);
      });
      return out.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
    }

    remove(plural, ns, name) {
      const key = this.key(plural, ns, name);
      const existed = this.objects.has(key);
      this.objects.delete(key);
      if (existed && plural !== "pods") this.cascade(plural, ns, name);
      return existed;
    }

    // 소유자가 지워지면 딸린 것도 지운다(간략화한 가비지 컬렉션)
    cascade(plural, ns, name) {
      const victims = [];
      this.objects.forEach((obj) => {
        const owners = (obj.metadata.ownerReferences || []).map((o) => `${o.kind}/${o.name}`);
        const meta = RESOURCES[plural];
        if (owners.includes(`${meta.kind}/${name}`) && obj.metadata.namespace === ns) victims.push(obj);
      });
      victims.forEach((obj) => this.remove(obj._plural, obj.metadata.namespace, obj.metadata.name));
    }

    applyDefaults(obj) {
      if (obj.kind === "Pod") {
        obj.spec = obj.spec || {};
        obj.spec.restartPolicy = obj.spec.restartPolicy || "Always";
        obj.status = obj.status || {};
        obj.status.phase = obj.status.phase || "Pending";
        obj.status.restartCount = obj.status.restartCount || 0;
        obj._readyAt = obj._readyAt || Date.now() + 2000;
      }
      if (obj.kind === "Service") {
        obj.spec = obj.spec || {};
        obj.spec.type = obj.spec.type || "ClusterIP";
        if (obj.spec.clusterIP !== "None" && obj.spec.type !== "ExternalName") {
          obj.spec.clusterIP = obj.spec.clusterIP || `10.96.${Math.floor(this.seq / 250) % 250}.${this.seq % 250}`;
        }
        (obj.spec.ports || []).forEach((p) => {
          if (p.targetPort === undefined) p.targetPort = p.port;
          p.protocol = p.protocol || "TCP";
          if (obj.spec.type === "NodePort" && !p.nodePort) p.nodePort = 30000 + (this.seq % 2700);
        });
      }
      if (obj.kind === "Deployment" || obj.kind === "ReplicaSet" || obj.kind === "StatefulSet") {
        obj.spec = obj.spec || {};
        if (obj.spec.replicas === undefined) obj.spec.replicas = 1;
        obj.status = obj.status || {};
      }
      if (obj.kind === "PersistentVolumeClaim" || obj.kind === "PersistentVolume") {
        obj.status = obj.status || {};
        obj.status.phase = obj.status.phase || (obj.kind === "PersistentVolume" ? "Available" : "Pending");
      }
    }

    // ---- 컨트롤러 ------------------------------------------------------
    tick() {
      this.reconcileDeployments();
      this.reconcileReplicaSets();
      this.reconcileDaemonSets();
      this.reconcileJobs();
      this.schedulePods();
      this.runPods();
      this.bindClaims();
      this.reconcileEndpoints();
      this.updateStatuses();
    }

    hash(text) {
      let h = 0;
      for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) % 100000;
      return String(10000 + (h % 89999));
    }

    reconcileDeployments() {
      this.list("deployments", "*").forEach((dep) => {
        const pts = this.hash(JSON.stringify(dep.spec.template || {}));
        const name = `${dep.metadata.name}-${pts}`;
        const existing = this.list("replicasets", dep.metadata.namespace)
          .filter((rs) => (rs.metadata.ownerReferences || []).some((o) => o.name === dep.metadata.name));
        existing.forEach((rs) => {
          if (rs.metadata.name !== name && rs.spec.replicas !== 0) { rs.spec.replicas = 0; this.put(rs); }
        });
        let rs = this.get("replicasets", dep.metadata.namespace, name);
        if (!rs) {
          const labels = Object.assign({}, (dep.spec.template && dep.spec.template.metadata && dep.spec.template.metadata.labels) || {}, { "pod-template-hash": pts });
          rs = this.add({
            apiVersion: "apps/v1", kind: "ReplicaSet",
            metadata: {
              name, namespace: dep.metadata.namespace, labels,
              ownerReferences: [{ apiVersion: "apps/v1", kind: "Deployment", name: dep.metadata.name, uid: dep.metadata.uid }],
              annotations: { "deployment.kubernetes.io/revision": String(dep._revision || 1) }
            },
            spec: {
              replicas: dep.spec.replicas,
              selector: { matchLabels: labels },
              template: clone(dep.spec.template || {})
            }
          });
          rs.spec.template.metadata = rs.spec.template.metadata || {};
          rs.spec.template.metadata.labels = labels;
        } else if (rs.spec.replicas !== dep.spec.replicas) {
          rs.spec.replicas = dep.spec.replicas;
          this.put(rs);
        }
      });
    }

    reconcileReplicaSets() {
      this.list("replicasets", "*").forEach((rs) => {
        const owned = this.list("pods", rs.metadata.namespace)
          .filter((pod) => (pod.metadata.ownerReferences || []).some((o) => o.kind === "ReplicaSet" && o.name === rs.metadata.name));
        const want = rs.spec.replicas || 0;
        if (owned.length < want) {
          for (let i = owned.length; i < want; i += 1) this.podFromTemplate(rs, "ReplicaSet");
        } else if (owned.length > want) {
          owned.slice(want).forEach((pod) => this.remove("pods", pod.metadata.namespace, pod.metadata.name));
        }
      });
    }

    podFromTemplate(owner, kind, nameOverride, nodeName) {
      const template = clone(owner.spec.template || {});
      const suffix = Math.random().toString(36).slice(2, 7);
      const pod = {
        apiVersion: "v1", kind: "Pod",
        metadata: {
          name: nameOverride || `${owner.metadata.name}-${suffix}`,
          namespace: owner.metadata.namespace,
          labels: (template.metadata && template.metadata.labels) || {},
          annotations: (template.metadata && template.metadata.annotations) || {},
          ownerReferences: [{ apiVersion: owner.apiVersion, kind, name: owner.metadata.name, uid: owner.metadata.uid }]
        },
        spec: template.spec || {}
      };
      if (nodeName) pod.spec.nodeName = nodeName;
      return this.add(pod);
    }

    reconcileDaemonSets() {
      this.list("daemonsets", "*").forEach((ds) => {
        const nodes = this.list("nodes", "-").filter((n) => this.nodeFits(n, ds.spec.template || {}));
        nodes.forEach((node) => {
          const exists = this.list("pods", ds.metadata.namespace).some((pod) =>
            (pod.metadata.ownerReferences || []).some((o) => o.kind === "DaemonSet" && o.name === ds.metadata.name) &&
            pod.spec.nodeName === node.metadata.name);
          if (!exists) this.podFromTemplate(ds, "DaemonSet", `${ds.metadata.name}-${node.metadata.name.slice(-3)}${Math.random().toString(36).slice(2, 4)}`, node.metadata.name);
        });
      });
    }

    reconcileJobs() {
      this.list("jobs", "*").forEach((job) => {
        const pods = this.list("pods", job.metadata.namespace)
          .filter((pod) => (pod.metadata.ownerReferences || []).some((o) => o.kind === "Job" && o.name === job.metadata.name));
        const want = job.spec.completions || 1;
        if (pods.length < Math.min(want, job.spec.parallelism || want)) this.podFromTemplate(job, "Job");
        const done = pods.filter((p) => p.status.phase === "Succeeded").length;
        job.status = job.status || {};
        job.status.succeeded = done;
        if (done >= want) job.status.completionTime = job.status.completionTime || Date.now();
      });
    }

    nodeFits(node, template) {
      const spec = template.spec || {};
      const selector = spec.nodeSelector || {};
      const labels = node.metadata.labels || {};
      if (!Object.keys(selector).every((k) => String(labels[k]) === String(selector[k]))) return false;
      const taints = (node.spec && node.spec.taints) || [];
      const tolerations = spec.tolerations || [];
      return taints.every((taint) => tolerations.some((tol) => {
        if (tol.operator === "Exists") return !tol.key || tol.key === taint.key;
        return (!tol.key || tol.key === taint.key) &&
          (tol.value === undefined || String(tol.value) === String(taint.value)) &&
          (!tol.effect || tol.effect === taint.effect);
      }));
    }

    schedulePods() {
      this.list("pods", "*").forEach((pod) => {
        if (pod.spec.nodeName || pod.status.phase !== "Pending") return;
        const fault = (pod.metadata.annotations || {})["lab/fault"];
        if (fault === "Unschedulable") return;
        // cordon(=unschedulable) 된 노드는 스케줄러가 고르지 않는다.
        // 데몬셋 파드는 nodeName 을 직접 받으므로 여기를 거치지 않는다.
        const fitting = this.list("nodes", "-")
          .filter((n) => !(n.spec || {}).unschedulable)
          .filter((n) => this.nodeFits(n, { spec: pod.spec }));
        const load = (name) => this.list("pods", "*").filter((p) => p.spec.nodeName === name).length;
        const node = fitting.sort((a, b) => load(a.metadata.name) - load(b.metadata.name))[0];
        if (!node) {
          pod.status.reason = "Unschedulable";
          return;
        }
        pod.spec.nodeName = node.metadata.name;
        pod.status.podIP = `10.244.${this.ipSeed % 250}.${(this.ipSeed += 7) % 250}`;
        delete pod.status.reason;
        this.put(pod);
      });
    }

    runPods() {
      const now = Date.now();
      this.list("pods", "*").forEach((pod) => {
        if (!pod.spec.nodeName || now < (pod._readyAt || 0)) return;
        // 존재하지 않는 이미지는 스스로 ImagePullBackOff 가 된다.
        // 이렇게 해야 이미지를 고치는 순간 파드가 낫는다(어노테이션으로 박아 두면 안 낫는다).
        const images = (pod.spec.containers || []).map((c) => String(c.image || ""));
        const badImage = images.some((img) => /doesnotexist|notfound|:0\.0$|nosuchimage/i.test(img));
        const fault = badImage ? "ImagePullBackOff" : (pod.metadata.annotations || {})["lab/fault"];
        if (!fault && pod.status.reason === "ImagePullBackOff") { delete pod.status.reason; pod.status.phase = "Pending"; }
        if (fault && fault !== "Unschedulable") {
          pod.status.phase = fault === "CrashLoopBackOff" ? "Running" : "Pending";
          pod.status.reason = fault;
          pod.status.ready = false;
          if (fault === "CrashLoopBackOff") pod.status.restartCount = Math.min(12, (pod.status.restartCount || 0) + 1);
          return;
        }
        if (pod.status.phase === "Pending") {
          pod.status.phase = (pod.spec.restartPolicy === "Never" || pod.spec.restartPolicy === "OnFailure") ? "Succeeded" : "Running";
          pod.status.startTime = now;
        }
        pod.status.ready = pod.status.phase === "Running";
      });
    }

    bindClaims() {
      this.list("persistentvolumeclaims", "*").forEach((pvc) => {
        if (pvc.status.phase === "Bound") return;
        const want = ((pvc.spec.resources || {}).requests || {}).storage || "0";
        const pv = this.list("persistentvolumes", "-").find((v) =>
          v.status.phase === "Available" &&
          String(v.spec.storageClassName || "") === String(pvc.spec.storageClassName || "") &&
          (pvc.spec.accessModes || []).every((m) => (v.spec.accessModes || []).includes(m)) &&
          this.quantity(v.spec.capacity && v.spec.capacity.storage) >= this.quantity(want));
        if (!pv) return;
        pvc.status.phase = "Bound";
        pvc.spec.volumeName = pv.metadata.name;
        pvc.status.capacity = clone(pv.spec.capacity);
        pv.status.phase = "Bound";
        pv.spec.claimRef = { kind: "PersistentVolumeClaim", namespace: pvc.metadata.namespace, name: pvc.metadata.name };
        this.put(pv); this.put(pvc);
      });
    }

    quantity(text) {
      const m = /^(\d+(?:\.\d+)?)\s*(Ki|Mi|Gi|Ti|K|M|G|T)?i?$/.exec(String(text || "0"));
      if (!m) return 0;
      const mult = { Ki: 1024, Mi: 1024 ** 2, Gi: 1024 ** 3, Ti: 1024 ** 4, K: 1e3, M: 1e6, G: 1e9, T: 1e12 };
      return Number(m[1]) * (mult[m[2]] || 1);
    }

    matchLabels(labels, selector) {
      if (!selector || !Object.keys(selector).length) return false;
      return Object.keys(selector).every((k) => String((labels || {})[k]) === String(selector[k]));
    }

    reconcileEndpoints() {
      this.list("services", "*").forEach((svc) => {
        if (!svc.spec.selector || svc.spec.type === "ExternalName") return;
        const pods = this.list("pods", svc.metadata.namespace)
          .filter((pod) => this.matchLabels(pod.metadata.labels, svc.spec.selector) && pod.status.ready);
        const port = (svc.spec.ports && svc.spec.ports[0] && svc.spec.ports[0].targetPort) || 80;
        const addresses = pods.map((pod) => ({ ip: pod.status.podIP, targetRef: { kind: "Pod", name: pod.metadata.name } }));
        let ep = this.get("endpoints", svc.metadata.namespace, svc.metadata.name);
        const subsets = addresses.length ? [{ addresses, ports: [{ port: Number(port) || 80, protocol: "TCP" }] }] : [];
        if (!ep) {
          ep = this.add({ apiVersion: "v1", kind: "Endpoints", metadata: { name: svc.metadata.name, namespace: svc.metadata.namespace }, subsets });
        } else {
          ep.subsets = subsets;
          this.put(ep);
        }
      });
    }

    updateStatuses() {
      this.list("deployments", "*").forEach((dep) => {
        const pods = this.podsOf(dep);
        dep.status.replicas = pods.length;
        dep.status.readyReplicas = pods.filter((p) => p.status.ready).length;
        dep.status.updatedReplicas = pods.length;
      });
      this.list("replicasets", "*").forEach((rs) => {
        const pods = this.list("pods", rs.metadata.namespace)
          .filter((pod) => (pod.metadata.ownerReferences || []).some((o) => o.kind === "ReplicaSet" && o.name === rs.metadata.name));
        rs.status = rs.status || {};
        rs.status.replicas = pods.length;
        rs.status.readyReplicas = pods.filter((p) => p.status.ready).length;
      });
    }

    // 디플로이먼트가 (레플리카셋을 거쳐) 가진 파드
    podsOf(dep) {
      const rsNames = this.list("replicasets", dep.metadata.namespace)
        .filter((rs) => (rs.metadata.ownerReferences || []).some((o) => o.name === dep.metadata.name))
        .map((rs) => rs.metadata.name);
      return this.list("pods", dep.metadata.namespace)
        .filter((pod) => (pod.metadata.ownerReferences || []).some((o) => rsNames.includes(o.name)));
    }

    age(obj) { return formatAge(Date.now() - (obj.metadata.creationTimestamp || Date.now())); }
  }

  return { Cluster, RESOURCES, resolveKind, formatAge, clone };
});
