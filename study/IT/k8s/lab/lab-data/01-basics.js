window.addK8sLabs([
  {
    id: "basics",
    exam: "cka",
    title: "기본기 — 네임스페이스·파드·디플로이먼트·서비스",
    minutes: 20,
    intro: "처음 세 분은 세팅에 씁니다. `alias k=kubectl` 은 이미 걸려 있습니다. 과제를 하나씩 끝내고 왼쪽에서 채점하세요.",
    files: {},
    seed(c, h) {
      // 과제끼리 서로의 정답을 무너뜨리지 않도록, '지우기'와 '확장'은
      // dev 가 아니라 default 에 미리 둔 리소스로 분리했다.
      c.add(h.pod("legacy", "default", "nginx:1.25"));
      c.add(h.deployment("cache", "default", "redis:7", 1));
    },
    solution: [
      "kubectl create namespace dev",
      "kubectl run web --image=nginx:1.25 --labels=tier=frontend -n dev",
      "kubectl create deployment api --image=httpd:2.4 --replicas=3 -n dev",
      "kubectl expose deployment api --name=api-svc --port=80 --target-port=80 -n dev",
      "kubectl scale deployment cache --replicas=5",
      "kubectl get nodes -o json > /root/nodes.json",
      "kubectl get pods -n dev -o jsonpath='{range .items[*]}{.metadata.name}{\"\\n\"}{end}' > /root/pods.txt",
      "kubectl delete pod legacy"
    ],
    tasks: [
      {
        id: "ns",
        prompt: "네임스페이스 `dev` 를 만들어라.",
        hint: "`kubectl create namespace dev`",
        docs: "https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/",
        verify: (ctx) => Boolean(ctx.c.get("namespaces", "-", "dev"))
      },
      {
        id: "pod",
        prompt: "`dev` 에 파드 `web` 을 만들어라. 이미지 `nginx:1.25`, 라벨 `tier=frontend`.",
        hint: "`kubectl run web --image=nginx:1.25 --labels=tier=frontend -n dev`",
        docs: "https://kubernetes.io/docs/reference/kubectl/quick-reference/",
        verify: (ctx) => {
          const pod = ctx.c.get("pods", "dev", "web");
          if (!pod) return { ok: false, detail: "dev 네임스페이스에 web 파드가 없습니다" };
          if ((pod.spec.containers[0] || {}).image !== "nginx:1.25") return { ok: false, detail: `이미지가 ${pod.spec.containers[0].image} 입니다` };
          if ((pod.metadata.labels || {}).tier !== "frontend") return { ok: false, detail: "라벨 tier=frontend 가 없습니다" };
          return true;
        }
      },
      {
        id: "deploy",
        prompt: "`dev` 에 디플로이먼트 `api` 를 만들어라. 이미지 `httpd:2.4`, 레플리카 3.",
        hint: "`kubectl create deployment api --image=httpd:2.4 --replicas=3 -n dev`",
        docs: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
        verify: (ctx) => {
          const dep = ctx.c.get("deployments", "dev", "api");
          if (!dep) return { ok: false, detail: "디플로이먼트 api 가 없습니다" };
          if (dep.spec.replicas !== 3) return { ok: false, detail: `레플리카가 ${dep.spec.replicas} 입니다` };
          const image = ((dep.spec.template.spec.containers || [])[0] || {}).image;
          if (image !== "httpd:2.4") return { ok: false, detail: `이미지가 ${image} 입니다` };
          return true;
        }
      },
      {
        id: "expose",
        prompt: "디플로이먼트 `api` 를 클러스터 내부 80 포트로 노출하라. 서비스 이름은 `api-svc`, 컨테이너 포트도 80.",
        hint: "`kubectl expose deployment api --name=api-svc --port=80 --target-port=80 -n dev`",
        docs: "https://kubernetes.io/docs/concepts/services-networking/service/",
        verify: (ctx) => {
          const svc = ctx.c.get("services", "dev", "api-svc");
          if (!svc) return { ok: false, detail: "서비스 api-svc 가 없습니다" };
          const port = (svc.spec.ports || [])[0] || {};
          if (Number(port.port) !== 80) return { ok: false, detail: `서비스 포트가 ${port.port} 입니다` };
          const ep = ctx.c.get("endpoints", "dev", "api-svc");
          const count = ((ep || {}).subsets || []).reduce((n, s) => n + (s.addresses || []).length, 0);
          if (!count) return { ok: false, detail: "엔드포인트가 비었습니다 — selector 가 파드 라벨과 맞는지 보세요" };
          return true;
        }
      },
      {
        id: "scale",
        prompt: "`default` 네임스페이스의 디플로이먼트 `cache` 를 레플리카 5로 늘리고, 파드 5개가 모두 Ready 가 되게 하라.",
        hint: "`kubectl scale deployment cache --replicas=5` 뒤 `kubectl get pods` 로 확인",
        docs: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
        verify: (ctx) => {
          const dep = ctx.c.get("deployments", "default", "cache");
          if (!dep || dep.spec.replicas !== 5) return { ok: false, detail: "cache 의 레플리카가 5가 아닙니다" };
          const ready = (dep.status || {}).readyReplicas || 0;
          if (ready < 5) return { ok: false, detail: `Ready 파드가 ${ready}개입니다 — 잠시 기다렸다 다시 채점하세요` };
          return true;
        }
      },
      {
        id: "nodes-json",
        prompt: "클러스터 모든 노드 정보를 JSON 형식으로 `/root/nodes.json` 에 저장하라.",
        hint: "`kubectl get nodes -o json > /root/nodes.json`",
        docs: "https://kubernetes.io/docs/reference/kubectl/quick-reference/",
        verify: (ctx) => {
          const text = ctx.read("/root/nodes.json");
          if (text === null) return { ok: false, detail: "/root/nodes.json 이 없습니다" };
          try {
            const data = JSON.parse(text);
            const items = data.items || (data.kind === "Node" ? [data] : []);
            if (items.length < 3) return { ok: false, detail: `노드가 ${items.length}개만 들어 있습니다` };
            return true;
          } catch (e) { return { ok: false, detail: "JSON 으로 읽히지 않습니다" }; }
        }
      },
      {
        id: "names",
        prompt: "`dev` 네임스페이스 파드의 **이름만** 한 줄씩 `/root/pods.txt` 에 저장하라.",
        hint: "`kubectl get pods -n dev -o jsonpath='{range .items[*]}{.metadata.name}{\"\\n\"}{end}' > /root/pods.txt`",
        docs: "https://kubernetes.io/docs/reference/kubectl/jsonpath/",
        verify: (ctx) => {
          const text = ctx.read("/root/pods.txt");
          if (text === null) return { ok: false, detail: "/root/pods.txt 가 없습니다" };
          const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
          if (!lines.length) return { ok: false, detail: "파일이 비었습니다" };
          if (lines.some((l) => /\s/.test(l))) return { ok: false, detail: "이름 말고 다른 열까지 들어 있습니다" };
          const names = ctx.c.list("pods", "dev").map((p) => p.metadata.name);
          if (!lines.every((l) => names.includes(l.replace(/^pod\//, "")))) return { ok: false, detail: "현재 파드 이름과 맞지 않습니다" };
          return true;
        }
      },
      {
        id: "delete",
        prompt: "`default` 네임스페이스에 남아 있는 파드 `legacy` 를 지워라.",
        hint: "`kubectl delete pod legacy`",
        docs: "https://kubernetes.io/docs/reference/kubectl/quick-reference/",
        verify: (ctx) => Boolean(!ctx.c.get("pods", "default", "legacy")) || { ok: false, detail: "파드 legacy 가 아직 있습니다" }
      }
    ]
  }
]);
