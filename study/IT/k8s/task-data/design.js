// 애플리케이션 설계 · 빌드 (CKAD 20%) — 파드 · 멀티컨테이너 · 라벨
window.addK8sTasks("design", [
  {
    id: "ds-run-pod",
    areas: { ckad: "design", cka: "workloads" },
    level: 1,
    title: "파드 하나 띄우기",
    prompt: "`dev` 에 이미지 `nginx:1.25`, 컨테이너 포트 80 인 파드 `web` 을 만들어라.",
    type: "command",
    answer: "kubectl run web --image=nginx:1.25 --port=80 -n dev",
    match: { argv: ["kubectl", "run", "web"], flags: { image: "nginx:1.25", port: "80", namespace: "dev" } },
    hint: "`run` 은 파드를 만드는 명령이다.",
    explain:
      "`--port` 는 컨테이너 포트를 적어 둘 뿐 방화벽을 여는 것이 아니다. 라벨을 붙이려면 `-l app=web`, 환경변수는 `--env=KEY=값`, 명령은 `-- 명령 인자` 로 준다. 시험에서는 이 한 줄에 `--dry-run=client -o yaml > pod.yaml` 을 붙여 뼈대를 뽑는 쓰임이 더 많다.",
    docs: "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
  },
  {
    id: "ds-dry-run",
    areas: { ckad: "design", cka: "workloads" },
    level: 1,
    title: "매니페스트 뼈대 뽑기",
    prompt: "이미지 `nginx:1.25` 인 파드 `web` 의 매니페스트를 만들되, 클러스터에 만들지는 말고 `pod.yaml` 로 저장하라.",
    type: "command",
    answer: "kubectl run web --image=nginx:1.25 --dry-run=client -o yaml > pod.yaml",
    match: { argv: ["kubectl", "run", "web"], flags: { image: "nginx:1.25", "dry-run": "client", output: "yaml" }, redirect: "pod.yaml" },
    hint: "만들지 않고 결과만 보는 플래그와 출력 형식을 함께 준다.",
    explain:
      "이 조합이 시험 전체를 관통하는 기본기다. `--dry-run=client` 는 서버에 보내지 않고 로컬에서 객체만 만들어 보여 주고, `--dry-run=server` 는 서버가 검증까지 하되 저장하지 않는다. 명령형으로 못 만드는 필드(볼륨·프로브·톨러레이션)는 전부 이 방식으로 뼈대를 뽑아 채운다.",
    docs: "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
  },
  {
    id: "ds-labels",
    areas: { ckad: "design", cka: "workloads" },
    level: 1,
    title: "라벨로 골라내기",
    prompt: "`dev` 네임스페이스에서 라벨이 `app=web` 이면서 `tier=front` 인 파드만 나열하라.",
    type: "command",
    answer: "kubectl get pods -l app=web,tier=front -n dev",
    match: { argv: ["kubectl", "get", "pods"], flags: { selector: "app=web,tier=front", namespace: "dev" } },
    hint: "셀렉터를 쉼표로 이으면 AND 다.",
    explain:
      "쉼표는 AND 이고 OR 는 `-l 'env in (dev,stage)'` 처럼 집합 표기로 쓴다. 없음 조건은 `-l '!tier'`, 부등은 `-l tier!=front`. 라벨을 바꿀 때는 `kubectl label pod web tier=back --overwrite`, 지울 때는 `kubectl label pod web tier-`.",
    docs: "https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/"
  },
  {
    id: "ds-init-container",
    areas: { ckad: "design" },
    level: 2,
    title: "초기화 컨테이너",
    prompt:
      "파드 `app`(메인 이미지 `nginx:1.25`)이 뜨기 전에 `busybox:1.36` 으로 `/work/init.done` 파일을 만들게 하라. 두 컨테이너는 `/work` 를 공유한다.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: app\nspec:\n  containers:\n    - name: app\n      image: nginx:1.25\n",
    checks: [
      { label: "initContainers 존재", path: "spec.initContainers[0].image", equals: "busybox:1.36" },
      { label: "초기화 컨테이너가 볼륨 마운트", path: "spec.initContainers[0].volumeMounts[0].mountPath", equals: "/work" },
      { label: "메인 컨테이너도 같은 볼륨", path: "spec.containers[0].volumeMounts[0].mountPath", equals: "/work" },
      { label: "공유 볼륨 정의", path: "spec.volumes[0].name", exists: true }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: app\nspec:\n  volumes:\n    - name: work\n      emptyDir: {}\n  initContainers:\n    - name: setup\n      image: busybox:1.36\n      command: [\"sh\", \"-c\", \"touch /work/init.done\"]\n      volumeMounts:\n        - name: work\n          mountPath: /work\n  containers:\n    - name: app\n      image: nginx:1.25\n      volumeMounts:\n        - name: work\n          mountPath: /work\n",
    hint: "`initContainers` 는 `containers` 와 같은 높이에 온다.",
    explain:
      "초기화 컨테이너는 순서대로 하나씩 돌고 모두 성공해야 메인 컨테이너가 시작된다. 실패하면 파드는 `Init:CrashLoopBackOff` 로 남고, 로그는 `kubectl logs app -c setup` 처럼 이름을 지정해야 보인다. '먼저 무엇을 준비한 다음'이라는 지시가 곧 초기화 컨테이너다.",
    docs: "https://kubernetes.io/docs/concepts/workloads/pods/init-containers/"
  },
  {
    id: "ds-sidecar",
    areas: { ckad: "design" },
    level: 3,
    title: "로그 사이드카",
    prompt:
      "파드 `app` 의 메인 컨테이너(`nginx:1.25`)가 `/var/log/app` 에 남기는 로그를, 사이드카 `logger`(`busybox:1.36`)가 같은 경로에서 tail 하도록 작성하라.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: app\nspec:\n  containers:\n",
    checks: [
      { label: "컨테이너 두 개", path: "spec.containers[1].name", exists: true },
      { label: "사이드카 이름 logger", path: "spec.containers[name=logger].image", equals: "busybox:1.36" },
      { label: "공유 볼륨", path: "spec.volumes[0].emptyDir", exists: true },
      { label: "사이드카 마운트 경로", path: "spec.containers[name=logger].volumeMounts[0].mountPath", equals: "/var/log/app" }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: app\nspec:\n  volumes:\n    - name: logs\n      emptyDir: {}\n  containers:\n    - name: app\n      image: nginx:1.25\n      volumeMounts:\n        - name: logs\n          mountPath: /var/log/app\n    - name: logger\n      image: busybox:1.36\n      command: [\"sh\", \"-c\", \"tail -f /var/log/app/access.log\"]\n      volumeMounts:\n        - name: logs\n          mountPath: /var/log/app\n",
    hint: "두 컨테이너가 같은 emptyDir 를 같은 경로에 마운트한다.",
    explain:
      "멀티컨테이너 패턴 셋은 역할로 갈린다 — 사이드카(보조 기능을 옆에 붙임), 앰배서더(외부 연결을 대신 맺어 줌), 어댑터(출력 형식을 바꿔 줌). 같은 파드의 컨테이너는 네트워크 네임스페이스를 공유하므로 서로 `localhost` 로 부른다.",
    docs: "https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/"
  },
  {
    id: "ds-delete-force",
    areas: { ckad: "deploy", cka: "workloads" },
    level: 2,
    title: "파드를 즉시 지우기",
    prompt: "`dev` 의 파드 `stuck` 을 유예 시간 없이 즉시 삭제하라.",
    type: "command",
    answer: "kubectl delete pod stuck -n dev --grace-period=0 --force",
    match: { argv: ["kubectl", "delete", "pods", "stuck"], flags: { "grace-period": "0", force: true, namespace: "dev" } },
    hint: "유예 시간을 0으로 두고 강제 플래그를 함께 준다.",
    explain:
      "기본 유예는 30초라 문항을 빠르게 넘길 때 시간을 잡아먹는다. 다만 강제 삭제는 API 객체만 지우고 노드의 컨테이너 정리를 기다리지 않으므로, 스테이트풀셋처럼 이름이 겹치면 안 되는 워크로드에서는 조심한다. Terminating 에서 멈춘 파드의 원인은 대개 finalizer 다.",
    docs: "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
  },
  {
    id: "ds-annotate",
    areas: { ckad: "design" },
    level: 1,
    title: "주석 달기",
    prompt: "`dev` 의 디플로이먼트 `web` 에 `owner=platform` 주석을 붙여라.",
    type: "command",
    answer: "kubectl annotate deployment web owner=platform -n dev",
    match: { argv: ["kubectl", "annotate", "deployments", "web", "owner=platform"], flags: { namespace: "dev" } },
    hint: "라벨과 문법이 같다.",
    explain:
      "라벨은 셀렉터로 고르기 위한 것이고 주석은 고를 수 없는 부가 정보다. 그래서 '이걸로 파드를 선택해야 한다'면 라벨, '설명·연락처·도구가 읽을 메타데이터'면 주석이다. 길이 제한과 문자 제약도 라벨이 훨씬 엄격하다.",
    docs: "https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/"
  }
]);
