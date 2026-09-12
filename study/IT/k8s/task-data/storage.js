// 스토리지 (CKA 10%) — PV · PVC · StorageClass · 볼륨
window.addK8sTasks("storage", [
  {
    id: "st-pv",
    areas: { cka: "storage" },
    level: 2,
    title: "PersistentVolume 만들기",
    prompt:
      "용량 2Gi, 접근 모드 ReadWriteOnce, 회수 정책 Retain, 스토리지클래스 `manual`, 호스트 경로 `/mnt/data` 인 PV `pv-data` 를 작성하라.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: PersistentVolume\nmetadata:\n  name: pv-data\nspec:\n",
    checks: [
      { label: "용량 2Gi", path: "spec.capacity.storage", equals: "2Gi" },
      { label: "접근 모드 ReadWriteOnce", path: "spec.accessModes", contains: "ReadWriteOnce" },
      { label: "회수 정책 Retain", path: "spec.persistentVolumeReclaimPolicy", equals: "Retain" },
      { label: "스토리지클래스 manual", path: "spec.storageClassName", equals: "manual" },
      { label: "hostPath /mnt/data", path: "spec.hostPath.path", equals: "/mnt/data" }
    ],
    answer:
      "apiVersion: v1\nkind: PersistentVolume\nmetadata:\n  name: pv-data\nspec:\n  capacity:\n    storage: 2Gi\n  accessModes:\n    - ReadWriteOnce\n  persistentVolumeReclaimPolicy: Retain\n  storageClassName: manual\n  hostPath:\n    path: /mnt/data\n",
    hint: "`accessModes` 는 값이 하나여도 리스트다.",
    explain:
      "접근 모드는 '누가 동시에 쓰는가'로 갈린다 — RWO 는 노드 하나(그 노드의 여러 파드는 가능), ROX 는 여러 노드 읽기 전용, RWX 는 여러 노드 읽기·쓰기, RWOP 는 파드 하나. 회수 정책 Retain 은 PVC 를 지워도 데이터를 남기고 PV 를 Released 로 두며, Delete 는 실제 볼륨까지 지운다.",
    docs: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/"
  },
  {
    id: "st-pvc",
    areas: { cka: "storage", ckad: "config" },
    level: 2,
    title: "PersistentVolumeClaim 만들기",
    prompt: "`dev` 네임스페이스에서 위 PV 를 잡을 PVC `data-claim` 을 작성하라. 1Gi, ReadWriteOnce, 스토리지클래스 `manual`.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: data-claim\n  namespace: dev\nspec:\n",
    checks: [
      { label: "접근 모드 ReadWriteOnce", path: "spec.accessModes", contains: "ReadWriteOnce" },
      { label: "요청 용량 1Gi", path: "spec.resources.requests.storage", equals: "1Gi" },
      { label: "스토리지클래스 manual", path: "spec.storageClassName", equals: "manual" }
    ],
    answer:
      "apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: data-claim\n  namespace: dev\nspec:\n  accessModes:\n    - ReadWriteOnce\n  storageClassName: manual\n  resources:\n    requests:\n      storage: 1Gi\n",
    hint: "PVC 는 `capacity` 가 아니라 `resources.requests.storage` 로 요청한다.",
    explain:
      "바인딩 조건은 세 가지가 모두 맞아야 한다 — 접근 모드 포함, PV 용량 ≥ PVC 요청, storageClassName 일치. PVC 가 Pending 이면 `kubectl describe pvc` 의 이벤트가 어느 조건이 어긋났는지 알려준다. PV 는 클러스터 범위, PVC 는 네임스페이스 범위라는 점도 시험 포인트다.",
    docs: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/"
  },
  {
    id: "st-pod-pvc",
    areas: { cka: "storage", ckad: "config" },
    level: 2,
    title: "파드에 PVC 붙이기",
    prompt: "파드 `writer`(이미지 `nginx:1.25`)의 `/usr/share/nginx/html` 에 PVC `data-claim` 을 마운트하라.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: writer\n  namespace: dev\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25\n",
    checks: [
      { label: "볼륨이 PVC 참조", path: "spec.volumes[0].persistentVolumeClaim.claimName", equals: "data-claim" },
      { label: "마운트 경로", path: "spec.containers[0].volumeMounts[0].mountPath", equals: "/usr/share/nginx/html" },
      { label: "볼륨 이름 존재", path: "spec.volumes[0].name", exists: true }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: writer\n  namespace: dev\nspec:\n  volumes:\n    - name: data\n      persistentVolumeClaim:\n        claimName: data-claim\n  containers:\n    - name: web\n      image: nginx:1.25\n      volumeMounts:\n        - name: data\n          mountPath: /usr/share/nginx/html\n",
    hint: "필드 이름은 `claimName` 이다.",
    explain:
      "파드는 PV 를 직접 보지 않고 항상 PVC 를 통한다. PVC 가 아직 Pending 이면 파드도 Pending 에 머물고, describe 에 `pod has unbound immediate PersistentVolumeClaims` 가 찍힌다. 파드와 PVC 는 같은 네임스페이스에 있어야 한다.",
    docs: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/"
  },
  {
    id: "st-storageclass",
    areas: { cka: "storage" },
    level: 3,
    title: "스토리지클래스 작성",
    prompt:
      "프로비저너 `kubernetes.io/no-provisioner`, 볼륨 바인딩 모드 `WaitForFirstConsumer`, 회수 정책 `Retain` 인 스토리지클래스 `local-sc` 를 작성하라.",
    type: "manifest",
    starter: "apiVersion: storage.k8s.io/v1\nkind: StorageClass\nmetadata:\n  name: local-sc\n",
    checks: [
      { label: "프로비저너", path: "provisioner", equals: "kubernetes.io/no-provisioner" },
      { label: "volumeBindingMode", path: "volumeBindingMode", equals: "WaitForFirstConsumer" },
      { label: "reclaimPolicy Retain", path: "reclaimPolicy", equals: "Retain" }
    ],
    answer:
      "apiVersion: storage.k8s.io/v1\nkind: StorageClass\nmetadata:\n  name: local-sc\nprovisioner: kubernetes.io/no-provisioner\nvolumeBindingMode: WaitForFirstConsumer\nreclaimPolicy: Retain\n",
    hint: "스토리지클래스에는 `spec` 이 없다. 필드가 최상위에 온다.",
    explain:
      "`spec:` 아래에 넣는 것이 최다 실수다. StorageClass 는 provisioner·parameters·reclaimPolicy·volumeBindingMode 가 모두 문서 최상위에 온다. `WaitForFirstConsumer` 는 파드가 스케줄될 때까지 바인딩을 미뤄, 볼륨이 파드와 다른 노드에 잡히는 문제를 막는다.",
    docs: "https://kubernetes.io/docs/concepts/storage/storage-classes/"
  },
  {
    id: "st-emptydir",
    areas: { ckad: "design", cka: "storage" },
    level: 2,
    title: "컨테이너 두 개가 같은 디렉터리 공유",
    prompt:
      "파드 `pair` 에 컨테이너 `writer`(`busybox:1.36`)와 `reader`(`busybox:1.36`)를 두고, 둘 다 `/data` 를 공유하게 하라. 파드가 사라지면 데이터도 사라져도 된다.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: pair\nspec:\n  containers:\n",
    checks: [
      { label: "emptyDir 볼륨", path: "spec.volumes[0].emptyDir", exists: true },
      { label: "컨테이너 두 개", path: "spec.containers[1].name", exists: true },
      { label: "writer 마운트 /data", path: "spec.containers[name=writer].volumeMounts[0].mountPath", equals: "/data" },
      { label: "reader 마운트 /data", path: "spec.containers[name=reader].volumeMounts[0].mountPath", equals: "/data" }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: pair\nspec:\n  volumes:\n    - name: shared\n      emptyDir: {}\n  containers:\n    - name: writer\n      image: busybox:1.36\n      command: [\"sh\", \"-c\", \"while true; do date >> /data/log; sleep 5; done\"]\n      volumeMounts:\n        - name: shared\n          mountPath: /data\n    - name: reader\n      image: busybox:1.36\n      command: [\"sh\", \"-c\", \"tail -f /data/log\"]\n      volumeMounts:\n        - name: shared\n          mountPath: /data\n",
    hint: "`emptyDir: {}` 하나를 두 컨테이너가 같은 이름으로 마운트한다.",
    explain:
      "emptyDir 는 파드 수명과 함께 생겼다 사라진다. '두 컨테이너가 파일을 주고받는다'는 지시가 보이면 사이드카 + emptyDir 가 정답 형태다. 노드 재시작이나 파드 삭제 후에도 남아야 한다면 PVC 로 가야 한다 — 이 한 줄이 둘을 가른다.",
    docs: "https://kubernetes.io/docs/concepts/storage/volumes/"
  },
  {
    id: "st-pv-sort",
    areas: { cka: "storage" },
    level: 2,
    title: "PV 를 용량순으로 나열",
    prompt: "클러스터의 PV 를 용량이 작은 순서대로 나열하라.",
    type: "command",
    answer: "kubectl get pv --sort-by=.spec.capacity.storage",
    match: { argv: ["kubectl", "get", "persistentvolumes"], flags: { "sort-by": ".spec.capacity.storage" } },
    hint: "정렬 키는 리소스의 실제 필드 경로다.",
    explain:
      "`--sort-by` 값은 앞에 점이 붙은 JSONPath 이며 필드 경로가 틀리면 조용히 정렬되지 않는다. 경로가 헷갈리면 `kubectl get pv -o yaml` 로 필드 이름을 눈으로 확인한 뒤 옮겨 적는다. 용량은 문자열이라 사전순 정렬이 되는 점도 알아 둔다.",
    docs: "https://kubernetes.io/docs/reference/kubectl/quick-reference/"
  },
  {
    id: "st-subpath",
    areas: { cka: "storage", ckad: "config" },
    level: 3,
    title: "볼륨의 하위 디렉터리만 마운트",
    prompt:
      "파드 `web`(이미지 `nginx:1.25`)에 PVC `data-claim` 을 붙이되, 볼륨 안의 `html` 디렉터리만 `/usr/share/nginx/html` 에 마운트하라.",
    type: "manifest",
    starter: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: web\n  namespace: dev\nspec:\n  containers:\n    - name: web\n      image: nginx:1.25\n",
    checks: [
      { label: "PVC 참조", path: "spec.volumes[0].persistentVolumeClaim.claimName", equals: "data-claim" },
      { label: "마운트 경로", path: "spec.containers[0].volumeMounts[0].mountPath", equals: "/usr/share/nginx/html" },
      { label: "subPath html", path: "spec.containers[0].volumeMounts[0].subPath", equals: "html" }
    ],
    answer:
      "apiVersion: v1\nkind: Pod\nmetadata:\n  name: web\n  namespace: dev\nspec:\n  volumes:\n    - name: data\n      persistentVolumeClaim:\n        claimName: data-claim\n  containers:\n    - name: web\n      image: nginx:1.25\n      volumeMounts:\n        - name: data\n          mountPath: /usr/share/nginx/html\n          subPath: html\n",
    hint: "볼륨 전체가 아니라 그 안의 한 경로만 쓰는 필드가 있다.",
    explain:
      "`subPath` 는 볼륨 하나를 여러 컨테이너가 서로 다른 디렉터리로 나눠 쓸 때, 또는 디렉터리가 아니라 파일 하나만 덮어쓸 때 쓴다. 대신 subPath 로 마운트한 컨피그맵·시크릿은 **원본을 고쳐도 자동 갱신되지 않는다** — 이 한 줄이 subPath 를 쓸지 말지 가르는 기준이다.",
    docs: "https://kubernetes.io/docs/concepts/storage/volumes/"
  },
  {
    id: "st-pvc-expand",
    areas: { cka: "storage" },
    level: 3,
    title: "PVC 용량 늘리기",
    prompt: "`dev` 의 PVC `data-claim` 요청 용량을 `5Gi` 로 늘려라.",
    type: "command",
    answer: "kubectl patch pvc data-claim -n dev -p '{\"spec\":{\"resources\":{\"requests\":{\"storage\":\"5Gi\"}}}}'",
    match: {
      argv: ["kubectl", "patch", "pvc", "data-claim"],
      flags: { namespace: "dev", patch: { matches: "5Gi" } },
      labels: { patch: "`-p` 로 `storage: 5Gi` 지정" }
    },
    hint: "용량은 늘리는 것만 되고, 줄이는 것은 거부된다.",
    explain:
      "확장은 스토리지클래스에 `allowVolumeExpansion: true` 가 있어야 동작한다. 없으면 patch 는 받아들여져도 실제 볼륨은 그대로다. 파일시스템까지 늘어나려면 대개 파드를 다시 띄워야 하고, 그 전까지 PVC 상태는 `FileSystemResizePending` 으로 남는다.",
    docs: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/"
  },
  {
    id: "st-sc-default",
    areas: { cka: "storage" },
    level: 1,
    title: "기본 스토리지클래스 확인",
    prompt: "클러스터의 스토리지클래스를 나열해 어느 것이 기본인지 확인하라.",
    type: "command",
    answer: "kubectl get storageclass",
    match: { argv: ["kubectl", "get", "storageclasses"] },
    hint: "`sc` 로 줄여 써도 된다.",
    explain:
      "출력에서 이름 옆에 `(default)` 가 붙은 것이 기본값이다. PVC 에 `storageClassName` 을 안 적으면 그리로 간다. 기본 지정은 애너테이션 `storageclass.kubernetes.io/is-default-class: \"true\"` 이고, 정적 PV 를 쓰려고 기본 클래스를 피하려면 PVC 에 `storageClassName: \"\"` 를 명시한다 — 빈 문자열과 생략은 뜻이 다르다.",
    docs: "https://kubernetes.io/docs/concepts/storage/storage-classes/"
  },
  {
    id: "st-pv-reclaim-patch",
    areas: { cka: "storage" },
    level: 2,
    title: "PV 회수 정책 바꾸기",
    prompt: "PV `pv-data` 의 회수 정책을 `Retain` 으로 바꿔 PVC 를 지워도 데이터가 남게 하라.",
    type: "command",
    answer: "kubectl patch pv pv-data -p '{\"spec\":{\"persistentVolumeReclaimPolicy\":\"Retain\"}}'",
    match: {
      argv: ["kubectl", "patch", "pv", "pv-data"],
      flags: { patch: { matches: "Retain" } },
      labels: { patch: "`-p` 로 `persistentVolumeReclaimPolicy: Retain`" }
    },
    hint: "PV 는 클러스터 범위라 네임스페이스를 주지 않는다.",
    explain:
      "회수 정책은 PV 가 풀려난 뒤의 처리를 정한다 — `Delete` 는 실제 볼륨까지 지우고, `Retain` 은 데이터를 남긴 채 PV 를 `Released` 로 둔다. Released 상태의 PV 는 그대로는 다시 바인딩되지 않으므로, 재사용하려면 `spec.claimRef` 를 지워야 한다. 동적 프로비저닝 PV 의 기본값은 대개 Delete 이므로 중요한 데이터에는 이 작업이 따라온다.",
    docs: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/"
  },
  {
    id: "st-statefulset",
    areas: { cka: "storage" },
    level: 3,
    title: "파드마다 자기 볼륨을 갖는 스테이트풀셋",
    prompt:
      "레플리카 3인 스테이트풀셋 `db` 를 작성하라. 헤드리스 서비스 이름은 `db`, 이미지는 `nginx:1.25`, 파드마다 1Gi(ReadWriteOnce) 볼륨을 `/data` 에 갖는다.",
    type: "manifest",
    starter: "apiVersion: apps/v1\nkind: StatefulSet\nmetadata:\n  name: db\nspec:\n  serviceName: db\n  replicas: 3\n  selector:\n    matchLabels:\n      app: db\n  template:\n    metadata:\n      labels:\n        app: db\n    spec:\n      containers:\n        - name: db\n          image: nginx:1.25\n",
    checks: [
      { label: "헤드리스 서비스 이름", path: "spec.serviceName", equals: "db" },
      { label: "레플리카 3", path: "spec.replicas", equals: 3 },
      { label: "볼륨 클레임 템플릿 이름", path: "spec.volumeClaimTemplates[0].metadata.name", equals: "data" },
      { label: "요청 용량 1Gi", path: "spec.volumeClaimTemplates[0].spec.resources.requests.storage", equals: "1Gi" },
      { label: "접근 모드 RWO", path: "spec.volumeClaimTemplates[0].spec.accessModes", contains: "ReadWriteOnce" },
      { label: "컨테이너가 같은 이름으로 마운트", path: "spec.template.spec.containers[0].volumeMounts[0].name", equals: "data" }
    ],
    answer:
      "apiVersion: apps/v1\nkind: StatefulSet\nmetadata:\n  name: db\nspec:\n  serviceName: db\n  replicas: 3\n  selector:\n    matchLabels:\n      app: db\n  template:\n    metadata:\n      labels:\n        app: db\n    spec:\n      containers:\n        - name: db\n          image: nginx:1.25\n          volumeMounts:\n            - name: data\n              mountPath: /data\n  volumeClaimTemplates:\n    - metadata:\n        name: data\n      spec:\n        accessModes:\n          - ReadWriteOnce\n        resources:\n          requests:\n            storage: 1Gi\n",
    hint: "`volumeClaimTemplates` 는 `template` 안이 아니라 `spec` 바로 아래, `template` 과 같은 높이에 온다.",
    explain:
      "디플로이먼트와 갈리는 지점은 '파드마다 자기 것이 필요한가'다. 스테이트풀셋은 파드 이름이 `db-0`, `db-1` 로 고정되고 PVC 도 `data-db-0` 처럼 파드마다 하나씩 자동 생성된다. 그래서 파드가 죽었다 살아나도 같은 볼륨을 다시 잡는다. 스테이트풀셋을 지워도 이 PVC 들은 남는다는 점을 기억한다.",
    docs: "https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/"
  }
]);
