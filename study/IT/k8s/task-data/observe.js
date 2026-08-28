// 관측 가능성 · 유지보수 (CKAD 15%) — 프로브 · 로그 · exec · 리소스 사용량
window.addK8sTasks("observe", [
  {
    id: "ob-liveness-http",
    areas: { ckad: "observe", cka: "workloads" },
    level: 2,
    title: "liveness 프로브 붙이기",
    prompt:
      "파드 `web`(이미지 `nginx:1.25`)에 HTTP `/healthz` 8080 포트를 15초 후부터 10초 간격으로 검사하는 liveness 프로브를 넣어라.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: web\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25\n",
    checks: [
      { label: "httpGet 경로 /healthz", path: "spec.containers[0].livenessProbe.httpGet.path", equals: "/healthz" },
      { label: "포트 8080", path: "spec.containers[0].livenessProbe.httpGet.port", equals: 8080 },
      { label: "initialDelaySeconds 15", path: "spec.containers[0].livenessProbe.initialDelaySeconds", equals: 15 },
      { label: "periodSeconds 10", path: "spec.containers[0].livenessProbe.periodSeconds", equals: 10 }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: web\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25\n      livenessProbe:\n        httpGet:\n          path: /healthz\n          port: 8080\n        initialDelaySeconds: 15\n        periodSeconds: 10\n",
    hint: "프로브는 컨테이너 안에 들어간다. 파드 spec 이 아니다.",
    explain:
      "세 프로브는 실패했을 때 무슨 일이 벌어지는가로 갈린다 — liveness 실패는 컨테이너 재시작, readiness 실패는 서비스 엔드포인트에서 제외(재시작은 없음), startup 실패는 기동 실패로 간주해 재시작. 느리게 뜨는 앱에 liveness 의 initialDelay 를 늘리는 대신 startupProbe 를 쓰는 것이 정석이다.",
    docs: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/"
  },
  {
    id: "ob-readiness-exec",
    areas: { ckad: "observe" },
    level: 2,
    title: "명령으로 readiness 검사",
    prompt:
      "파드 `worker`(이미지 `busybox:1.36`)가 `/tmp/ready` 파일이 생겨야 트래픽을 받도록 readiness 프로브를 넣어라. 5초 간격.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: worker\nspec:\n  containers:\n    - name: worker\n      image: busybox:1.36\n      command: [\"sh\", \"-c\", \"sleep 30; touch /tmp/ready; sleep 3600\"]\n",
    checks: [
      { label: "exec 프로브", path: "spec.containers[0].readinessProbe.exec.command", exists: true },
      { label: "검사 명령에 /tmp/ready", path: "spec.containers[0].readinessProbe.exec.command", contains: "/tmp/ready" },
      { label: "periodSeconds 5", path: "spec.containers[0].readinessProbe.periodSeconds", equals: 5 }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: worker\nspec:\n  containers:\n    - name: worker\n      image: busybox:1.36\n      command: [\"sh\", \"-c\", \"sleep 30; touch /tmp/ready; sleep 3600\"]\n      readinessProbe:\n        exec:\n          command: [\"cat\", \"/tmp/ready\"]\n        periodSeconds: 5\n",
    hint: "`exec.command` 는 문자열이 아니라 리스트다. 종료 코드 0 이면 통과.",
    explain:
      "exec 프로브는 명령의 종료 코드로 판정한다. `cat /tmp/ready` 는 파일이 없으면 0 이 아니므로 그대로 판정에 쓸 수 있다. readiness 가 실패하는 동안 파드는 Running 이지만 서비스 엔드포인트에서 빠진다 — '파드는 떠 있는데 서비스로 접속이 안 된다'의 흔한 정답이다.",
    docs: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/"
  },
  {
    id: "ob-logs-container",
    areas: { ckad: "observe", cka: "troubleshoot" },
    level: 1,
    title: "사이드카 컨테이너의 로그",
    prompt: "`dev` 의 파드 `app` 안에 있는 컨테이너 `sidecar` 의 로그를 보라.",
    type: "command",
    answer: "kubectl logs app -c sidecar -n dev",
    match: { argv: ["kubectl", "logs", "app"], flags: { container: "sidecar", namespace: "dev" } },
    hint: "컨테이너를 고르는 짧은 플래그가 있다.",
    explain:
      "컨테이너가 둘 이상인 파드에서 `-c` 를 빠뜨리면 kubectl 이 컨테이너 이름 목록을 보여주며 거부한다. 모든 컨테이너를 한꺼번에 보려면 `--all-containers=true`, 라벨로 여러 파드를 묶어 볼 때는 `kubectl logs -l app=web --tail=20`.",
    docs: "https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/"
  },
  {
    id: "ob-exec",
    areas: { ckad: "observe", cka: "troubleshoot" },
    level: 1,
    title: "컨테이너 안에서 명령 실행",
    prompt: "`dev` 의 파드 `app` 안에서 셸을 열어라.",
    type: "command",
    answer: "kubectl exec -it app -n dev -- /bin/sh",
    match: { argv: ["kubectl", "exec", "app"], flags: { stdin: true, tty: true, namespace: "dev" }, command: ["/bin/sh"], labels: { stdin: "`-i` (표준입력 연결)", tty: "`-t` (터미널 할당)" } },
    hint: "실행할 명령 앞에는 `--` 가 온다.",
    explain:
      "`--` 를 빠뜨리면 뒤의 인자를 kubectl 이 자기 플래그로 해석한다. 한 번만 실행할 때는 `-it` 없이 `kubectl exec app -n dev -- ls /etc` 로 충분하다. 셸이 없는 이미지(distroless)에서는 `kubectl debug -it app --image=busybox --target=app` 으로 임시 컨테이너를 붙인다.",
    docs: "https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/"
  },
  {
    id: "ob-top",
    areas: { ckad: "observe", cka: "troubleshoot" },
    level: 2,
    title: "가장 많이 먹는 파드 찾기",
    prompt: "`dev` 네임스페이스에서 CPU 사용량이 큰 순서로 파드를 나열하라.",
    type: "command",
    answer: "kubectl top pod -n dev --sort-by=cpu",
    match: { argv: ["kubectl", "top", "pods"], flags: { namespace: "dev", "sort-by": "cpu" } },
    hint: "`top` 은 `get` 과 달리 metrics-server 가 필요하다.",
    explain:
      "`error: Metrics API not available` 이 나오면 metrics-server 가 없는 것이지 명령이 틀린 게 아니다. 컨테이너 단위로 쪼개 보려면 `--containers`, 노드 쪽은 `kubectl top node`. 여기서 얻는 값이 HPA 가 보는 값과 같다.",
    docs: "https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/"
  },
  {
    id: "ob-jsonpath",
    areas: { ckad: "observe", cka: "troubleshoot" },
    level: 3,
    title: "필요한 필드만 뽑기",
    prompt: "`dev` 네임스페이스 모든 파드의 이름과 이미지를 JSONPath 로 한 줄씩 뽑아라.",
    type: "command",
    answer: "kubectl get pods -n dev -o jsonpath='{range .items[*]}{.metadata.name}{\"\\t\"}{.spec.containers[*].image}{\"\\n\"}{end}'",
    match: { argv: ["kubectl", "get", "pods"], flags: { namespace: "dev", output: { matches: "^jsonpath" } } },
    hint: "`{range .items[*]}` 와 `{end}` 로 감싼다.",
    explain:
      "출력 형식은 목적에 따라 고른다 — 사람이 볼 요약은 `-o wide`, 필드 몇 개는 `-o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[*].image`, 스크립트로 넘길 값 하나는 `-o jsonpath`. 시험에서는 custom-columns 가 대개 더 빠르다.",
    docs: "https://kubernetes.io/docs/reference/kubectl/jsonpath/"
  },
  {
    id: "ob-debug-node",
    areas: { cka: "troubleshoot" },
    level: 3,
    title: "노드에 디버그 파드 붙이기",
    prompt: "`node01` 의 호스트 파일시스템을 보기 위해 디버그 컨테이너를 붙여라. 이미지는 `busybox:1.36`.",
    type: "command",
    answer: "kubectl debug node/node01 -it --image=busybox:1.36",
    match: { argv: ["kubectl", "debug", "nodes", "node01"], flags: { image: "busybox:1.36" } },
    hint: "대상이 파드가 아니라 노드다.",
    explain:
      "`kubectl debug node/...` 는 그 노드에 특권 파드를 띄우고 호스트 루트를 `/host` 에 마운트해 준다. SSH 가 막힌 환경에서 kubelet 설정이나 로그를 볼 때 쓴다. 파드를 대상으로 할 때는 `kubectl debug -it <파드> --image=busybox --target=<컨테이너>` 로 임시 컨테이너를 붙인다.",
    docs: "https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/"
  }
]);
