// 워크로드 · 스케줄링 (CKA 15%) / 애플리케이션 배포 (CKAD 20%)
window.addK8sTasks("workloads", [
  {
    id: "wl-deploy-create",
    areas: { cka: "workloads", ckad: "deploy" },
    level: 1,
    title: "디플로이먼트 만들기",
    prompt: "`prod` 네임스페이스에 이미지 `nginx:1.25`, 레플리카 3인 디플로이먼트 `web` 을 만들어라.",
    type: "command",
    answer: "kubectl create deployment web --image=nginx:1.25 --replicas=3 -n prod",
    match: { argv: ["kubectl", "create", "deployment", "web"], flags: { image: "nginx:1.25", replicas: "3", namespace: "prod" } },
    hint: "`kubectl run` 은 파드 하나를, `create deployment` 는 디플로이먼트를 만든다.",
    explain:
      "`run` 과 `create deployment` 를 가르는 기준은 '관리 주체가 필요한가'다. 파드 하나면 run, 레플리카·롤아웃이 필요하면 create deployment. 명령형으로 만들 수 없는 필드(볼륨·프로브 등)가 있으면 `--dry-run=client -o yaml > d.yaml` 로 뽑아 고친 뒤 apply 하는 것이 시험장에서 가장 빠르다.",
    docs: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/"
  },
  {
    id: "wl-scale",
    areas: { cka: "workloads", ckad: "deploy" },
    level: 1,
    title: "레플리카 수 바꾸기",
    prompt: "`prod` 의 디플로이먼트 `web` 을 레플리카 5로 늘려라.",
    type: "command",
    answer: "kubectl scale deployment web --replicas=5 -n prod",
    match: { argv: ["kubectl", "scale", "deployments", "web"], flags: { replicas: "5", namespace: "prod" } },
    hint: "`scale` 은 디플로이먼트·레플리카셋·스테이트풀셋에 쓴다.",
    explain:
      "HPA 가 붙어 있는 디플로이먼트를 수동 scale 하면 곧바로 HPA 가 되돌린다. 그래서 스케일 문항에서 값이 유지되지 않으면 `kubectl get hpa -n prod` 를 먼저 본다.",
    docs: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/"
  },
  {
    id: "wl-set-image",
    areas: { cka: "workloads", ckad: "deploy" },
    level: 2,
    title: "이미지 교체로 롤아웃",
    prompt: "`prod` 의 디플로이먼트 `web` 의 컨테이너 `nginx` 이미지를 `nginx:1.27` 로 바꿔 롤아웃을 일으켜라.",
    type: "command",
    answer: "kubectl set image deployment/web nginx=nginx:1.27 -n prod",
    match: { argv: ["kubectl", "set", "image", "deployments", "web", "nginx=nginx:1.27"], flags: { namespace: "prod" } },
    hint: "값은 `컨테이너이름=이미지` 형식이다.",
    explain:
      "`set image` 는 파드 템플릿을 바꾸므로 새 리비전이 생기고 롤링 업데이트가 시작된다. 반대로 레플리카 수만 바꾸는 `scale` 은 리비전을 만들지 않는다 — 이 차이가 롤백 문항의 핵심이다. 컨테이너 이름을 모르면 `kubectl get deploy web -n prod -o jsonpath='{.spec.template.spec.containers[*].name}'`.",
    docs: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/"
  },
  {
    id: "wl-rollout-status",
    areas: { cka: "workloads", ckad: "deploy" },
    level: 1,
    title: "롤아웃 진행 확인",
    prompt: "`prod` 의 디플로이먼트 `web` 의 롤아웃이 끝났는지 확인하라.",
    type: "command",
    answer: "kubectl rollout status deployment/web -n prod",
    match: { argv: ["kubectl", "rollout", "status", "deployments", "web"], flags: { namespace: "prod" } },
    hint: "`rollout` 하위 명령이다.",
    explain:
      "`rollout status` 는 완료될 때까지 블로킹되므로 롤아웃이 멈춰 있으면 그대로 걸려 있다. 그때가 곧 진단 시점이다 — `kubectl get pods` 로 새 파드가 ImagePullBackOff 인지 보고, 되돌릴 거면 `rollout undo`.",
    docs: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/"
  },
  {
    id: "wl-rollout-undo",
    areas: { cka: "workloads", ckad: "deploy" },
    level: 2,
    title: "이전 리비전으로 되돌리기",
    prompt: "`prod` 의 디플로이먼트 `web` 을 리비전 2 로 되돌려라.",
    type: "command",
    answer: "kubectl rollout undo deployment/web --to-revision=2 -n prod",
    match: { argv: ["kubectl", "rollout", "undo", "deployments", "web"], flags: { "to-revision": "2", namespace: "prod" } },
    hint: "리비전을 지정하지 않으면 바로 직전으로 돌아간다.",
    explain:
      "리비전 목록은 `kubectl rollout history deployment/web -n prod`, 특정 리비전의 내용은 `--revision=2` 를 붙여 본다. 되돌린 결과도 새 리비전 번호를 받는다는 점을 기억한다. 리비전 보관 개수는 `spec.revisionHistoryLimit`(기본 10)이다.",
    docs: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/"
  },
  {
    id: "wl-autoscale",
    areas: { cka: "workloads", ckad: "deploy" },
    level: 2,
    title: "오토스케일러 붙이기",
    prompt: "`prod` 의 디플로이먼트 `web` 에 CPU 70 % 기준, 최소 2 최대 10 인 HPA 를 붙여라.",
    type: "command",
    answer: "kubectl autoscale deployment web --cpu-percent=70 --min=2 --max=10 -n prod",
    match: { argv: ["kubectl", "autoscale", "deployments", "web"], flags: { "cpu-percent": "70", min: "2", max: "10", namespace: "prod" } },
    hint: "전용 동사가 있다. `create hpa` 가 아니다.",
    explain:
      "HPA 가 동작하려면 ①metrics-server 가 떠 있고 ②파드에 CPU `requests` 가 정의돼 있어야 한다. 목표 사용률은 requests 대비 비율이라 requests 가 없으면 HPA 는 `<unknown>` 을 띄우고 아무 일도 하지 않는다 — 이것이 HPA 문항의 단골 함정이다.",
    docs: "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/"
  },
  {
    id: "wl-taint",
    areas: { cka: "workloads" },
    level: 2,
    title: "노드에 테인트 걸기",
    prompt: "`node01` 에 `gpu=true:NoSchedule` 테인트를 걸어 일반 파드가 배치되지 않게 하라.",
    type: "command",
    answer: "kubectl taint nodes node01 gpu=true:NoSchedule",
    match: { argv: ["kubectl", "taint", "nodes", "node01", "gpu=true:NoSchedule"] },
    hint: "값 형식은 `키=값:효과` 다.",
    explain:
      "테인트는 노드가 거는 거절, 톨러레이션은 파드가 내미는 통행증이다. 효과 셋의 기준은 '언제 작용하는가' — NoSchedule 은 새 파드만, PreferNoSchedule 은 가능하면 피함, NoExecute 는 이미 떠 있는 파드까지 쫓아낸다. 테인트를 지울 때는 끝에 빼기를 붙여 `kubectl taint nodes node01 gpu=true:NoSchedule-`.",
    docs: "https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/"
  },
  {
    id: "wl-toleration-manifest",
    areas: { cka: "workloads", ckad: "design" },
    level: 3,
    title: "테인트를 견디고 GPU 노드로",
    prompt:
      "`gpu=true:NoSchedule` 테인트가 걸린 노드에서만 뜨도록 파드 `trainer` 를 작성하라. 이미지는 `nginx:1.25`, 노드 라벨 `accelerator=gpu` 도 함께 요구한다.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: trainer\nspec:\n  containers:\n    - name: trainer\n      image: nginx:1.25\n",
    checks: [
      { label: "톨러레이션 키", path: "spec.tolerations[0].key", equals: "gpu" },
      { label: "톨러레이션 값", path: "spec.tolerations[0].value", equals: "true" },
      { label: "효과 NoSchedule", path: "spec.tolerations[0].effect", equals: "NoSchedule" },
      { label: "operator 는 Equal", path: "spec.tolerations[0].operator", oneOf: ["Equal"] },
      { label: "nodeSelector accelerator=gpu", path: "spec.nodeSelector.accelerator", equals: "gpu" }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: trainer\nspec:\n  nodeSelector:\n    accelerator: gpu\n  tolerations:\n    - key: gpu\n      operator: Equal\n      value: \"true\"\n      effect: NoSchedule\n  containers:\n    - name: trainer\n      image: nginx:1.25\n",
    hint: "톨러레이션만으로는 그 노드로 '가지' 않는다. 배치를 강제하는 필드가 따로 필요하다.",
    explain:
      "톨러레이션은 '갈 수 있다'일 뿐 '거기로 간다'가 아니다. 특정 노드로 보내려면 nodeSelector 나 nodeAffinity 가 함께 있어야 한다 — 이 한 줄이 두 개념을 가르는 기준이다. `value: \"true\"` 는 반드시 문자열로 따옴표를 씌운다. 불리언 true 로 파싱되면 매칭에 실패한다.",
    docs: "https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/"
  },
  {
    id: "wl-daemonset",
    areas: { cka: "workloads" },
    level: 3,
    title: "데몬셋 작성",
    prompt: "모든 노드에 로그 수집기를 하나씩 띄우는 데몬셋 `log-agent` 를 `kube-system` 에 작성하라. 이미지는 `fluentd:v1.16`.",
    type: "manifest",
    starter: "apiVersion: apps/v1\nkind: \nmetadata:\n  name: log-agent\n  namespace: kube-system\nspec:\n",
    checks: [
      { label: "kind 가 DaemonSet", path: "kind", equals: "DaemonSet" },
      { label: "apiVersion apps/v1", path: "apiVersion", equals: "apps/v1" },
      { label: "selector 라벨", path: "spec.selector.matchLabels.name", exists: true },
      { label: "템플릿 라벨이 selector 와 일치", path: "spec.template.metadata.labels.name", exists: true },
      { label: "이미지", path: "spec.template.spec.containers[0].image", equals: "fluentd:v1.16" }
    ],
    answer:
      "apiVersion: apps/v1\nkind: DaemonSet\nmetadata:\n  name: log-agent\n  namespace: kube-system\nspec:\n  selector:\n    matchLabels:\n      name: log-agent\n  template:\n    metadata:\n      labels:\n        name: log-agent\n    spec:\n      containers:\n        - name: fluentd\n          image: fluentd:v1.16\n",
    hint: "데몬셋에는 `replicas` 가 없다. 대신 selector 와 template 라벨이 반드시 같아야 한다.",
    explain:
      "`kubectl create daemonset` 은 없다. 디플로이먼트를 `--dry-run=client -o yaml` 로 뽑아 kind 를 DaemonSet 으로 바꾸고 `replicas`·`strategy` 를 지우는 것이 실전 요령이다. selector 와 템플릿 라벨이 어긋나면 `selector does not match template labels` 로 거부된다.",
    docs: "https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/"
  },
  {
    id: "wl-cronjob",
    areas: { cka: "workloads", ckad: "design" },
    level: 2,
    title: "크론잡 만들기",
    prompt: "5분마다 `busybox:1.36` 로 `date` 를 실행하는 크론잡 `report` 를 `dev` 에 만들어라.",
    type: "command",
    answer: "kubectl create cronjob report --image=busybox:1.36 --schedule=\"*/5 * * * *\" -n dev -- date",
    match: {
      argv: ["kubectl", "create", "cronjob", "report"],
      flags: { image: "busybox:1.36", schedule: "*/5 * * * *", namespace: "dev" },
      command: ["date"]
    },
    hint: "스케줄에는 공백이 있으니 따옴표로 묶는다. 실행할 명령은 `--` 뒤에 쓴다.",
    explain:
      "크론잡은 잡을 만들고, 잡은 파드를 만든다. 그래서 실패를 볼 때는 `kubectl get jobs -n dev` → `kubectl get pods -n dev` 순으로 한 단계씩 내려간다. `restartPolicy` 는 Never 또는 OnFailure 만 허용되고 Always 는 거부된다.",
    docs: "https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/"
  },
  {
    id: "wl-job-manifest",
    areas: { ckad: "design", cka: "workloads" },
    level: 2,
    title: "잡의 완료 조건 지정",
    prompt:
      "총 6번 성공해야 끝나고 한 번에 2개씩 병렬로 도는 잡 `batch` 를 작성하라. 이미지는 `busybox:1.36`, 명령은 `sleep 5`, 실패 재시도는 4회까지.",
    type: "manifest",
    starter: "apiVersion: batch/v1\nkind: Job\nmetadata:\n  name: batch\nspec:\n  template:\n    spec:\n      containers:\n        - name: worker\n          image: busybox:1.36\n          command: [\"sleep\", \"5\"]\n",
    checks: [
      { label: "completions 6", path: "spec.completions", equals: 6 },
      { label: "parallelism 2", path: "spec.parallelism", equals: 2 },
      { label: "backoffLimit 4", path: "spec.backoffLimit", equals: 4 },
      { label: "restartPolicy 는 Never 또는 OnFailure", path: "spec.template.spec.restartPolicy", oneOf: ["Never", "OnFailure"] },
      { label: "이미지", path: "spec.template.spec.containers[0].image", equals: "busybox:1.36" }
    ],
    answer:
      "apiVersion: batch/v1\nkind: Job\nmetadata:\n  name: batch\nspec:\n  completions: 6\n  parallelism: 2\n  backoffLimit: 4\n  template:\n    spec:\n      restartPolicy: Never\n      containers:\n        - name: worker\n          image: busybox:1.36\n          command: [\"sleep\", \"5\"]\n",
    hint: "세 숫자는 모두 `spec` 바로 아래, `restartPolicy` 는 파드 템플릿 안이다.",
    explain:
      "completions 는 '몇 번 성공해야 끝인가', parallelism 은 '동시에 몇 개인가', backoffLimit 은 '몇 번까지 재시도하는가'다. 위치를 헷갈리기 쉬운데 앞의 셋은 Job spec, restartPolicy 는 파드 spec 이다. Job 의 파드에 Always 를 쓰면 생성 자체가 거부된다.",
    docs: "https://kubernetes.io/docs/concepts/workloads/controllers/job/"
  },
  {
    id: "wl-pdb",
    areas: { cka: "workloads" },
    level: 3,
    title: "중단 예산 걸기",
    prompt: "라벨 `app=web` 인 파드가 항상 최소 2개는 살아 있도록 PodDisruptionBudget `web-pdb` 를 `prod` 에 작성하라.",
    type: "manifest",
    starter: "apiVersion: policy/v1\nkind: PodDisruptionBudget\nmetadata:\n  name: web-pdb\n  namespace: prod\nspec:\n",
    checks: [
      { label: "minAvailable 2", path: "spec.minAvailable", equals: 2 },
      { label: "selector app=web", path: "spec.selector.matchLabels.app", equals: "web" },
      { label: "apiVersion policy/v1", path: "apiVersion", equals: "policy/v1" }
    ],
    answer:
      "apiVersion: policy/v1\nkind: PodDisruptionBudget\nmetadata:\n  name: web-pdb\n  namespace: prod\nspec:\n  minAvailable: 2\n  selector:\n    matchLabels:\n      app: web\n",
    hint: "`minAvailable` 과 `maxUnavailable` 중 하나만 쓴다.",
    explain:
      "PDB 는 자발적 중단(drain·노드 업그레이드)만 막는다. 노드가 갑자기 죽는 비자발적 중단은 막지 못한다 — 이 구분이 출제 포인트다. drain 이 끝나지 않고 멈춰 있으면 대개 PDB 가 걸려 있는 것이므로 `kubectl get pdb -A` 를 본다.",
    docs: "https://kubernetes.io/docs/tasks/run-application/configure-pdb/"
  }
]);
