// CKA / CKAD 과제은행 로더
// ---------------------------------------------------------------------------
// 이 파일 하나가 (1) 시험·영역 정의 (2) 과제 등록 API (3) 데이터 파일 로드를
// 담당한다. 페이지가 어느 깊이에 있든 document.currentScript 기준으로 경로를
// 잡으므로 허브/연습실/노트 어디서든 같은 태그로 불러 쓸 수 있다.
//
//   <script src="../tasks.js"></script>
//
// 과제 한 건의 형식은 파일 아래쪽 addK8sTasks 주석에 적어 두었다.
// ---------------------------------------------------------------------------

window.K8S_TASKS = [];
window.K8S_TASK_INDEX = new Map();

// 시험별 출제 영역과 가중치. 가중치는 CNCF 공개 커리큘럼의 배점 비율이며
// 모의 세션에서 영역별 문항 수를 뽑을 때 그대로 쓴다.
window.K8S_EXAMS = {
  cka: {
    id: "cka",
    label: "CKA",
    full: "Certified Kubernetes Administrator",
    tagline: "클러스터를 세우고 고치는 쪽",
    minutes: 120,
    taskCountLabel: "15~20문항",
    pass: 66,
    areas: {
      cluster:     { label: "클러스터 아키텍처·설치·구성", short: "클러스터", weight: 25 },
      workloads:   { label: "워크로드·스케줄링",           short: "워크로드", weight: 15 },
      network:     { label: "서비스·네트워킹",             short: "네트워킹", weight: 20 },
      storage:     { label: "스토리지",                    short: "스토리지", weight: 10 },
      troubleshoot:{ label: "트러블슈팅",                  short: "트러블슈팅", weight: 30 }
    }
  },
  ckad: {
    id: "ckad",
    label: "CKAD",
    full: "Certified Kubernetes Application Developer",
    tagline: "애플리케이션을 올리고 굴리는 쪽",
    minutes: 120,
    taskCountLabel: "15~20문항",
    pass: 66,
    areas: {
      design:  { label: "애플리케이션 설계·빌드",        short: "설계·빌드", weight: 20 },
      deploy:  { label: "애플리케이션 배포",              short: "배포",      weight: 20 },
      observe: { label: "관측 가능성·유지보수",           short: "관측",      weight: 15 },
      config:  { label: "환경·구성·보안",                 short: "구성·보안", weight: 25 },
      network: { label: "서비스·네트워킹",                short: "네트워킹",  weight: 20 }
    }
  }
};

window.K8S_LEVELS = {
  1: { label: "기초", hint: "명령 형태를 몸에 붙이는 단계" },
  2: { label: "표준", hint: "실제 시험 문항과 같은 난이도" },
  3: { label: "심화", hint: "조건이 겹치거나 진단이 필요한 문항" }
};

// 고정 모의고사 세트.
// 모의 세션은 기본적으로 배점 비율대로 무작위 출제하지만, 아래 세트를 고르면
// 정해진 과제를 정해진 순서로 낸다. 실제 시험처럼 "한 세트를 끝까지" 도는 용도다.
// tasks 에는 K8S_TASKS 의 id 만 적는다(검증 스크립트가 존재 여부를 확인한다).
window.K8S_MOCKS = [
  {
    id: "cka-1",
    exam: "cka",
    label: "CKA 모의고사 1 — 기본기 훑기",
    tagline: "파드·서비스·디플로이먼트·정적 파드·PV 를 한 바퀴",
    minutes: 60,
    tasks: [
      "cl-context", "cl-namespace", "ds-run-labels", "wl-deploy-create",
      "nw-expose", "nw-nodeport", "cl-nodes-json", "ts-node-os-jsonpath",
      "cl-static-pod", "ts-broken-pod", "st-pv", "cf-cm-literal"
    ]
  },
  {
    id: "cka-2",
    exam: "cka",
    label: "CKA 모의고사 2 — 운영과 복구",
    tagline: "etcd 백업 · CSR 과 RBAC · 노드 관리 · 업그레이드",
    minutes: 70,
    tasks: [
      "cl-etcd-backup", "st-emptydir", "cf-capabilities", "st-pod-pvc",
      "wl-set-image", "cl-csr-approve", "cl-role-create", "cl-rolebinding",
      "ts-dns-check", "cl-static-pod-path", "cl-drain", "cl-kubeadm-upgrade"
    ]
  },
  {
    id: "cka-3",
    exam: "cka",
    label: "CKA 모의고사 3 — 트러블슈팅 집중",
    tagline: "배점이 가장 큰 영역만 몰아서. 증상별 첫 수를 손에 붙인다",
    minutes: 70,
    tasks: [
      "ts-describe-pod", "ts-logs-previous", "ts-events-sort", "ts-endpoints",
      "nw-svc-patch-selector", "ts-node-notready", "ts-kubelet-start",
      "ts-controlplane-pods", "ts-crictl", "ts-pending-all", "ob-debug-node", "ts-answer-file"
    ]
  },
  {
    id: "cka-4",
    exam: "cka",
    label: "CKA 모의고사 4 — 스토리지와 네트워킹",
    tagline: "얇게 나오는 두 영역을 한 세트로 몰아 연습",
    minutes: 70,
    tasks: [
      "st-pvc", "st-storageclass", "st-subpath", "st-sc-default",
      "st-pv-reclaim-patch", "st-statefulset", "st-pvc-expand",
      "nw-ingress", "nw-netpol-deny", "nw-netpol-allow", "nw-externalname", "nw-nodeport-fixed"
    ]
  },
  {
    id: "ckad-1",
    exam: "ckad",
    label: "CKAD 모의고사 1 — 설계와 구성",
    tagline: "멀티컨테이너 패턴 · 구성 주입 · 보안 컨텍스트 · 잡",
    minutes: 60,
    tasks: [
      "ds-run-pod", "ds-dry-run", "ds-command-args", "ds-init-container",
      "ds-sidecar", "st-emptydir", "cf-cm-literal", "cf-envfrom",
      "cf-secret-volume", "cf-securitycontext", "cf-resources", "wl-job-manifest"
    ]
  },
  {
    id: "ckad-2",
    exam: "ckad",
    label: "CKAD 모의고사 2 — 배포·관측·네트워킹",
    tagline: "롤아웃과 전략 · kustomize · Helm · 프로브 · 서비스",
    minutes: 60,
    tasks: [
      "wl-deploy-create", "wl-set-image", "wl-rollout-undo", "wl-strategy",
      "wl-kustomize", "wl-helm-install", "ob-liveness-http", "ob-readiness-exec",
      "ob-logs-container", "ob-top", "nw-expose", "nw-netpol-allow"
    ]
  }
];

const taskLoaderScript = document.currentScript;
const taskDataBase = new URL("./task-data/", taskLoaderScript.src);

// 과제 등록.
//
//   addK8sTasks(group, rows)
//
// group 은 데이터 파일 단위의 묶음 이름이다(화면에는 거의 쓰지 않는다).
// 시험별 소속은 과제마다 areas 로 적는다. 한 과제가 CKA·CKAD 양쪽에
// 속하되 영역 이름이 다른 경우가 많아서 이렇게 나눠 두었다.
//
//   {
//     id:    "wl-deploy-scale",           // 전역 고유. 파일 접두어를 붙인다
//     areas: { cka: "workloads", ckad: "deploy" },   // 빼면 그 시험에서 제외
//     level: 2,                           // 1 기초 · 2 표준 · 3 심화
//     title: "레플리카 수 늘리기",
//     prompt: "화면에 그대로 나가는 과제 지시문",
//     context: "k8s-c1",                  // (선택) 시험처럼 컨텍스트 전환 지시
//     type:  "command" | "manifest",
//
//     // --- type: "command" ---------------------------------------------
//     answer: "kubectl scale deployment web --replicas=5 -n prod",
//     match: {                            // 배열로 주면 그중 하나만 맞아도 정답
//       argv:  ["kubectl", "scale", "deployment", "web"],
//       flags: { replicas: "5", namespace: "prod" },
//       optional: ["record"],             // 있어도 감점 없음(기본 허용이라 생략 가능)
//       forbid: ["filename"],             // 이 플래그를 쓰면 오답 (명령형 강제 등)
//       command: ["sleep", "3600"],       // -- 뒤 인자
//       redirect: "/opt/answer.txt"       // > 리다이렉션 대상
//     },
//
//     // --- type: "manifest" --------------------------------------------
//     starter: "apiVersion: v1\n...",     // 편집기 초기값(빈칸 또는 고장난 매니페스트)
//     checks: [
//       { label: "이미지", path: "spec.containers[0].image", equals: "nginx:1.25" },
//       { label: "포트",   path: "spec.containers[0].ports[0].containerPort", equals: 80 }
//     ],
//     answer: "완성된 YAML 전문",
//
//     // --- 공통 -------------------------------------------------------
//     hint:    "막혔을 때 한 줄",
//     explain: "왜 그렇게 되는지 · 자주 밟는 함정",
//     docs:    "https://kubernetes.io/docs/..."   // 시험 중 열람 가능한 근거 문서
//   }
window.addK8sTasks = (group, rows) => {
  rows.forEach((row, order) => {
    if (window.K8S_TASK_INDEX.has(row.id)) {
      console.warn("[k8s] 과제 ID 중복:", row.id);
      return;
    }
    const task = {
      level: 2,
      type: "command",
      areas: {},
      ...row,
      group,
      order,
      exams: Object.keys(row.areas || {})
    };
    window.K8S_TASKS.push(task);
    window.K8S_TASK_INDEX.set(task.id, task);
  });
};

// 과제 데이터 파일. 새 파일을 만들면 여기에 등록한다.
[
  "cka-cluster.js",
  "cka-troubleshoot.js",
  "workloads.js",
  "config.js",
  "network.js",
  "storage.js",
  "observe.js",
  "design.js"
].forEach((filename) => {
  const src = new URL(filename, taskDataBase).href;
  document.write(`<script src="${src}"><\/script>`);
});
