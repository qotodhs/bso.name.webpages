// 서비스 · 네트워킹 (CKA 20% · CKAD 20%)
window.addK8sTasks("network", [
  {
    id: "nw-expose",
    areas: { cka: "network", ckad: "network" },
    level: 1,
    title: "디플로이먼트를 서비스로 노출",
    prompt:
      "`prod` 의 디플로이먼트 `web` 을 클러스터 내부에서 80 포트로 접근할 수 있게 노출하라. 컨테이너는 8080 을 듣고, 서비스 이름은 `web-svc` 로 한다.",
    type: "command",
    answer: "kubectl expose deployment web --name=web-svc --port=80 --target-port=8080 -n prod",
    match: { argv: ["kubectl", "expose", "deployments", "web"], flags: { name: "web-svc", port: "80", "target-port": "8080", namespace: "prod" } },
    hint: "서비스가 받는 포트와 파드가 듣는 포트를 따로 지정한다.",
    explain:
      "`--port` 는 서비스가 여는 포트, `--target-port` 는 파드의 포트다. 생략하면 target-port 가 port 와 같아져 연결이 안 된다 — 서비스 문항의 최다 실수다. expose 는 대상 리소스의 라벨을 그대로 selector 로 삼으므로, 만든 뒤 `kubectl get endpoints web-svc -n prod` 로 파드가 붙었는지 반드시 확인한다.",
    docs: "https://kubernetes.io/docs/concepts/services-networking/service/"
  },
  {
    id: "nw-nodeport",
    areas: { cka: "network", ckad: "network" },
    level: 2,
    title: "NodePort 로 열기",
    prompt: "`prod` 의 디플로이먼트 `web` 을 NodePort 타입 서비스 `web-np` 로 노출하라. 서비스 포트는 80.",
    type: "command",
    answer: "kubectl expose deployment web --name=web-np --type=NodePort --port=80 -n prod",
    match: { argv: ["kubectl", "expose", "deployments", "web"], flags: { name: "web-np", type: "NodePort", port: "80", namespace: "prod" } },
    hint: "타입을 명시하지 않으면 ClusterIP 다.",
    explain:
      "타입은 접근 범위로 갈린다 — ClusterIP(클러스터 내부만·기본), NodePort(모든 노드의 30000~32767 포트), LoadBalancer(외부 LB, 클라우드 필요), ExternalName(DNS CNAME). 특정 노드포트 번호를 요구하면 명령형으로는 지정할 수 없으므로 YAML 로 뽑아 `nodePort:` 를 넣는다.",
    docs: "https://kubernetes.io/docs/concepts/services-networking/service/"
  },
  {
    id: "nw-port-forward",
    areas: { ckad: "network", cka: "troubleshoot" },
    level: 1,
    title: "로컬에서 서비스로 터널",
    prompt: "`prod` 의 서비스 `web-svc` 의 80 포트를 로컬 8080 으로 연결해 확인하라.",
    type: "command",
    answer: "kubectl port-forward svc/web-svc 8080:80 -n prod",
    match: { argv: ["kubectl", "port-forward", "services", "web-svc", "8080:80"], flags: { namespace: "prod" } },
    hint: "포트 표기는 `로컬:원격` 순이다.",
    explain:
      "순서를 뒤집으면 조용히 엉뚱한 포트를 연다. 파드로 직접 붙일 때는 `pod/이름`, 서비스로 붙일 때는 `svc/이름`. 서비스가 응답하지 않는데 파드로는 붙는다면 원인은 서비스의 selector 나 targetPort 다.",
    docs: "https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/"
  },
  {
    id: "nw-headless",
    areas: { cka: "network", ckad: "network" },
    level: 3,
    title: "헤드리스 서비스",
    prompt: "라벨 `app=db` 인 파드들의 개별 주소를 DNS 로 얻기 위한 헤드리스 서비스 `db` 를 `prod` 에 작성하라. 포트는 5432.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Service\nmetadata:\n  name: db\n  namespace: prod\nspec:\n",
    checks: [
      { label: "clusterIP: None", path: "spec.clusterIP", equals: "None" },
      { label: "selector app=db", path: "spec.selector.app", equals: "db" },
      { label: "포트 5432", path: "spec.ports[0].port", equals: 5432 }
    ],
    answer:
      "apiVersion: v1\nkind: Service\nmetadata:\n  name: db\n  namespace: prod\nspec:\n  clusterIP: None\n  selector:\n    app: db\n  ports:\n    - port: 5432\n      targetPort: 5432\n",
    hint: "가상 IP 를 아예 만들지 않는다는 뜻의 값을 넣는다.",
    explain:
      "일반 서비스는 하나의 ClusterIP 로 로드밸런싱하지만, 헤드리스는 IP 를 만들지 않고 DNS 가 파드 IP 목록을 직접 돌려준다. 스테이트풀셋과 짝을 이뤄 `db-0.db.prod.svc.cluster.local` 같은 개별 이름을 만드는 데 쓴다 — '각 파드를 개별로 지목해야 한다'가 판별 기준이다.",
    docs: "https://kubernetes.io/docs/concepts/services-networking/service/"
  },
  {
    id: "nw-ingress",
    areas: { cka: "network", ckad: "network" },
    level: 3,
    title: "인그레스 라우팅",
    prompt:
      "`shop.example.com` 의 `/api` 로 오는 요청을 `prod` 네임스페이스의 서비스 `api-svc` 80 포트로 보내는 인그레스 `shop` 을 작성하라. 인그레스클래스는 `nginx`.",
    type: "manifest",
    starter: "apiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: shop\n  namespace: prod\nspec:\n",
    checks: [
      { label: "ingressClassName nginx", path: "spec.ingressClassName", equals: "nginx" },
      { label: "호스트", path: "spec.rules[0].host", equals: "shop.example.com" },
      { label: "경로 /api", path: "spec.rules[0].http.paths[0].path", equals: "/api" },
      { label: "pathType 지정", path: "spec.rules[0].http.paths[0].pathType", oneOf: ["Prefix", "Exact", "ImplementationSpecific"] },
      { label: "백엔드 서비스 이름", path: "spec.rules[0].http.paths[0].backend.service.name", equals: "api-svc" },
      { label: "백엔드 포트 번호", path: "spec.rules[0].http.paths[0].backend.service.port.number", equals: 80 }
    ],
    answer:
      "apiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: shop\n  namespace: prod\nspec:\n  ingressClassName: nginx\n  rules:\n    - host: shop.example.com\n      http:\n        paths:\n          - path: /api\n            pathType: Prefix\n            backend:\n              service:\n                name: api-svc\n                port:\n                  number: 80\n",
    hint: "`kubectl create ingress shop --rule=\"shop.example.com/api*=api-svc:80\" -n prod --class=nginx` 로 뼈대를 뽑을 수 있다.",
    explain:
      "networking.k8s.io/v1 에서 `pathType` 은 필수다(빠뜨리면 거부). 백엔드 구조도 예전 `serviceName/servicePort` 가 아니라 `service.name` + `service.port.number` 로 한 단계 깊어졌다. 인그레스는 컨트롤러가 없으면 만들어도 아무 일이 일어나지 않는다 — 주소가 비어 있으면 컨트롤러부터 확인한다.",
    docs: "https://kubernetes.io/docs/concepts/services-networking/ingress/"
  },
  {
    id: "nw-netpol-deny",
    areas: { cka: "network", ckad: "network" },
    level: 2,
    title: "기본 차단 정책",
    prompt: "`prod` 네임스페이스의 모든 파드로 들어오는 트래픽을 기본 차단하는 네트워크폴리시 `default-deny` 를 작성하라.",
    type: "manifest",
    starter: "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: default-deny\n  namespace: prod\nspec:\n",
    checks: [
      { label: "모든 파드 선택(빈 selector)", path: "spec.podSelector", exists: true },
      { label: "policyTypes 에 Ingress", path: "spec.policyTypes", contains: "Ingress" },
      { label: "ingress 규칙 없음", path: "spec.ingress", absent: true }
    ],
    answer:
      "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: default-deny\n  namespace: prod\nspec:\n  podSelector: {}\n  policyTypes:\n    - Ingress\n",
    hint: "`podSelector: {}` 는 '이 네임스페이스의 모든 파드'라는 뜻이다.",
    explain:
      "네트워크폴리시는 화이트리스트다. 어떤 파드에 정책이 하나라도 붙는 순간 그 파드는 '허용된 것만' 받는다. 그래서 규칙을 하나도 안 쓴 정책이 곧 전면 차단이 된다. `policyTypes` 에 Egress 를 넣으면 나가는 방향도 같은 규칙이 적용된다. 정책은 CNI 가 지원해야 동작한다(Flannel 기본 구성은 지원하지 않는다).",
    docs: "https://kubernetes.io/docs/concepts/services-networking/network-policies/"
  },
  {
    id: "nw-netpol-allow",
    areas: { cka: "network", ckad: "network" },
    level: 3,
    title: "지정한 파드만 허용",
    prompt:
      "`prod` 의 `app=db` 파드에 대해, 같은 네임스페이스의 `app=api` 파드가 TCP 5432 로만 접속할 수 있게 하는 네트워크폴리시 `db-allow` 를 작성하라.",
    type: "manifest",
    starter: "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: db-allow\n  namespace: prod\nspec:\n  podSelector:\n    matchLabels:\n      app: db\n",
    checks: [
      { label: "대상은 app=db", path: "spec.podSelector.matchLabels.app", equals: "db" },
      { label: "출발지 app=api", path: "spec.ingress[0].from[0].podSelector.matchLabels.app", equals: "api" },
      { label: "포트 5432", path: "spec.ingress[0].ports[0].port", equals: 5432 },
      { label: "프로토콜 TCP", path: "spec.ingress[0].ports[0].protocol", oneOf: ["TCP"] },
      { label: "policyTypes 에 Ingress", path: "spec.policyTypes", contains: "Ingress" }
    ],
    answer:
      "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: db-allow\n  namespace: prod\nspec:\n  podSelector:\n    matchLabels:\n      app: db\n  policyTypes:\n    - Ingress\n  ingress:\n    - from:\n        - podSelector:\n            matchLabels:\n              app: api\n      ports:\n        - protocol: TCP\n          port: 5432\n",
    hint: "`from` 아래 항목 사이의 `-` 위치가 의미를 바꾼다.",
    explain:
      "`from` 리스트의 항목이 각각 별개면 OR, 한 항목 안에 `namespaceSelector` 와 `podSelector` 를 나란히 쓰면 AND 다. `- namespaceSelector: ...` 와 `- podSelector: ...` 처럼 `-` 를 두 번 쓰면 '그 네임스페이스 전체 또는 이 파드'가 되어 범위가 넓어진다 — 이 한 글자가 정답과 오답을 가른다.",
    docs: "https://kubernetes.io/docs/concepts/services-networking/network-policies/"
  },
  {
    id: "nw-svc-dns",
    areas: { cka: "network", ckad: "network" },
    level: 2,
    title: "다른 네임스페이스의 서비스 부르기",
    prompt: "`dev` 네임스페이스의 파드에서 `prod` 네임스페이스의 서비스 `web-svc` 에 curl 로 접속해 확인하라(임시 파드 사용, 확인 후 삭제).",
    type: "command",
    answer: "kubectl run tmp --image=curlimages/curl --rm -it --restart=Never -n dev -- curl -s web-svc.prod.svc.cluster.local",
    match: {
      argv: ["kubectl", "run", "tmp"],
      flags: { image: { matches: "curl" }, rm: true, restart: "Never", namespace: "dev" },
      command: ["curl"]
    },
    hint: "다른 네임스페이스는 짧은 이름으로 안 풀린다. 이름에 네임스페이스를 붙인다.",
    explain:
      "같은 네임스페이스면 `web-svc`, 다른 네임스페이스면 `web-svc.prod`(또는 전체 이름 `web-svc.prod.svc.cluster.local`)다. 접속이 안 될 때 확인 순서는 DNS(이름이 풀리는가) → 엔드포인트(파드가 붙었는가) → 네트워크폴리시(막혔는가)다.",
    docs: "https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/"
  },
  {
    id: "nw-externalname",
    areas: { cka: "network", ckad: "network" },
    level: 2,
    title: "클러스터 밖 주소를 서비스 이름으로",
    prompt: "`prod` 네임스페이스의 파드가 외부 DB `db.example.com` 을 서비스 이름 `db` 로 부를 수 있게 하라.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Service\nmetadata:\n  name: db\n  namespace: prod\nspec:\n",
    checks: [
      { label: "타입 ExternalName", path: "spec.type", equals: "ExternalName" },
      { label: "가리키는 주소", path: "spec.externalName", equals: "db.example.com" },
      { label: "selector 는 두지 않는다", path: "spec.selector", absent: true }
    ],
    answer:
      "apiVersion: v1\nkind: Service\nmetadata:\n  name: db\n  namespace: prod\nspec:\n  type: ExternalName\n  externalName: db.example.com\n",
    hint: "파드를 고르는 서비스가 아니다. DNS 만 바꿔 준다.",
    explain:
      "ExternalName 은 프록시도 IP 도 만들지 않고 CNAME 만 돌려준다. 그래서 selector·endpoints·포트가 필요 없고, 반대로 포트 변환이나 로드밸런싱도 못 한다. 외부 주소를 클러스터 내부 이름으로 감싸 두면 나중에 실제 서비스로 바꿔도 파드 설정을 안 고쳐도 된다 — 이것이 쓰는 이유다.",
    docs: "https://kubernetes.io/docs/concepts/services-networking/service/"
  },
  {
    id: "nw-nodeport-fixed",
    areas: { cka: "network", ckad: "network" },
    level: 3,
    title: "노드포트 번호를 지정해서 열기",
    prompt:
      "라벨 `app=web` 인 파드를 노드의 `30080` 포트로 노출하는 서비스 `web-np` 를 `prod` 에 작성하라. 서비스 포트 80, 컨테이너 포트 8080.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Service\nmetadata:\n  name: web-np\n  namespace: prod\nspec:\n",
    checks: [
      { label: "타입 NodePort", path: "spec.type", equals: "NodePort" },
      { label: "selector app=web", path: "spec.selector.app", equals: "web" },
      { label: "서비스 포트 80", path: "spec.ports[0].port", equals: 80 },
      { label: "타깃 포트 8080", path: "spec.ports[0].targetPort", equals: 8080 },
      { label: "노드포트 30080", path: "spec.ports[0].nodePort", equals: 30080 }
    ],
    answer:
      "apiVersion: v1\nkind: Service\nmetadata:\n  name: web-np\n  namespace: prod\nspec:\n  type: NodePort\n  selector:\n    app: web\n  ports:\n    - port: 80\n      targetPort: 8080\n      nodePort: 30080\n",
    hint: "포트 세 개가 모두 한 항목 안에 들어간다.",
    explain:
      "노드포트 번호는 명령형(`kubectl expose`)으로 지정할 수 없다. 번호가 문제에 적혀 있으면 곧바로 YAML 로 간다 — 이것이 명령형과 선언형을 가르는 지점이다. 범위는 기본 30000~32767 이고 벗어나면 거부된다. `port`(서비스) → `targetPort`(파드) → `nodePort`(노드) 세 층을 구분해 적는다.",
    docs: "https://kubernetes.io/docs/concepts/services-networking/service/"
  },
  {
    id: "nw-netpol-egress",
    areas: { cka: "network", ckad: "network" },
    level: 3,
    title: "나가는 방향 제한",
    prompt:
      "`prod` 의 `app=api` 파드가 `10.0.0.0/16` 대역의 TCP 5432 로만 나갈 수 있게 하라. 단 DNS(UDP 53)는 허용한다. 정책 이름은 `api-egress`.",
    type: "manifest",
    starter: "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: api-egress\n  namespace: prod\nspec:\n  podSelector:\n    matchLabels:\n      app: api\n",
    checks: [
      { label: "policyTypes 에 Egress", path: "spec.policyTypes", contains: "Egress" },
      { label: "허용 대역", path: "spec.egress[0].to[0].ipBlock.cidr", equals: "10.0.0.0/16" },
      { label: "TCP 5432", path: "spec.egress[0].ports[0].port", equals: 5432 },
      { label: "DNS 규칙의 포트 53", path: "spec.egress[1].ports[0].port", equals: 53 },
      { label: "DNS 는 UDP", path: "spec.egress[1].ports[0].protocol", equals: "UDP" }
    ],
    answer:
      "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: api-egress\n  namespace: prod\nspec:\n  podSelector:\n    matchLabels:\n      app: api\n  policyTypes:\n    - Egress\n  egress:\n    - to:\n        - ipBlock:\n            cidr: 10.0.0.0/16\n      ports:\n        - protocol: TCP\n          port: 5432\n    - ports:\n        - protocol: UDP\n          port: 53\n",
    hint: "DNS 규칙은 `to` 없이 포트만 열어 두면 어디로든 53 이 허용된다.",
    explain:
      "Egress 정책을 걸면서 DNS 를 빼먹는 것이 이 유형의 단골 함정이다. 이름이 안 풀리니 앱은 '네트워크가 죽었다'처럼 보이지만 실제로는 정책이 53 을 막은 것이다. 증상이 '접속 자체가 아니라 이름 해석에서 멈춘다'면 여기를 먼저 본다.",
    docs: "https://kubernetes.io/docs/concepts/services-networking/network-policies/"
  },
  {
    id: "nw-svc-patch-selector",
    areas: { cka: "network", ckad: "network" },
    level: 3,
    title: "엔드포인트가 빈 서비스 고치기",
    prompt:
      "`prod` 의 서비스 `web` 에 엔드포인트가 하나도 붙지 않는다. 파드 라벨은 `app=web` 인데 서비스 selector 가 다르다. 서비스를 그 자리에서 고쳐라.",
    type: "command",
    answer: "kubectl patch svc web -n prod -p '{\"spec\":{\"selector\":{\"app\":\"web\"}}}'",
    match: {
      argv: ["kubectl", "patch", "service", "web"],
      flags: { namespace: "prod", patch: { matches: "app.*web" } },
      labels: { patch: "`-p` 로 selector 를 `app: web` 으로" }
    },
    hint: "`edit` 로 열어 고쳐도 되지만, 한 줄로 끝내려면 patch 다.",
    explain:
      "엔드포인트가 비었을 때 확인 순서는 ①`kubectl describe svc web -n prod` 의 Selector ②`kubectl get pods -n prod --show-labels` ③둘을 대조. selector 는 불변 필드가 아니라 patch 로 즉시 고쳐진다. 고친 뒤 `kubectl get endpoints web -n prod` 로 파드가 붙었는지 반드시 확인한다.",
    docs: "https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/"
  },
  {
    id: "nw-ingressclass",
    areas: { cka: "network", ckad: "network" },
    level: 1,
    title: "쓸 수 있는 인그레스클래스 확인",
    prompt: "클러스터에 설치된 인그레스클래스를 나열하라.",
    type: "command",
    answer: "kubectl get ingressclass",
    match: { argv: ["kubectl", "get", "ingressclasses"] },
    hint: "인그레스가 아니라 클래스 쪽 리소스다.",
    explain:
      "인그레스를 만들기 전에 이 목록부터 본다. 여기가 비어 있으면 컨트롤러가 없다는 뜻이고, 그때는 인그레스를 아무리 정확히 써도 주소가 붙지 않는다. 이름 옆에 `(default)` 가 붙은 클래스가 있으면 `ingressClassName` 을 생략해도 그쪽으로 간다.",
    docs: "https://kubernetes.io/docs/concepts/services-networking/ingress/"
  },
  {
    id: "nw-coredns-config",
    areas: { cka: "network" },
    level: 2,
    title: "CoreDNS 설정 확인",
    prompt: "클러스터 DNS 가 이상하다. CoreDNS 설정(Corefile)이 담긴 컨피그맵을 YAML 로 출력하라.",
    type: "command",
    answer: "kubectl get configmap coredns -n kube-system -o yaml",
    match: { argv: ["kubectl", "get", "configmaps", "coredns"], flags: { namespace: "kube-system", output: "yaml" } },
    hint: "CoreDNS 설정은 `kube-system` 의 컨피그맵에 들어 있다.",
    explain:
      "DNS 장애의 확인 순서는 ①CoreDNS 파드가 Running 인가(`kubectl get pods -n kube-system -l k8s-app=kube-dns`) ②서비스 `kube-dns` 의 ClusterIP 가 파드의 `/etc/resolv.conf` 와 같은가 ③Corefile 의 `forward` 대상이 살아 있는가. 이 명령은 ③을 본다.",
    docs: "https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/"
  }
]);
