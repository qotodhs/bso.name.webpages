// 트러블슈팅 (CKA 30% · CKAD 관측과 겹침)
// 배점이 가장 큰 영역이다. "무엇을 만들까"가 아니라 "어디부터 볼까"를 훈련한다.
window.addK8sTasks("troubleshoot", [
  {
    id: "ts-logs-previous",
    areas: { cka: "troubleshoot", ckad: "observe" },
    level: 1,
    title: "죽기 직전의 로그 보기",
    prompt: "`web` 네임스페이스의 파드 `api-7f9` 가 CrashLoopBackOff 다. 재시작 직전 컨테이너의 로그를 출력하라.",
    type: "command",
    answer: "kubectl logs api-7f9 -n web --previous",
    match: { argv: ["kubectl", "logs", "api-7f9"], flags: { namespace: "web", previous: true } },
    hint: "지금 컨테이너는 이미 새로 뜬 것이다. 이전 것을 봐야 한다.",
    explain:
      "CrashLoopBackOff 에서 `kubectl logs` 만 치면 방금 재시작한(그래서 아직 아무것도 안 찍은) 컨테이너를 본다. `--previous`(`-p`) 가 종료된 직전 컨테이너의 로그를 준다. 컨테이너가 여러 개면 `-c <이름>` 을 같이 준다. 로그가 비어 있으면 원인은 애플리케이션이 아니라 이미지·커맨드·마운트 쪽이므로 `describe` 로 넘어간다.",
    docs: "https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/"
  },
  {
    id: "ts-describe-pod",
    areas: { cka: "troubleshoot", ckad: "observe" },
    level: 1,
    title: "파드가 Pending 인 이유 찾기",
    prompt: "`web` 네임스페이스의 파드 `api-7f9` 가 Pending 상태다. 이유를 확인할 명령을 쓰라.",
    type: "command",
    answer: "kubectl describe pod api-7f9 -n web",
    match: { argv: ["kubectl", "describe", "pods", "api-7f9"], flags: { namespace: "web" } },
    hint: "Pending 은 스케줄러가 아직 노드를 못 고른 상태다. 이벤트를 봐야 한다.",
    explain:
      "Pending 의 원인은 describe 출력 맨 아래 Events 에 한 줄로 나온다 — `Insufficient cpu/memory`(자원 부족), `node(s) had untolerated taint`(테인트), `didn't match node selector`(라벨 불일치), `pod has unbound immediate PersistentVolumeClaims`(PVC 미바인딩). 상태별 첫 수: Pending→describe, CrashLoopBackOff→logs --previous, ImagePullBackOff→이미지 이름·시크릿, Running 인데 안 됨→probe 와 서비스 엔드포인트.",
    docs: "https://kubernetes.io/docs/tasks/debug/debug-application/"
  },
  {
    id: "ts-events-sort",
    areas: { cka: "troubleshoot", ckad: "observe" },
    level: 2,
    title: "최근 이벤트를 시간순으로",
    prompt: "`web` 네임스페이스의 이벤트를 생성 시각 순으로 정렬해 보라.",
    type: "command",
    answer: "kubectl get events -n web --sort-by=.metadata.creationTimestamp",
    match: {
      argv: ["kubectl", "get", "events"],
      flags: { namespace: "web", "sort-by": { matches: "^\\.(metadata\\.creationTimestamp|lastTimestamp)$" } }
    },
    hint: "`--sort-by` 값은 앞에 점이 붙는 JSONPath 다.",
    explain:
      "이벤트는 기본적으로 순서가 뒤죽박죽이라 정렬 없이는 쓸모가 적다. `--sort-by=.metadata.creationTimestamp` 를 손에 붙여 둔다. 이벤트 기본 보존은 1시간이라 오래된 장애는 안 보인다는 점도 기억한다. 클러스터 전체를 볼 때는 `-A`.",
    docs: "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
  },
  {
    id: "ts-node-notready",
    areas: { cka: "troubleshoot" },
    level: 2,
    title: "NotReady 노드의 kubelet 확인",
    prompt: "`node01` 이 NotReady 다. 그 노드에 접속한 뒤 kubelet 서비스 상태를 확인할 명령을 쓰라.",
    type: "command",
    answer: "systemctl status kubelet",
    match: [
      { argv: ["systemctl", "status", "kubelet"] },
      { argv: ["journalctl", "-u", "kubelet"] }
    ],
    hint: "kubelet 은 파드가 아니라 systemd 서비스다.",
    explain:
      "노드 NotReady 는 거의 항상 kubelet 이 죽었거나 설정이 깨진 것이다. 순서는 ①`systemctl status kubelet` ②`journalctl -u kubelet -f` 로 원인 줄 찾기 ③`/var/lib/kubelet/config.yaml`·`/etc/kubernetes/kubelet.conf` 경로·인증서 확인 ④`systemctl enable --now kubelet`. 컨트롤플레인 구성요소는 정적 파드라 `crictl ps` 로 보고, kubelet 자체는 systemd 로 본다 — 이 구분이 핵심이다.",
    docs: "https://kubernetes.io/docs/tasks/debug/debug-cluster/"
  },
  {
    id: "ts-kubelet-start",
    areas: { cka: "troubleshoot" },
    level: 1,
    title: "kubelet 을 켜고 부팅에도 뜨게",
    prompt: "멈춰 있는 kubelet 을 지금 시작하고 부팅 시 자동 시작도 걸어라.",
    type: "command",
    answer: "systemctl enable --now kubelet",
    match: { argv: ["systemctl", "enable", "kubelet"], flags: { now: true }, labels: { now: "`--now`" } },
    hint: "두 동작을 한 번에 하는 플래그가 있다.",
    explain:
      "`start` 는 지금만, `enable` 은 다음 부팅부터다. `enable --now` 가 둘 다다. 설정 파일을 고친 뒤라면 `systemctl daemon-reload` 를 먼저 한다.",
    docs: "https://kubernetes.io/docs/tasks/debug/debug-cluster/"
  },
  {
    id: "ts-controlplane-pods",
    areas: { cka: "troubleshoot" },
    level: 2,
    title: "컨트롤플레인 구성요소 상태",
    prompt: "API 서버·스케줄러·컨트롤러매니저·etcd 가 살아 있는지 한 번에 확인하라.",
    type: "command",
    answer: "kubectl get pods -n kube-system",
    match: { argv: ["kubectl", "get", "pods"], flags: { namespace: "kube-system" } },
    hint: "kubeadm 클러스터에서 이들은 모두 파드로 뜬다.",
    explain:
      "kubeadm 클러스터의 컨트롤플레인은 `/etc/kubernetes/manifests/` 의 정적 파드다. API 서버가 죽어 `kubectl` 자체가 안 되면 이 명령도 안 되므로, 그때는 노드에서 `crictl ps -a` 와 `crictl logs <id>` 로 본다. 매니페스트 YAML 의 오타 한 글자로 API 서버가 안 뜨는 문항이 단골이다.",
    docs: "https://kubernetes.io/docs/tasks/debug/debug-cluster/"
  },
  {
    id: "ts-crictl",
    areas: { cka: "troubleshoot" },
    level: 3,
    title: "kubectl 이 안 될 때 컨테이너 보기",
    prompt: "API 서버가 응답하지 않는다. 노드에서 실행 중인 컨테이너를 종료된 것까지 포함해 나열하라.",
    type: "command",
    answer: "crictl ps -a",
    match: { argv: ["crictl", "ps"], flags: { a: true }, labels: { a: "`-a` (종료된 컨테이너까지)" } },
    hint: "`docker ps -a` 에 대응하는 CRI 도구다.",
    explain:
      "`crictl ps -a` 로 컨테이너 ID 를 찾고 `crictl logs <id>` 로 실패 이유를 본다. `crictl` 은 kubelet 과 같은 CRI 소켓을 보므로 API 서버 없이도 동작한다. 컨트롤플레인이 통째로 안 뜨는 문항에서 유일한 창문이다.",
    docs: "https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/"
  },
  {
    id: "ts-endpoints",
    areas: { cka: "troubleshoot", ckad: "network" },
    level: 2,
    title: "서비스에 파드가 붙었는지 확인",
    prompt: "`prod` 네임스페이스의 서비스 `web` 에 연결된 엔드포인트를 확인하라.",
    type: "command",
    answer: "kubectl get endpoints web -n prod",
    match: [
      { argv: ["kubectl", "get", "endpoints", "web"], flags: { namespace: "prod" } },
      { argv: ["kubectl", "get", "endpointslices"], flags: { namespace: "prod", selector: { matches: "web" } } }
    ],
    hint: "서비스가 아니라 서비스가 고른 파드 목록을 봐야 한다.",
    explain:
      "엔드포인트가 비어 있으면 원인은 셋 중 하나다 — 서비스 `selector` 와 파드 라벨 불일치, `targetPort` 와 컨테이너 포트 불일치, 파드가 Ready 가 아님(readinessProbe 실패). 서비스 문항은 만든 뒤 반드시 이 명령으로 확인한다. 라벨 비교는 `kubectl get pods -n prod --show-labels` 와 `kubectl describe svc web -n prod` 를 나란히 놓으면 빠르다.",
    docs: "https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/"
  },
  {
    id: "ts-dns-check",
    areas: { cka: "troubleshoot", ckad: "network" },
    level: 3,
    title: "클러스터 DNS 확인",
    prompt: "임시 파드를 띄워 `prod` 네임스페이스의 서비스 `web` 이름이 풀리는지 확인하라. 확인이 끝나면 파드는 남기지 않는다.",
    type: "command",
    answer: "kubectl run tmp --image=busybox:1.28 --rm -it --restart=Never -- nslookup web.prod.svc.cluster.local",
    match: {
      argv: ["kubectl", "run", "tmp"],
      flags: { image: { matches: "busybox" }, rm: true, restart: "Never" },
      command: ["nslookup", "web.prod.svc.cluster.local"]
    },
    hint: "`--rm -it --restart=Never` 조합과 `--` 뒤 명령을 쓴다.",
    explain:
      "서비스의 정식 이름은 `<서비스>.<네임스페이스>.svc.cluster.local` 이다. 같은 네임스페이스면 `web` 만으로도 풀린다. 이름이 안 풀리면 CoreDNS(`kubectl get pods -n kube-system -l k8s-app=kube-dns`)와 `kubectl get svc -n kube-system kube-dns` 를 본다. busybox 는 1.28 이후 이미지에 nslookup 버그가 있어 관례적으로 `busybox:1.28` 을 쓴다.",
    docs: "https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/"
  },
  {
    id: "ts-answer-file",
    areas: { cka: "troubleshoot" },
    level: 2,
    title: "결과를 파일로 저장",
    prompt: "Ready 가 아닌 노드의 개수를 `/opt/not-ready-count.txt` 에 저장하라.",
    type: "command",
    answer: "kubectl get nodes | grep -w NotReady | wc -l > /opt/not-ready-count.txt",
    match: { argv: ["kubectl", "get", "nodes"], redirect: "/opt/not-ready-count.txt" },
    hint: "파이프로 세고 리다이렉션으로 저장한다. 경로는 문제에 적힌 그대로.",
    explain:
      "CKA 는 답을 파일로 요구하는 문항이 꾸준히 나온다. 채점은 파일 내용만 보므로 경로 오타·여분의 공백·헤더 줄이 그대로 실점이다. 저장한 뒤 `cat` 으로 눈으로 확인하는 30초를 반드시 쓴다.",
    docs: "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
  },
  {
    id: "ts-broken-pod",
    areas: { cka: "troubleshoot", ckad: "observe" },
    level: 3,
    title: "고장난 매니페스트 고치기",
    prompt:
      "이 파드는 적용되지 않는다. apiVersion·필드 오타·형식 오류를 모두 고쳐 `dev` 네임스페이스에 `nginx:1.25` 컨테이너 하나가 뜨는 올바른 Pod 매니페스트로 만들어라.",
    type: "manifest",
    starter:
      "apiVersion: v1/beta\nkind: pod\nmetadata:\n  name: web\n  namespace: dev\nspec:\n  container:\n    - name: web\n      images: nginx:1.25\n      ports:\n        containerPort: 80\n",
    checks: [
      { label: "apiVersion 이 v1", path: "apiVersion", equals: "v1" },
      { label: "kind 가 Pod (대문자 P)", path: "kind", equals: "Pod" },
      { label: "네임스페이스 dev", path: "metadata.namespace", equals: "dev" },
      { label: "containers 는 배열 필드", path: "spec.containers[0].name", exists: true },
      { label: "image 는 단수형", path: "spec.containers[0].image", equals: "nginx:1.25" },
      { label: "ports 도 배열", path: "spec.containers[0].ports[0].containerPort", equals: 80 }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: web\n  namespace: dev\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25\n      ports:\n        - containerPort: 80\n",
    hint: "`kind` 는 대문자로 시작한다. 리스트여야 하는 필드 앞에는 `-` 가 붙는다.",
    explain:
      "고장난 매니페스트는 네 가지 중 하나다 — apiVersion/kind 오타, 단수·복수 필드명(`container`·`images`), 리스트여야 할 곳의 `-` 누락, 들여쓰기. 시험장에서는 `kubectl apply -f x.yaml` 의 오류 메시지가 필드 경로를 그대로 알려주므로 추측하지 말고 그 줄만 고친다. 필드가 헷갈리면 `kubectl explain pod.spec.containers` 가 가장 빠른 사전이다.",
    docs: "https://kubernetes.io/docs/reference/kubectl/#resource-types"
  }
]);
