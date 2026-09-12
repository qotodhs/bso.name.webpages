// 클러스터 아키텍처 · 설치 · 구성 (CKA 25%)
// RBAC · kubeadm · etcd · 노드 관리. CKA 에서만 나오는 영역이다.
window.addK8sTasks("cluster", [
  {
    id: "cl-context",
    areas: { cka: "cluster" },
    level: 1,
    title: "작업 컨텍스트 전환",
    prompt: "이후 작업은 `k8s-c2` 클러스터에서 해야 한다. 컨텍스트를 전환하라.",
    type: "command",
    answer: "kubectl config use-context k8s-c2",
    match: { argv: ["kubectl", "config", "use-context", "k8s-c2"] },
    hint: "config 하위 명령이다. 현재 컨텍스트는 `kubectl config current-context`.",
    explain:
      "시험은 문항마다 클러스터가 다르고, 첫 줄에 주어지는 전환 명령을 그대로 붙여넣지 않으면 엉뚱한 클러스터를 고치게 된다. 채점은 지정된 클러스터에서만 이뤄지므로 이 한 줄을 빠뜨리면 정답을 만들어도 0점이다. 매 문항 시작 시 전환 → `kubectl config current-context` 로 확인하는 습관을 붙인다.",
    docs: "https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/"
  },
  {
    id: "cl-sa-create",
    areas: { cka: "cluster", ckad: "config" },
    level: 1,
    title: "서비스어카운트 만들기",
    prompt: "네임스페이스 `dev` 에 서비스어카운트 `ci-bot` 을 만들어라.",
    type: "command",
    answer: "kubectl create serviceaccount ci-bot -n dev",
    match: { argv: ["kubectl", "create", "serviceaccount", "ci-bot"], flags: { namespace: "dev" } },
    hint: "`sa` 로 줄여 써도 된다.",
    explain:
      "1.24 부터 서비스어카운트를 만들어도 토큰 시크릿이 자동 생성되지 않는다. 토큰이 필요하면 `kubectl create token ci-bot -n dev` 로 즉석 발급하거나, 만료 없는 토큰이 필요할 때만 `kubernetes.io/service-account-token` 타입 시크릿을 직접 만든다.",
    docs: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/"
  },
  {
    id: "cl-role-create",
    areas: { cka: "cluster" },
    level: 2,
    title: "네임스페이스 범위 Role",
    prompt: "`dev` 네임스페이스에서 파드를 조회(get·list·watch)만 할 수 있는 Role `pod-reader` 를 만들어라.",
    type: "command",
    answer: "kubectl create role pod-reader --verb=get --verb=list --verb=watch --resource=pods -n dev",
    match: [
      { argv: ["kubectl", "create", "role", "pod-reader"], flags: { verb: { all: ["get", "list", "watch"] }, resource: "pods", namespace: "dev" } },
      { argv: ["kubectl", "create", "role", "pod-reader"], flags: { verb: "get,list,watch", resource: "pods", namespace: "dev" } }
    ],
    hint: "`--verb` 는 여러 번 주거나 쉼표로 이어 붙인다.",
    explain:
      "Role 은 네임스페이스 안에서만 유효하고 ClusterRole 은 클러스터 전체에 걸린다. 노드·PV·네임스페이스처럼 네임스페이스에 속하지 않는 리소스는 Role 로 절대 못 준다 — 이것이 둘을 가르는 한 줄 기준이다. `--resource=pods/log` 처럼 하위 리소스도 지정할 수 있다.",
    docs: "https://kubernetes.io/docs/reference/access-authn-authz/rbac/"
  },
  {
    id: "cl-rolebinding",
    areas: { cka: "cluster" },
    level: 2,
    title: "Role 을 서비스어카운트에 묶기",
    prompt: "`dev` 네임스페이스에서 Role `pod-reader` 를 서비스어카운트 `dev:ci-bot` 에 연결하는 RoleBinding `ci-read` 를 만들어라.",
    type: "command",
    answer: "kubectl create rolebinding ci-read --role=pod-reader --serviceaccount=dev:ci-bot -n dev",
    match: { argv: ["kubectl", "create", "rolebinding", "ci-read"], flags: { role: "pod-reader", serviceaccount: "dev:ci-bot", namespace: "dev" } },
    hint: "`--serviceaccount` 값은 `네임스페이스:이름` 형식이다.",
    explain:
      "`--role` 과 `--clusterrole` 을 바꿔 쓰는 실수가 잦다. RoleBinding 이 ClusterRole 을 참조하는 것은 가능하고(그 네임스페이스에서만 권한이 생긴다), 반대로 ClusterRoleBinding 이 Role 을 참조하는 것은 불가능하다.",
    docs: "https://kubernetes.io/docs/reference/access-authn-authz/rbac/"
  },
  {
    id: "cl-can-i",
    areas: { cka: "cluster" },
    level: 2,
    title: "권한이 실제로 붙었는지 확인",
    prompt: "서비스어카운트 `dev:ci-bot` 이 `dev` 네임스페이스에서 파드를 list 할 수 있는지 확인하라.",
    type: "command",
    answer: "kubectl auth can-i list pods --as=system:serviceaccount:dev:ci-bot -n dev",
    match: { argv: ["kubectl", "auth", "can-i", "list", "pods"], flags: { as: "system:serviceaccount:dev:ci-bot", namespace: "dev" } },
    hint: "`--as` 에 넣는 사용자 이름은 `system:serviceaccount:<ns>:<name>` 이다.",
    explain:
      "RBAC 문항은 만들고 끝내지 말고 반드시 이 명령으로 되돌려 확인한다. `yes` 가 아니면 바인딩 대상(subject) 이름이나 네임스페이스가 어긋난 것이다. 권한 전체를 보려면 `kubectl auth can-i --list --as=... -n dev`.",
    docs: "https://kubernetes.io/docs/reference/access-authn-authz/authorization/"
  },
  {
    id: "cl-etcd-backup",
    areas: { cka: "cluster" },
    level: 3,
    title: "etcd 스냅숏 저장",
    prompt: "컨트롤플레인에서 etcd 스냅숏을 `/opt/etcd-backup.db` 로 저장하라. 인증서는 `/etc/kubernetes/pki/etcd/` 아래의 `ca.crt`, `server.crt`, `server.key` 를 쓴다.",
    type: "command",
    answer:
      "ETCDCTL_API=3 etcdctl snapshot save /opt/etcd-backup.db \\\n  --endpoints=https://127.0.0.1:2379 \\\n  --cacert=/etc/kubernetes/pki/etcd/ca.crt \\\n  --cert=/etc/kubernetes/pki/etcd/server.crt \\\n  --key=/etc/kubernetes/pki/etcd/server.key",
    match: {
      argv: ["etcdctl", "snapshot", "save", "/opt/etcd-backup.db"],
      flags: {
        cacert: "/etc/kubernetes/pki/etcd/ca.crt",
        cert: "/etc/kubernetes/pki/etcd/server.crt",
        key: "/etc/kubernetes/pki/etcd/server.key"
      },
      optional: ["endpoints"]
    },
    hint: "인증서 세 개(cacert·cert·key)가 모두 있어야 한다. 값은 `kubectl -n kube-system describe pod etcd-<node>` 에서 그대로 읽을 수 있다.",
    explain:
      "경로를 외우려 하지 말고 etcd 정적 파드의 실행 인자에서 복사한다. 저장 후 `etcdctl snapshot status /opt/etcd-backup.db --write-out=table` 로 해시와 리비전이 찍히는지 확인한다. v3.4 이하에서는 `ETCDCTL_API=3` 를 빠뜨리면 v2 로 동작해 실패한다.",
    docs: "https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/"
  },
  {
    id: "cl-etcd-restore",
    areas: { cka: "cluster" },
    level: 3,
    title: "etcd 스냅숏 복구",
    prompt: "`/opt/etcd-backup.db` 를 `/var/lib/etcd-restore` 디렉터리로 복구하라.",
    type: "command",
    answer: "ETCDCTL_API=3 etcdctl snapshot restore /opt/etcd-backup.db --data-dir=/var/lib/etcd-restore",
    match: { argv: ["etcdctl", "snapshot", "restore", "/opt/etcd-backup.db"], flags: { "data-dir": "/var/lib/etcd-restore" } },
    hint: "복구는 새 데이터 디렉터리에 푼다. 기존 디렉터리에 덮어쓰지 않는다.",
    explain:
      "복구 자체는 파일을 푸는 것뿐이고, 실제로 반영하려면 `/etc/kubernetes/manifests/etcd.yaml` 의 `hostPath` 볼륨 경로를 새 데이터 디렉터리로 바꿔야 한다. 매니페스트를 고치면 kubelet 이 정적 파드를 다시 띄운다. 복구할 때 인증서 플래그는 필요 없다 — 서버에 접속하지 않기 때문이다.",
    docs: "https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/"
  },
  {
    id: "cl-drain",
    areas: { cka: "cluster" },
    level: 2,
    title: "노드 비우기",
    prompt: "`node01` 을 점검하려 한다. DaemonSet 파드는 무시하고 emptyDir 데이터가 있는 파드도 함께 내보내며 노드를 비워라.",
    type: "command",
    answer: "kubectl drain node01 --ignore-daemonsets --delete-emptydir-data",
    match: { argv: ["kubectl", "drain", "node01"], flags: { "ignore-daemonsets": true, "delete-emptydir-data": true } },
    hint: "두 플래그가 없으면 drain 이 중간에 멈춘다.",
    explain:
      "drain 은 cordon(스케줄 금지) + evict(기존 파드 축출)이다. DaemonSet 파드는 축출해도 곧바로 다시 뜨므로 무시하라고 알려줘야 하고, emptyDir 를 쓰는 파드는 데이터 유실 경고 때문에 명시적 동의가 필요하다. 점검이 끝나면 `kubectl uncordon node01` 로 되돌린다 — 이걸 잊으면 노드가 계속 비어 있다.",
    docs: "https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/"
  },
  {
    id: "cl-kubeadm-upgrade",
    areas: { cka: "cluster" },
    level: 3,
    title: "컨트롤플레인 업그레이드",
    prompt: "kubeadm 으로 컨트롤플레인을 `v1.32.1` 로 올리는 명령을 쓰라(사전 확인 단계는 끝났다).",
    type: "command",
    answer: "kubeadm upgrade apply v1.32.1",
    match: { argv: ["kubeadm", "upgrade", "apply", "v1.32.1"] },
    hint: "계획 확인은 `kubeadm upgrade plan`, 적용은 `apply` 다.",
    explain:
      "순서가 곧 정답이다 — ①kubeadm 패키지 업그레이드 ②`kubeadm upgrade plan` ③`kubeadm upgrade apply <버전>` ④kubelet·kubectl 패키지 업그레이드 ⑤`systemctl daemon-reload && systemctl restart kubelet`. 워커 노드는 `apply` 대신 `kubeadm upgrade node` 를 쓰고, 그 전에 drain, 끝나고 uncordon 한다. kubeadm 만 올리고 kubelet 을 안 올리면 노드 버전이 그대로다.",
    docs: "https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/"
  },
  {
    id: "cl-join-command",
    areas: { cka: "cluster" },
    level: 2,
    title: "워커 노드 조인 명령 뽑기",
    prompt: "새 워커를 붙이려 한다. 컨트롤플레인에서 조인 명령을 새로 발급하라.",
    type: "command",
    answer: "kubeadm token create --print-join-command",
    match: { argv: ["kubeadm", "token", "create"], flags: { "print-join-command": true } },
    hint: "토큰만 만들면 해시를 따로 구해야 한다. 한 번에 뽑는 플래그가 있다.",
    explain:
      "기본 토큰 수명은 24시간이라 대개 만료돼 있다. 이 명령은 토큰과 `--discovery-token-ca-cert-hash` 를 한 줄로 만들어 준다. 조인이 실패하면 워커에서 `kubelet` 로그, 방화벽(6443), 시계 오차를 순서대로 본다.",
    docs: "https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-token/"
  },
  {
    id: "cl-node-label",
    areas: { cka: "cluster", ckad: "config" },
    level: 1,
    title: "노드에 라벨 붙이기",
    prompt: "`node01` 에 `disktype=ssd` 라벨을 붙여라.",
    type: "command",
    answer: "kubectl label node node01 disktype=ssd",
    match: { argv: ["kubectl", "label", "nodes", "node01", "disktype=ssd"] },
    hint: "라벨은 플래그가 아니라 인자로 준다.",
    explain:
      "이미 있는 라벨을 바꾸려면 `--overwrite` 가 필요하고, 지울 때는 `disktype-` 처럼 뒤에 빼기를 붙인다. 파드의 `nodeSelector: {disktype: ssd}` 와 짝이 되는 작업이라 스케줄링 문항에서 함께 나온다.",
    docs: "https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/"
  },
  {
    id: "cl-static-pod",
    areas: { cka: "cluster" },
    level: 3,
    title: "정적 파드 매니페스트",
    prompt:
      "`node01` 에서 kubelet 이 직접 띄우는 정적 파드를 만든다. 이름 `web-static`, 이미지 `nginx:1.25`, 컨테이너 포트 80. `/etc/kubernetes/manifests/web-static.yaml` 에 넣을 매니페스트를 작성하라.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: \nspec:\n  containers:\n    - name: web\n      image: \n",
    checks: [
      { label: "kind 가 Pod", path: "kind", equals: "Pod" },
      { label: "이름 web-static", path: "metadata.name", equals: "web-static" },
      { label: "이미지 nginx:1.25", path: "spec.containers[0].image", equals: "nginx:1.25" },
      { label: "컨테이너 포트 80", path: "spec.containers[0].ports[0].containerPort", equals: 80 }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: web-static\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25\n      ports:\n        - containerPort: 80\n",
    hint: "`kubectl run web-static --image=nginx:1.25 --port=80 --dry-run=client -o yaml` 로 뼈대를 만들어 붙여넣는다.",
    explain:
      "정적 파드는 API 서버가 아니라 kubelet 이 디렉터리를 보고 띄운다. 그래서 apply 가 아니라 파일을 놓는 것이 배포이고, 지우려면 파일을 지워야 한다 — `kubectl delete pod` 로 지우면 kubelet 이 곧바로 되살린다. 클러스터에는 `web-static-node01` 처럼 노드 이름이 붙은 미러 파드로 보인다. 감시 디렉터리는 `/var/lib/kubelet/config.yaml` 의 `staticPodPath` 로 확인한다.",
    docs: "https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/"
  },
  {
    id: "cl-certs-expiration",
    areas: { cka: "cluster" },
    level: 2,
    title: "인증서 만료일 확인",
    prompt: "컨트롤플레인 인증서가 언제 만료되는지 확인하라.",
    type: "command",
    answer: "kubeadm certs check-expiration",
    match: { argv: ["kubeadm", "certs", "check-expiration"] },
    hint: "kubectl 이 아니라 kubeadm 의 하위 명령이다.",
    explain:
      "kubeadm 이 만든 인증서는 기본 1년짜리라, 오래 방치한 클러스터가 갑자기 `Unable to connect to the server: x509` 로 죽는 원인이 된다. 갱신은 `kubeadm certs renew all` 이고, 그 뒤 컨트롤플레인 정적 파드를 다시 띄워야 반영된다. `kubectl` 이 아예 안 되는 상황이므로 노드에 직접 들어가 확인한다는 점이 포인트다.",
    docs: "https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/"
  },
  {
    id: "cl-clusterrolebinding",
    areas: { cka: "cluster" },
    level: 2,
    title: "클러스터 전체 읽기 권한 주기",
    prompt: "서비스어카운트 `dev:ci-bot` 에게 클러스터 전체를 읽을 수 있는 기본 롤 `view` 를 연결하라. 이름은 `ci-view`.",
    type: "command",
    answer: "kubectl create clusterrolebinding ci-view --clusterrole=view --serviceaccount=dev:ci-bot",
    match: { argv: ["kubectl", "create", "clusterrolebinding", "ci-view"], flags: { clusterrole: "view", serviceaccount: "dev:ci-bot" } },
    hint: "클러스터 범위 바인딩에는 네임스페이스를 주지 않는다.",
    explain:
      "기본 제공 ClusterRole 네 가지를 알아 두면 문항이 빨라진다 — `view`(읽기, 시크릿 제외), `edit`(쓰기, RBAC 제외), `admin`(네임스페이스 관리자), `cluster-admin`(전권). 같은 ClusterRole 을 RoleBinding 으로 묶으면 그 네임스페이스에서만 적용되고, ClusterRoleBinding 으로 묶으면 클러스터 전체가 된다 — 범위를 정하는 것은 롤이 아니라 **바인딩 쪽**이다.",
    docs: "https://kubernetes.io/docs/reference/access-authn-authz/rbac/"
  },
  {
    id: "cl-namespace",
    areas: { cka: "cluster", ckad: "config" },
    level: 1,
    title: "네임스페이스 만들기",
    prompt: "네임스페이스 `staging` 을 만들어라.",
    type: "command",
    answer: "kubectl create namespace staging",
    match: { argv: ["kubectl", "create", "namespaces", "staging"] },
    hint: "`ns` 로 줄여 써도 된다.",
    explain:
      "이후 작업을 그 네임스페이스에서 계속한다면 `kubectl config set-context --current --namespace=staging` 로 기본값을 바꿔 두면 매번 `-n` 을 치지 않아도 된다. 다만 시험에서는 문항마다 네임스페이스가 달라 기본값을 바꿔 두면 오히려 헷갈리므로, 매번 `-n` 을 명시하는 편이 안전하다.",
    docs: "https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/"
  },
  {
    id: "cl-nodes-json",
    areas: { cka: "cluster" },
    level: 2,
    title: "노드 정보를 파일로 뽑기",
    prompt: "클러스터 모든 노드의 정보를 JSON 형식으로 `/opt/nodes.json` 에 저장하라.",
    type: "command",
    answer: "kubectl get nodes -o json > /opt/nodes.json",
    match: { argv: ["kubectl", "get", "nodes"], flags: { output: "json" }, redirect: "/opt/nodes.json" },
    hint: "출력 형식을 바꾸고 리다이렉션으로 저장한다.",
    explain:
      "채점은 파일 내용만 본다. `-o json` 과 `-o yaml` 을 문제에서 지정한 대로 정확히 쓰고, 경로 오타가 없는지 `ls -l /opt/nodes.json` 으로 확인한다. 저장 후 `head` 로 첫 줄이 `{` 인지 눈으로 보는 30초가 부분점수를 지킨다.",
    docs: "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
  },
  {
    id: "cl-static-pod-path",
    areas: { cka: "cluster", ckad: "observe" },
    level: 2,
    title: "정적 파드 디렉터리 찾기",
    prompt: "이 노드의 kubelet 이 정적 파드를 어느 디렉터리에서 읽는지 확인하라.",
    type: "command",
    answer: "grep staticPodPath /var/lib/kubelet/config.yaml",
    match: [
      { argv: ["grep", "staticPodPath", "/var/lib/kubelet/config.yaml"] },
      { argv: ["cat", "/var/lib/kubelet/config.yaml"] }
    ],
    hint: "kubelet 설정 파일 안에 경로가 적혀 있다. 추측하지 말고 읽는다.",
    explain:
      "kubeadm 클러스터의 기본값은 `/etc/kubernetes/manifests` 지만 문제에서 바꿔 두는 경우가 있어 반드시 확인한다. kubelet 이 `--config` 로 어떤 파일을 보는지는 `systemctl status kubelet` 이나 `/etc/systemd/system/kubelet.service.d/` 의 드롭인에서 확인한다. 이 디렉터리에 YAML 을 놓으면 배포, 파일을 지우면 삭제다.",
    docs: "https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/"
  },
  {
    id: "cl-csr-approve",
    areas: { cka: "cluster" },
    level: 2,
    title: "인증서 서명 요청 승인",
    prompt: "새 사용자용으로 제출된 CertificateSigningRequest `dev-user` 를 승인하라.",
    type: "command",
    answer: "kubectl certificate approve dev-user",
    match: { argv: ["kubectl", "certificate", "approve", "dev-user"] },
    hint: "`create` 나 `patch` 가 아니라 전용 동사가 있다.",
    explain:
      "흐름은 ①사용자가 키·CSR 생성 ②CertificateSigningRequest 객체 제출 ③`kubectl certificate approve` ④`kubectl get csr dev-user -o jsonpath='{.status.certificate}' | base64 -d` 로 인증서를 받아 kubeconfig 구성 ⑤Role·RoleBinding 으로 권한 부여. 거절은 `deny` 다. 승인해도 권한은 따로 줘야 한다는 점이 자주 빠진다.",
    docs: "https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/"
  },
  {
    id: "cl-csr-manifest",
    areas: { cka: "cluster" },
    level: 3,
    title: "인증서 서명 요청 작성",
    prompt:
      "사용자 `dev-user` 의 CSR 을 제출하는 매니페스트를 작성하라. base64 로 인코딩한 요청은 `LS0tLS1CRUdJTi...` 로 시작하며, 클라이언트 인증용 서명자를 쓰고 용도는 `client auth` 다.",
    type: "manifest",
    starter: "apiVersion: certificates.k8s.io/v1\nkind: CertificateSigningRequest\nmetadata:\n  name: dev-user\nspec:\n  request: LS0tLS1CRUdJTi...\n",
    checks: [
      { label: "kind 가 CertificateSigningRequest", path: "kind", equals: "CertificateSigningRequest" },
      { label: "서명자 kube-apiserver-client", path: "spec.signerName", equals: "kubernetes.io/kube-apiserver-client" },
      { label: "용도에 client auth", path: "spec.usages", contains: "client auth" },
      { label: "요청 본문", path: "spec.request", exists: true }
    ],
    answer:
      "apiVersion: certificates.k8s.io/v1\nkind: CertificateSigningRequest\nmetadata:\n  name: dev-user\nspec:\n  request: LS0tLS1CRUdJTi...\n  signerName: kubernetes.io/kube-apiserver-client\n  usages:\n    - client auth\n",
    hint: "`request` 값은 CSR 파일을 `base64 -w 0` 으로 한 줄로 만들어 넣는다.",
    explain:
      "서명자로 용도가 갈린다 — 사용자 인증서는 `kubernetes.io/kube-apiserver-client`, kubelet 서버 인증서는 `kubernetes.io/kubelet-serving`. `base64` 에 `-w 0` 을 빠뜨려 줄바꿈이 섞이면 요청이 거부되는 것이 이 문항의 최다 실수다.",
    docs: "https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/"
  }
]);
