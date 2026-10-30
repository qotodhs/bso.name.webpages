window.addK8sLabs([
  {
    id: "workloads",
    exam: "cka",
    title: "워크로드와 스케줄링 — 테인트·톨러레이션·롤아웃",
    minutes: 20,
    intro: "`prod` 네임스페이스에 디플로이먼트 `web` 이 이미 떠 있습니다. 노드 `node02` 에는 `disk=ssd` 라벨이 붙어 있습니다.",
    seed(c) {
      c.add({ apiVersion: "v1", kind: "Namespace", metadata: { name: "prod" } });
      c.add(window.labHelpers.deployment("web", "prod", "nginx:1.25", 2));
      const node = c.get("nodes", "-", "node02");
      node.metadata.labels = Object.assign({}, node.metadata.labels, { disk: "ssd" });
    },
    solution: [
      "kubectl taint nodes node01 gpu=true:NoSchedule",
      { write: "/root/trainer.yaml", text: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: trainer\n  namespace: prod\nspec:\n  nodeSelector:\n    disk: ssd\n  tolerations:\n    - key: gpu\n      operator: Equal\n      value: \"true\"\n      effect: NoSchedule\n  containers:\n    - name: trainer\n      image: nginx:1.25\n" },
      "kubectl apply -f /root/trainer.yaml",
      "kubectl set image deployment/web web=nginx:1.27 -n prod",
      "kubectl scale deployment web --replicas=4 -n prod",
      "kubectl create cronjob report --image=busybox:1.36 --schedule=\"*/5 * * * *\" -n prod -- date",
      "kubectl rollout restart deployment/web -n prod"
    ],
    tasks: [
      {
        id: "taint",
        prompt: "`node01` 에 테인트 `gpu=true:NoSchedule` 을 걸어라.",
        hint: "`kubectl taint nodes node01 gpu=true:NoSchedule`",
        docs: "https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/",
        verify: (ctx) => {
          const taints = ((ctx.c.get("nodes", "-", "node01") || {}).spec || {}).taints || [];
          return taints.some((t) => t.key === "gpu" && String(t.value) === "true" && t.effect === "NoSchedule");
        }
      },
      {
        id: "toleration",
        prompt: "`prod` 에 파드 `trainer`(이미지 `nginx:1.25`)를 만들어라. `gpu` 테인트를 견디면서 `disk=ssd` 노드에만 배치되어야 한다.",
        hint: "톨러레이션만으로는 그 노드로 '가지' 않는다. nodeSelector 가 함께 필요하다. 매니페스트를 써서 apply 하라.",
        docs: "https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/",
        verify: (ctx) => {
          const pod = ctx.c.get("pods", "prod", "trainer");
          if (!pod) return { ok: false, detail: "파드 trainer 가 없습니다" };
          const tol = (pod.spec.tolerations || []).some((t) => t.key === "gpu");
          if (!tol) return { ok: false, detail: "gpu 테인트에 대한 톨러레이션이 없습니다" };
          if (((pod.spec.nodeSelector || {}).disk) !== "ssd") return { ok: false, detail: "nodeSelector disk=ssd 가 없습니다" };
          if (pod.spec.nodeName !== "node02") return { ok: false, detail: `아직 ${pod.spec.nodeName || "어느 노드에도"} 배치되지 않았습니다` };
          return true;
        }
      },
      {
        id: "image",
        prompt: "디플로이먼트 `web` 의 컨테이너 이미지를 `nginx:1.27` 로 바꿔 롤아웃하라.",
        hint: "`kubectl set image deployment/web web=nginx:1.27 -n prod`",
        docs: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
        verify: (ctx) => {
          const dep = ctx.c.get("deployments", "prod", "web");
          if (!dep) return { ok: false, detail: "디플로이먼트 web 이 없습니다" };
          const image = ((dep.spec.template.spec.containers || [])[0] || {}).image;
          if (image !== "nginx:1.27") return { ok: false, detail: `이미지가 ${image} 입니다` };
          return true;
        }
      },
      {
        id: "scale",
        prompt: "`web` 을 레플리카 4로 늘려라.",
        hint: "`kubectl scale deployment web --replicas=4 -n prod`",
        docs: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
        verify: (ctx) => {
          const dep = ctx.c.get("deployments", "prod", "web");
          return Boolean(dep && dep.spec.replicas === 4);
        }
      },
      {
        id: "cronjob",
        prompt: "`prod` 에 5분마다 `busybox:1.36` 으로 `date` 를 실행하는 크론잡 `report` 를 만들어라.",
        hint: "`kubectl create cronjob report --image=busybox:1.36 --schedule=\"*/5 * * * *\" -n prod -- date`",
        docs: "https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/",
        verify: (ctx) => {
          const cj = ctx.c.get("cronjobs", "prod", "report");
          if (!cj) return { ok: false, detail: "크론잡 report 가 없습니다" };
          if (String(cj.spec.schedule).replace(/\s+/g, " ").trim() !== "*/5 * * * *") return { ok: false, detail: `스케줄이 "${cj.spec.schedule}" 입니다` };
          return true;
        }
      },
      {
        id: "restart",
        prompt: "설정을 바꿨다고 가정하고 `web` 파드를 순차 재시작하라.",
        hint: "`kubectl rollout restart deployment/web -n prod`",
        docs: "https://kubernetes.io/docs/reference/kubectl/quick-reference/",
        verify: (ctx) => {
          const dep = ctx.c.get("deployments", "prod", "web");
          const ann = (((dep || {}).spec || {}).template || {}).metadata || {};
          return Boolean((ann.annotations || {})["kubectl.kubernetes.io/restartedAt"]);
        }
      }
    ]
  }
]);
