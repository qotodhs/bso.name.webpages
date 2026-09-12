// 공식 문서 고정 링크
// 시험 중 열 수 있는 곳과, 실제로 가장 자주 여는 페이지를 한곳에 모았다.
// 허브·연습실·노트가 모두 이 파일을 불러 같은 목록을 그린다.
window.K8S_DOCS = [
  {
    group: "시험 중 열 수 있는 곳",
    note: "브라우저 탭 하나만 허용된다. 허용 도메인은 회차마다 바뀔 수 있으니 응시 전 시험 안내를 다시 확인한다.",
    links: [
      { label: "kubernetes.io/docs", url: "https://kubernetes.io/docs/", note: "문서 홈 · 여기서 검색한다" },
      { label: "kubernetes.io/blog", url: "https://kubernetes.io/blog/", note: "블로그" },
      { label: "helm.sh/docs", url: "https://helm.sh/docs/", note: "CKAD 한정" }
    ]
  },
  {
    group: "가장 자주 여는 페이지",
    links: [
      { label: "kubectl 치트시트", url: "https://kubernetes.io/docs/reference/kubectl/quick-reference/", note: "명령형 예제가 가장 빽빽한 페이지" },
      { label: "kubectl 명령 레퍼런스", url: "https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands", note: "플래그 전체" },
      { label: "Pod API 레퍼런스", url: "https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/", note: "필드 이름·타입 확인" },
      { label: "kustomize", url: "https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/", note: "kubectl -k" }
    ]
  },
  {
    group: "주제별 예제",
    note: "예제 YAML 을 복사해 고치는 편이 처음부터 쓰는 것보다 빠르다.",
    links: [
      { label: "ConfigMap", url: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/" },
      { label: "Secret", url: "https://kubernetes.io/docs/concepts/configuration/secret/" },
      { label: "프로브", url: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/" },
      { label: "SecurityContext", url: "https://kubernetes.io/docs/tasks/configure-pod-container/security-context/" },
      { label: "볼륨 · PV · PVC", url: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/" },
      { label: "StorageClass", url: "https://kubernetes.io/docs/concepts/storage/storage-classes/" },
      { label: "Service", url: "https://kubernetes.io/docs/concepts/services-networking/service/" },
      { label: "Ingress", url: "https://kubernetes.io/docs/concepts/services-networking/ingress/" },
      { label: "NetworkPolicy", url: "https://kubernetes.io/docs/concepts/services-networking/network-policies/" },
      { label: "Deployment", url: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/" },
      { label: "Job · CronJob", url: "https://kubernetes.io/docs/concepts/workloads/controllers/job/" },
      { label: "테인트 · 톨러레이션", url: "https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/" },
      { label: "RBAC", url: "https://kubernetes.io/docs/reference/access-authn-authz/rbac/" },
      { label: "kubeadm 업그레이드", url: "https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/" },
      { label: "etcd 백업 · 복구", url: "https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/" },
      { label: "파드 디버깅", url: "https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/" }
    ]
  }
];

// 지정한 엘리먼트에 링크 묶음을 그린다. open 을 주면 펼친 상태로 시작한다.
window.renderK8sDocs = (target, options) => {
  const host = typeof target === "string" ? document.getElementById(target) : target;
  if (!host) return;
  const settings = options || {};
  const escape = (text) => String(text == null ? "" : text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  host.innerHTML = `<details class="docs-panel"${settings.open ? " open" : ""}>
    <summary>
      <span>공식 문서 고정 링크</span>
      <small>시험에서도 열 수 있는 곳입니다</small>
    </summary>
    ${window.K8S_DOCS.map((section) => `
      <div class="docs-group">
        <p class="docs-group-title">${escape(section.group)}</p>
        ${section.note ? `<p class="docs-group-note">${escape(section.note)}</p>` : ""}
        <div class="docs-chips">
          ${section.links.map((link) => `
            <a class="docs-chip" href="${link.url}" target="_blank" rel="noopener"
               title="${escape(link.note || link.url)}">
              ${escape(link.label)}${link.note ? `<small>${escape(link.note)}</small>` : ""}
            </a>`).join("")}
        </div>
      </div>`).join("")}
  </details>`;
};

// 과제의 근거 문서마다 "무엇으로 검색하면 그 페이지가 나오는가" 를 적어 둔다.
// 힌트에 함께 보여 주어, 답을 외우는 대신 찾아가는 경로를 익히게 한다.
// 키가 되는 URL 은 과제의 docs 값과 정확히 같아야 한다(검증 스크립트가 확인한다).
const B = "https://kubernetes.io/docs/";
window.K8S_DOC_HINTS = {
  [B + "reference/kubectl/quick-reference/"]: { keyword: "kubectl cheat sheet", page: "kubectl 치트시트" },
  [B + "reference/kubectl/generated/kubectl_config/"]: { keyword: "kubectl config use-context", page: "kubectl config" },
  [B + "reference/kubectl/generated/kubectl_top/"]: { keyword: "kubectl top", page: "kubectl top" },
  [B + "reference/kubectl/jsonpath/"]: { keyword: "jsonpath", page: "JSONPath 지원" },
  [B + "reference/kubectl/#resource-types"]: { keyword: "kubectl resource types", page: "리소스 종류와 축약" },
  [B + "reference/access-authn-authz/rbac/"]: { keyword: "rbac", page: "RBAC 인가" },
  [B + "reference/access-authn-authz/authorization/"]: { keyword: "auth can-i", page: "인가 개요" },
  [B + "reference/access-authn-authz/certificate-signing-requests/"]: { keyword: "certificate signing request", page: "CSR" },
  [B + "reference/setup-tools/kubeadm/kubeadm-token/"]: { keyword: "kubeadm token create", page: "kubeadm token" },
  [B + "concepts/overview/working-with-objects/namespaces/"]: { keyword: "namespaces", page: "네임스페이스" },
  [B + "concepts/overview/working-with-objects/labels/"]: { keyword: "labels and selectors", page: "라벨과 셀렉터" },
  [B + "concepts/overview/working-with-objects/annotations/"]: { keyword: "annotations", page: "애너테이션" },
  [B + "concepts/overview/working-with-objects/field-selectors/"]: { keyword: "field selectors", page: "필드 셀렉터" },
  [B + "concepts/workloads/controllers/deployment/"]: { keyword: "deployment", page: "Deployment" },
  [B + "concepts/workloads/controllers/daemonset/"]: { keyword: "daemonset", page: "DaemonSet" },
  [B + "concepts/workloads/controllers/statefulset/"]: { keyword: "statefulset", page: "StatefulSet" },
  [B + "concepts/workloads/controllers/job/"]: { keyword: "job", page: "Job" },
  [B + "concepts/workloads/controllers/cron-jobs/"]: { keyword: "cronjob", page: "CronJob" },
  [B + "concepts/workloads/pods/init-containers/"]: { keyword: "init containers", page: "초기화 컨테이너" },
  [B + "concepts/workloads/pods/sidecar-containers/"]: { keyword: "sidecar containers", page: "사이드카 컨테이너" },
  [B + "concepts/scheduling-eviction/taint-and-toleration/"]: { keyword: "taint and toleration", page: "테인트·톨러레이션" },
  [B + "concepts/scheduling-eviction/assign-pod-node/"]: { keyword: "assign pods to nodes", page: "nodeSelector·어피니티" },
  [B + "concepts/configuration/secret/"]: { keyword: "secret", page: "Secret" },
  [B + "concepts/configuration/manage-resources-containers/"]: { keyword: "resource requests limits", page: "자원 요청과 한계" },
  [B + "concepts/policy/resource-quotas/"]: { keyword: "resource quota", page: "ResourceQuota" },
  [B + "concepts/policy/limit-range/"]: { keyword: "limit range", page: "LimitRange" },
  [B + "concepts/storage/persistent-volumes/"]: { keyword: "persistent volumes", page: "PV · PVC" },
  [B + "concepts/storage/storage-classes/"]: { keyword: "storage classes", page: "StorageClass" },
  [B + "concepts/storage/volumes/"]: { keyword: "volumes", page: "볼륨" },
  [B + "concepts/services-networking/service/"]: { keyword: "service", page: "Service" },
  [B + "concepts/services-networking/ingress/"]: { keyword: "ingress", page: "Ingress" },
  [B + "concepts/services-networking/network-policies/"]: { keyword: "network policy", page: "NetworkPolicy" },
  [B + "concepts/services-networking/dns-pod-service/"]: { keyword: "dns for services and pods", page: "서비스·파드 DNS" },
  [B + "tasks/configure-pod-container/configure-pod-configmap/"]: { keyword: "configure pod configmap", page: "컨피그맵 주입" },
  [B + "tasks/configure-pod-container/configure-liveness-readiness-startup-probes/"]: { keyword: "liveness readiness probes", page: "프로브 설정" },
  [B + "tasks/configure-pod-container/security-context/"]: { keyword: "security context", page: "SecurityContext" },
  [B + "tasks/configure-pod-container/configure-service-account/"]: { keyword: "service account for pod", page: "파드의 서비스어카운트" },
  [B + "tasks/configure-pod-container/static-pod/"]: { keyword: "static pod", page: "정적 파드" },
  [B + "tasks/inject-data-application/define-command-argument-container/"]: { keyword: "define command argument", page: "command 와 args" },
  [B + "tasks/manage-kubernetes-objects/kustomization/"]: { keyword: "kustomize", page: "Kustomize" },
  [B + "tasks/access-application-cluster/port-forward-access-application-cluster/"]: { keyword: "port forward", page: "포트 포워딩" },
  [B + "tasks/run-application/horizontal-pod-autoscale/"]: { keyword: "horizontal pod autoscale", page: "HPA" },
  [B + "tasks/run-application/configure-pdb/"]: { keyword: "pod disruption budget", page: "PDB" },
  [B + "tasks/administer-cluster/configure-upgrade-etcd/"]: { keyword: "etcd backup", page: "etcd 운영" },
  [B + "tasks/administer-cluster/safely-drain-node/"]: { keyword: "drain node", page: "노드 비우기" },
  [B + "tasks/administer-cluster/kubeadm/kubeadm-upgrade/"]: { keyword: "kubeadm upgrade", page: "kubeadm 업그레이드" },
  [B + "tasks/administer-cluster/kubeadm/kubeadm-certs/"]: { keyword: "kubeadm certs", page: "인증서 관리" },
  [B + "tasks/administer-cluster/dns-debugging-resolution/"]: { keyword: "dns debugging resolution", page: "DNS 진단" },
  [B + "tasks/debug/debug-application/"]: { keyword: "debug application", page: "애플리케이션 디버깅" },
  [B + "tasks/debug/debug-application/debug-running-pod/"]: { keyword: "debug running pod", page: "실행 중 파드 디버깅" },
  [B + "tasks/debug/debug-application/debug-service/"]: { keyword: "debug service", page: "서비스 디버깅" },
  [B + "tasks/debug/debug-cluster/"]: { keyword: "troubleshoot clusters", page: "클러스터 진단" },
  [B + "tasks/debug/debug-cluster/crictl/"]: { keyword: "crictl", page: "crictl 사용법" },
  [B + "tasks/debug/debug-cluster/kubectl-node-debug/"]: { keyword: "kubectl debug node", page: "노드 디버깅" },
  "https://helm.sh/docs/intro/using_helm/": { keyword: "using helm", page: "Helm 사용법", site: "helm.sh/docs" }
};

// 문서 링크 하나에 대한 검색 안내. 등록돼 있지 않으면 URL 마지막 조각으로 만든다.
window.k8sDocHint = (url) => {
  if (!url) return null;
  const known = window.K8S_DOC_HINTS[url];
  if (known) return { ...known, url, site: known.site || "kubernetes.io/docs" };
  const slug = String(url).replace(/[#?].*$/, "").replace(/\/$/, "").split("/").pop() || "";
  return {
    keyword: slug.replace(/-/g, " "),
    page: slug.replace(/-/g, " "),
    url,
    site: url.includes("helm.sh") ? "helm.sh/docs" : "kubernetes.io/docs"
  };
};
