// 환경 · 구성 · 보안 (CKAD 25%) — ConfigMap · Secret · SecurityContext · 자원 제한
window.addK8sTasks("config", [
  {
    id: "cf-cm-literal",
    areas: { ckad: "config", cka: "workloads" },
    level: 1,
    title: "값으로 컨피그맵 만들기",
    prompt: "`dev` 에 `MODE=prod`, `LEVEL=info` 두 항목을 담은 컨피그맵 `app-cfg` 를 만들어라.",
    type: "command",
    answer: "kubectl create configmap app-cfg --from-literal=MODE=prod --from-literal=LEVEL=info -n dev",
    match: { argv: ["kubectl", "create", "configmap", "app-cfg"], flags: { "from-literal": { all: ["MODE=prod", "LEVEL=info"] }, namespace: "dev" } },
    hint: "항목마다 플래그를 한 번씩 준다.",
    explain:
      "컨피그맵 생성 방식 세 가지는 출처로 갈린다 — `--from-literal`(값 직접), `--from-file`(파일 이름이 키), `--from-env-file`(파일 안의 KEY=VALUE 가 각각 키). 파일 하나를 통째로 한 키에 넣고 싶으면 `--from-file=키이름=경로` 로 키를 지정한다.",
    docs: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/"
  },
  {
    id: "cf-secret-generic",
    areas: { ckad: "config", cka: "cluster" },
    level: 1,
    title: "시크릿 만들기",
    prompt: "`dev` 에 키 `password`, 값 `s3cret` 인 시크릿 `db-cred` 를 만들어라.",
    type: "command",
    answer: "kubectl create secret generic db-cred --from-literal=password=s3cret -n dev",
    match: { argv: ["kubectl", "create", "secret", "generic", "db-cred"], flags: { "from-literal": "password=s3cret", namespace: "dev" } },
    hint: "시크릿에는 타입이 필요하다. 일반 값은 `generic`.",
    explain:
      "타입은 세 갈래다 — `generic`(임의의 키·값), `docker-registry`(이미지 풀 시크릿), `tls`(인증서 쌍). 명령형으로 만들면 base64 인코딩을 kubectl 이 대신 해 주지만, YAML 로 직접 쓸 때는 `data` 에 base64 값을, `stringData` 에 평문을 넣는다는 차이를 기억한다.",
    docs: "https://kubernetes.io/docs/concepts/configuration/secret/"
  },
  {
    id: "cf-secret-decode",
    areas: { ckad: "config", cka: "troubleshoot" },
    level: 2,
    title: "시크릿 값 확인",
    prompt: "`dev` 의 시크릿 `db-cred` 에 든 `password` 의 평문 값을 확인하라.",
    type: "command",
    answer: "kubectl get secret db-cred -n dev -o jsonpath='{.data.password}' | base64 -d",
    match: {
      argv: ["kubectl", "get", "secrets", "db-cred"],
      flags: { namespace: "dev", output: { matches: "jsonpath" } }
    },
    hint: "`-o jsonpath` 로 값만 뽑고 파이프로 디코딩한다.",
    explain:
      "`kubectl get secret -o yaml` 의 값은 base64 이므로 그대로 읽으면 안 된다. 자주 쓰면 `kubectl get secret db-cred -n dev -o go-template='{{.data.password|base64decode}}'` 한 줄도 편하다. base64 는 암호화가 아니라 인코딩일 뿐이라는 점이 개념 문항의 단골이다.",
    docs: "https://kubernetes.io/docs/concepts/configuration/secret/"
  },
  {
    id: "cf-quota",
    areas: { cka: "cluster", ckad: "config" },
    level: 2,
    title: "리소스쿼터 걸기",
    prompt: "`dev` 네임스페이스에 메모리 요청 합 1Gi, 한계 합 2Gi 를 넘지 못하게 하는 쿼터 `mem-quota` 를 만들어라.",
    type: "command",
    answer: "kubectl create quota mem-quota --hard=requests.memory=1Gi,limits.memory=2Gi -n dev",
    match: { argv: ["kubectl", "create", "resourcequotas", "mem-quota"], flags: { hard: { matches: "requests\\.memory=1Gi" }, namespace: "dev" } },
    hint: "`--hard` 안에 항목을 쉼표로 이어 붙인다.",
    explain:
      "쿼터가 걸린 네임스페이스에서는 requests·limits 를 적지 않은 파드가 아예 생성되지 않는다. 그래서 쿼터 문항 뒤에는 파드 생성 실패가 따라오는데, 답은 파드에 자원 값을 넣거나 LimitRange 로 기본값을 주는 것이다. 쿼터는 네임스페이스 총합, LimitRange 는 컨테이너 하나의 상·하한 — 이 구분이 기준이다.",
    docs: "https://kubernetes.io/docs/concepts/policy/resource-quotas/"
  },
  {
    id: "cf-envfrom",
    areas: { ckad: "config" },
    level: 2,
    title: "컨피그맵을 환경변수로 통째 주입",
    prompt:
      "파드 `app` 의 컨테이너에 컨피그맵 `app-cfg` 의 모든 키를 환경변수로 주입하고, 시크릿 `db-cred` 의 `password` 는 환경변수 `DB_PASSWORD` 로 주입하라. 이미지는 `nginx:1.25`.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: app\nspec:\n  containers:\n    - name: app\n      image: nginx:1.25\n",
    checks: [
      { label: "envFrom 으로 컨피그맵 참조", path: "spec.containers[0].envFrom[0].configMapRef.name", equals: "app-cfg" },
      { label: "환경변수 이름 DB_PASSWORD", path: "spec.containers[0].env[0].name", equals: "DB_PASSWORD" },
      { label: "시크릿 이름 참조", path: "spec.containers[0].env[0].valueFrom.secretKeyRef.name", equals: "db-cred" },
      { label: "시크릿 키 password", path: "spec.containers[0].env[0].valueFrom.secretKeyRef.key", equals: "password" }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: app\nspec:\n  containers:\n    - name: app\n      image: nginx:1.25\n      envFrom:\n        - configMapRef:\n            name: app-cfg\n      env:\n        - name: DB_PASSWORD\n          valueFrom:\n            secretKeyRef:\n              name: db-cred\n              key: password\n",
    hint: "전체를 넣을 때는 `envFrom`, 키 하나를 골라 이름을 바꿔 넣을 때는 `env[].valueFrom`.",
    explain:
      "`envFrom` 은 키 이름을 그대로 환경변수 이름으로 쓰고, `env[].valueFrom` 은 이름을 새로 지을 수 있다. '컨피그맵의 어떤 키를 다른 이름의 환경변수로' 라는 지시가 보이면 무조건 후자다. 환경변수로 주입한 값은 컨피그맵을 고쳐도 갱신되지 않는다 — 볼륨으로 마운트한 경우만 갱신된다.",
    docs: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/"
  },
  {
    id: "cf-secret-volume",
    areas: { ckad: "config" },
    level: 2,
    title: "시크릿을 파일로 마운트",
    prompt: "파드 `app`(이미지 `nginx:1.25`)의 `/etc/creds` 경로에 시크릿 `db-cred` 를 읽기 전용으로 마운트하라.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: app\nspec:\n  containers:\n    - name: app\n      image: nginx:1.25\n",
    checks: [
      { label: "볼륨이 시크릿 참조", path: "spec.volumes[0].secret.secretName", equals: "db-cred" },
      { label: "마운트 경로 /etc/creds", path: "spec.containers[0].volumeMounts[0].mountPath", equals: "/etc/creds" },
      { label: "읽기 전용", path: "spec.containers[0].volumeMounts[0].readOnly", equals: true },
      { label: "볼륨 이름이 마운트와 일치", path: "spec.volumes[0].name", exists: true }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: app\nspec:\n  volumes:\n    - name: creds\n      secret:\n        secretName: db-cred\n  containers:\n    - name: app\n      image: nginx:1.25\n      volumeMounts:\n        - name: creds\n          mountPath: /etc/creds\n          readOnly: true\n",
    hint: "볼륨 정의는 `spec.volumes`, 사용은 `containers[].volumeMounts`. 두 곳의 `name` 이 같아야 한다.",
    explain:
      "필드 이름이 다르다는 점이 함정이다 — 시크릿 볼륨은 `secretName`, 컨피그맵 볼륨은 `name` 이다. 마운트하면 키마다 파일 하나가 생기고(`/etc/creds/password`), 컨피그맵·시크릿을 수정하면 파일 내용은 자동으로 갱신된다.",
    docs: "https://kubernetes.io/docs/concepts/storage/volumes/"
  },
  {
    id: "cf-securitycontext",
    areas: { ckad: "config" },
    level: 3,
    title: "보안 컨텍스트 지정",
    prompt:
      "파드 `hardened`(이미지 `nginx:1.25`)를 UID 1000, GID 3000 으로 실행하고, 컨테이너가 권한 상승을 하지 못하게 하라.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: hardened\nspec:\n  containers:\n    - name: app\n      image: nginx:1.25\n",
    checks: [
      { label: "runAsUser 1000", path: "spec.securityContext.runAsUser", equals: 1000 },
      { label: "runAsGroup 또는 fsGroup 3000", path: "spec.securityContext.runAsGroup", equals: 3000 },
      { label: "allowPrivilegeEscalation false", path: "spec.containers[0].securityContext.allowPrivilegeEscalation", equals: false }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: hardened\nspec:\n  securityContext:\n    runAsUser: 1000\n    runAsGroup: 3000\n  containers:\n    - name: app\n      image: nginx:1.25\n      securityContext:\n        allowPrivilegeEscalation: false\n",
    hint: "`securityContext` 는 파드 레벨과 컨테이너 레벨 두 곳에 있다. 필드마다 놓이는 자리가 다르다.",
    explain:
      "파드 레벨에만 있는 것은 `fsGroup`, 컨테이너 레벨에만 있는 것은 `allowPrivilegeEscalation`·`capabilities`·`privileged` 다. `runAsUser` 처럼 양쪽에 다 있는 필드는 컨테이너 쪽이 이긴다. 능력 추가는 `capabilities: {add: [\"NET_ADMIN\"]}` 형태로 컨테이너에만 쓴다.",
    docs: "https://kubernetes.io/docs/tasks/configure-pod-container/security-context/"
  },
  {
    id: "cf-resources",
    areas: { ckad: "config", cka: "workloads" },
    level: 2,
    title: "요청과 한계 지정",
    prompt:
      "파드 `sized`(이미지 `nginx:1.25`)에 CPU 요청 200m·한계 500m, 메모리 요청 256Mi·한계 512Mi 를 지정하라.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: sized\nspec:\n  containers:\n    - name: app\n      image: nginx:1.25\n",
    checks: [
      { label: "CPU 요청 200m", path: "spec.containers[0].resources.requests.cpu", equals: "200m" },
      { label: "메모리 요청 256Mi", path: "spec.containers[0].resources.requests.memory", equals: "256Mi" },
      { label: "CPU 한계 500m", path: "spec.containers[0].resources.limits.cpu", equals: "500m" },
      { label: "메모리 한계 512Mi", path: "spec.containers[0].resources.limits.memory", equals: "512Mi" }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: sized\nspec:\n  containers:\n    - name: app\n      image: nginx:1.25\n      resources:\n        requests:\n          cpu: 200m\n          memory: 256Mi\n        limits:\n          cpu: 500m\n          memory: 512Mi\n",
    hint: "`resources` 는 파드가 아니라 컨테이너 안에 들어간다.",
    explain:
      "requests 는 스케줄러가 노드를 고를 때 쓰는 예약값이고, limits 는 런타임 상한이다. 메모리가 한계를 넘으면 컨테이너는 OOMKilled 로 죽고, CPU 는 죽지 않고 스로틀만 걸린다 — 이 차이가 진단의 기준이다. `Mi`(2진)와 `M`(10진)을 섞어 쓰지 않는다.",
    docs: "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/"
  },
  {
    id: "cf-sa-pod",
    areas: { ckad: "config", cka: "cluster" },
    level: 2,
    title: "파드에 서비스어카운트 붙이기",
    prompt: "파드 `agent`(이미지 `nginx:1.25`)가 서비스어카운트 `ci-bot` 으로 API 에 접근하게 하고, 토큰 자동 마운트는 끄지 말고 그대로 둔다.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: agent\nspec:\n  containers:\n    - name: agent\n      image: nginx:1.25\n",
    checks: [
      { label: "serviceAccountName ci-bot", path: "spec.serviceAccountName", equals: "ci-bot" },
      { label: "이미지", path: "spec.containers[0].image", equals: "nginx:1.25" }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: agent\nspec:\n  serviceAccountName: ci-bot\n  containers:\n    - name: agent\n      image: nginx:1.25\n",
    hint: "필드 이름은 `serviceAccount` 가 아니라 `serviceAccountName` 이다.",
    explain:
      "지정하지 않으면 그 네임스페이스의 `default` 서비스어카운트가 붙는다. 토큰은 `/var/run/secrets/kubernetes.io/serviceaccount/` 에 마운트되며, 필요 없으면 `automountServiceAccountToken: false` 로 끈다. RBAC 문항은 대개 '서비스어카운트 생성 → Role → RoleBinding → 파드에 붙이기 → can-i 로 확인' 네 단계가 한 세트다.",
    docs: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/"
  }
]);
