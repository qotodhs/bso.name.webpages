window.addK8sLabs([
  {
    id: "troubleshoot",
    exam: "cka",
    title: "트러블슈팅 — 고장난 클러스터 고치기",
    minutes: 25,
    intro: "`prod` 네임스페이스가 망가져 있습니다. 증상을 보고 원인을 찾아 고치세요. 상태별 첫 수는 노트의 '디버깅 — 상태별 첫 수' 표에 있습니다.",
    seed(c) {
      c.add({ apiVersion: "v1", kind: "Namespace", metadata: { name: "prod" } });

      // ① 존재하지 않는 이미지 — 이미지를 고치면 스스로 낫는다
      c.add(window.labHelpers.deployment("shop", "prod", "nginx:1.99-doesnotexist", 2));

      // ② selector 가 파드 라벨과 어긋난 서비스
      c.add({
        apiVersion: "v1", kind: "Service",
        metadata: { name: "shop-svc", namespace: "prod" },
        spec: { type: "ClusterIP", selector: { app: "shopfront" }, ports: [{ port: 80, targetPort: 80, protocol: "TCP" }] }
      });

      // ③ 계속 죽는 파드 — 직전 로그에 원인이 있다
      const crash = c.add(window.labHelpers.pod("api-7f9", "prod", "api:2.1", {
        metadata: { name: "api-7f9", namespace: "prod", labels: { app: "api" }, annotations: { "lab/fault": "CrashLoopBackOff" } }
      }));
      crash._readyAt = Date.now() - 1;
      c.logs["prod/api-7f9/previous"] = [
        "2026-10-22T02:11:03Z  starting api server v2.1",
        "2026-10-22T02:11:03Z  reading config from /etc/api/config.yaml",
        "2026-10-22T02:11:04Z  FATAL: cannot connect to database at db.prod.svc.cluster.local:5432"
      ];

      // ④ 어느 노드에도 못 올라가는 파드
      c.add(window.labHelpers.pod("batch", "prod", "busybox:1.36", {
        metadata: { name: "batch", namespace: "prod", labels: { app: "batch" } },
        spec: { containers: [{ name: "batch", image: "busybox:1.36" }], nodeSelector: { disk: "nvme" } }
      }));
    },
    solution: [
      "kubectl set image deployment/shop shop=nginx:1.25 -n prod",
      "kubectl patch svc shop-svc -n prod -p '{\"spec\":{\"selector\":{\"app\":\"shop\"}}}'",
      "kubectl logs api-7f9 -n prod --previous | tail -1 > /root/crash.txt",
      "kubectl label node node02 disk=nvme",
      "kubectl get deploy shop -n prod -o jsonpath='{.spec.template.spec.containers[0].image}' > /root/image.txt",
      "kubectl drain node01 --ignore-daemonsets --delete-emptydir-data"
    ],
    tasks: [
      {
        id: "image",
        prompt: "디플로이먼트 `shop` 의 파드가 뜨지 않는다. 원인을 찾아 고치고, 파드 2개가 모두 Running 이 되게 하라. 올바른 이미지는 `nginx:1.25` 다.",
        hint: "`kubectl get pods -n prod` 의 STATUS 를 먼저 보고, `kubectl describe pod <이름> -n prod` 의 Events 를 읽어라.",
        docs: "https://kubernetes.io/docs/tasks/debug/debug-application/",
        verify: (ctx) => {
          const dep = ctx.c.get("deployments", "prod", "shop");
          if (!dep) return { ok: false, detail: "디플로이먼트 shop 이 없습니다" };
          const image = ((dep.spec.template.spec.containers || [])[0] || {}).image;
          if (image !== "nginx:1.25") return { ok: false, detail: `이미지가 아직 ${image} 입니다` };
          const ready = (dep.status || {}).readyReplicas || 0;
          if (ready < 2) return { ok: false, detail: `Ready 파드가 ${ready}개입니다 — 잠시 뒤 다시 채점하세요` };
          return true;
        }
      },
      {
        id: "endpoints",
        prompt: "서비스 `shop-svc` 에 엔드포인트가 하나도 붙지 않는다. 서비스를 고쳐 `shop` 파드가 붙게 하라.",
        hint: "`kubectl describe svc shop-svc -n prod` 의 Selector 와 `kubectl get pods -n prod --show-labels` 를 나란히 놓고 비교하라.",
        docs: "https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/",
        verify: (ctx) => {
          const ep = ctx.c.get("endpoints", "prod", "shop-svc");
          const count = ((ep || {}).subsets || []).reduce((n, s) => n + (s.addresses || []).length, 0);
          if (!count) return { ok: false, detail: "엔드포인트가 아직 비어 있습니다" };
          return true;
        }
      },
      {
        id: "crashlog",
        prompt: "파드 `api-7f9` 가 CrashLoopBackOff 다. **재시작 직전** 컨테이너 로그의 마지막 줄을 `/root/crash.txt` 에 저장하라.",
        hint: "지금 컨테이너가 아니라 이전 것을 봐야 한다. `kubectl logs api-7f9 -n prod --previous | tail -1 > /root/crash.txt`",
        docs: "https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/",
        verify: (ctx) => {
          const text = ctx.read("/root/crash.txt");
          if (text === null) return { ok: false, detail: "/root/crash.txt 가 없습니다" };
          if (!/FATAL: cannot connect to database/.test(text)) return { ok: false, detail: "직전 로그의 마지막 줄이 아닙니다" };
          if (text.trim().split("\n").length > 1) return { ok: false, detail: "마지막 한 줄만 저장하세요" };
          return true;
        }
      },
      {
        id: "pending",
        prompt: "파드 `batch` 가 Pending 에서 움직이지 않는다. 파드를 지우지 말고, 어느 노드에든 배치되게 하라.",
        hint: "`kubectl describe pod batch -n prod` 의 Events 를 보라. 파드가 요구하는 라벨을 노드에 붙여 주면 된다.",
        docs: "https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/",
        verify: (ctx) => {
          const pod = ctx.c.get("pods", "prod", "batch");
          if (!pod) return { ok: false, detail: "파드 batch 가 사라졌습니다 — 지우지 말고 고치세요" };
          if (!pod.spec.nodeName) return { ok: false, detail: "아직 어느 노드에도 배치되지 않았습니다" };
          return true;
        }
      },
      {
        id: "image-file",
        prompt: "디플로이먼트 `shop` 이 지금 쓰는 이미지 이름만 `/root/image.txt` 에 저장하라.",
        hint: "`kubectl get deploy shop -n prod -o jsonpath='{.spec.template.spec.containers[0].image}' > /root/image.txt`",
        docs: "https://kubernetes.io/docs/reference/kubectl/jsonpath/",
        verify: (ctx) => {
          const text = ctx.read("/root/image.txt");
          if (text === null) return { ok: false, detail: "/root/image.txt 가 없습니다" };
          if (text.trim() !== "nginx:1.25") return { ok: false, detail: `파일 내용이 "${text.trim()}" 입니다` };
          return true;
        }
      },
      {
        id: "drain",
        prompt: "`node01` 을 점검하려 한다. 데몬셋 파드는 무시하고 노드를 비워라.",
        hint: "`kubectl drain node01 --ignore-daemonsets --delete-emptydir-data`",
        docs: "https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/",
        verify: (ctx) => {
          const node = ctx.c.get("nodes", "-", "node01");
          if (!node || !(node.spec || {}).unschedulable) return { ok: false, detail: "node01 이 아직 스케줄 가능 상태입니다" };
          const left = ctx.c.list("pods", "*").filter((p) => p.spec.nodeName === "node01" &&
            !(p.metadata.ownerReferences || []).some((o) => o.kind === "DaemonSet"));
          if (left.length) return { ok: false, detail: `node01 에 아직 파드 ${left.length}개가 남아 있습니다` };
          return true;
        }
      }
    ]
  }
]);
