window.addK8sNotes("ops-debug", [
  {
    id: "debugging",
    title: "디버깅 — 상태별 첫 수",
    tagline: "증상을 보고 다음 한 명령을 정한다",
    exams: ["cka", "ckad"],
    topics: ["디버깅", "트러블슈팅"],
    summary:
      "트러블슈팅은 지식이 아니라 **순서**다. 파드 상태 하나만 보면 다음에 칠 명령이 정해진다.",
    sections: [
      {
        heading: "1. 상태 → 명령",
        table: {
          head: ["상태", "첫 명령", "흔한 원인"],
          rows: [
            ["Pending", "`describe pod`", "자원 부족 · 테인트 · 노드셀렉터 · PVC 미바인딩"],
            ["ContainerCreating", "`describe pod`", "볼륨 마운트 실패 · 시크릿/컨피그맵 없음"],
            ["ImagePullBackOff", "`describe pod`", "이미지 이름·태그 오타 · 레지스트리 인증"],
            ["CrashLoopBackOff", "`logs --previous`", "앱이 즉시 종료 · 커맨드 오류 · 설정 누락"],
            ["Running 인데 접속 불가", "`get endpoints`", "readiness 실패 · selector/targetPort 불일치 · 네트워크폴리시"],
            ["OOMKilled", "`describe pod`", "메모리 limit 초과"],
            ["Terminating 에서 멈춤", "`get pod -o yaml`", "finalizer"]
          ]
        },
        tip: "`describe` 출력은 맨 아래 Events 부터 읽는다. 대부분의 답이 거기 한 줄로 적혀 있다."
      },
      {
        heading: "2. 손에 붙여 둘 명령",
        code:
          "k logs api -n web --previous\nk logs api -n web -c sidecar --tail=50\nk get events -n web --sort-by=.metadata.creationTimestamp\nk exec -it api -n web -- sh\nk debug -it api --image=busybox --target=api      # 셸 없는 이미지\nk debug node/node01 -it --image=busybox           # 노드 진입\nk top pod -n web --sort-by=cpu"
      },
      {
        heading: "3. 클러스터가 통째로 이상할 때",
        list: [
          "노드 NotReady → 그 노드에서 `systemctl status kubelet`, `journalctl -u kubelet`",
          "kubectl 자체가 안 됨 → 컨트롤플레인 노드에서 `crictl ps -a`, `crictl logs <id>`",
          "컨트롤플레인 구성요소는 `/etc/kubernetes/manifests/` 의 정적 파드다. YAML 오타 하나로 안 뜬다",
          "인증서 만료 → `kubeadm certs check-expiration`",
          "DNS 이상 → `kubectl get pods -n kube-system -l k8s-app=kube-dns` 와 CoreDNS 로그"
        ],
        tip: "kubelet 은 systemd 서비스, 컨트롤플레인은 정적 파드 — 이 구분을 잡고 있어야 어느 도구로 볼지 헷갈리지 않는다."
      }
    ],
    exam: [
      "CrashLoopBackOff 에 `--previous` 를 빼면 빈 로그를 보게 된다",
      "이벤트 기본 보존은 1시간. 오래된 장애는 이벤트에 남아 있지 않다",
      "고친 뒤에는 반드시 파드가 Ready 로 바뀌는 것까지 확인한다"
    ]
  },

  {
    id: "cluster-ops",
    title: "클러스터 운영 (CKA)",
    tagline: "kubeadm · etcd · 노드 · 인증",
    exams: ["cka"],
    topics: ["kubeadm", "etcd", "노드관리", "RBAC"],
    summary:
      "CKA 고유 영역이다. 명령 자체보다 **순서**가 점수다. 순서를 통째로 외워 두면 문항 하나를 5분에 끝낼 수 있다.",
    sections: [
      {
        heading: "1. 업그레이드 순서",
        list: [
          "① 컨트롤플레인에서 kubeadm 패키지 업그레이드",
          "② `kubeadm upgrade plan` 으로 확인",
          "③ `kubeadm upgrade apply v1.32.1`",
          "④ kubelet·kubectl 패키지 업그레이드 → `systemctl daemon-reload && systemctl restart kubelet`",
          "⑤ 워커는 `kubectl drain <노드> --ignore-daemonsets` → `kubeadm upgrade node` → kubelet 업그레이드 → `kubectl uncordon <노드>`"
        ],
        tip: "kubeadm 만 올리고 kubelet 을 안 올리면 `kubectl get nodes` 의 버전이 그대로다. 업그레이드 문항은 마지막에 반드시 버전을 확인한다."
      },
      {
        heading: "2. etcd 백업과 복구",
        code:
          "ETCDCTL_API=3 etcdctl snapshot save /opt/etcd-backup.db \\\n  --endpoints=https://127.0.0.1:2379 \\\n  --cacert=/etc/kubernetes/pki/etcd/ca.crt \\\n  --cert=/etc/kubernetes/pki/etcd/server.crt \\\n  --key=/etc/kubernetes/pki/etcd/server.key\n\nETCDCTL_API=3 etcdctl snapshot status /opt/etcd-backup.db --write-out=table\n\nETCDCTL_API=3 etcdctl snapshot restore /opt/etcd-backup.db \\\n  --data-dir=/var/lib/etcd-restore",
        list: [
          "인증서 경로는 외우지 말고 `kubectl -n kube-system describe pod etcd-<노드>` 의 실행 인자에서 복사",
          "복구는 파일을 푸는 것까지다. 반영하려면 `/etc/kubernetes/manifests/etcd.yaml` 의 hostPath 를 새 디렉터리로 바꾼다",
          "복구 명령에는 인증서 플래그가 필요 없다(서버에 접속하지 않는다)"
        ]
      },
      {
        heading: "3. 노드 관리",
        code:
          "k drain node01 --ignore-daemonsets --delete-emptydir-data\nk cordon node01\nk uncordon node01\nkubeadm token create --print-join-command",
        list: [
          "drain = cordon + 기존 파드 축출. DaemonSet 파드는 무시하라고 알려줘야 멈추지 않는다",
          "drain 이 끝나지 않으면 PodDisruptionBudget 을 확인한다",
          "점검이 끝나면 uncordon 을 잊지 않는다"
        ]
      },
      {
        heading: "4. RBAC 네 단계",
        code:
          "k create serviceaccount ci-bot -n dev\nk create role pod-reader --verb=get,list,watch --resource=pods -n dev\nk create rolebinding ci-read --role=pod-reader --serviceaccount=dev:ci-bot -n dev\nk auth can-i list pods --as=system:serviceaccount:dev:ci-bot -n dev",
        list: [
          "Role/RoleBinding 은 네임스페이스 범위, ClusterRole/ClusterRoleBinding 은 클러스터 범위",
          "노드·PV·네임스페이스처럼 네임스페이스에 속하지 않는 리소스는 Role 로 줄 수 없다",
          "RoleBinding 이 ClusterRole 을 참조하는 것은 가능(그 네임스페이스에서만 적용), 반대는 불가",
          "마무리는 언제나 `auth can-i` 로 확인"
        ]
      }
    ],
    exam: [
      "업그레이드·백업 문항은 순서를 외운 사람이 압도적으로 빠르다",
      "`--ignore-daemonsets` 와 `--delete-emptydir-data` 가 빠지면 drain 이 중간에 멈춘다",
      "정적 파드는 파일을 지워야 지워진다 — `kubectl delete pod` 로는 되살아난다"
    ]
  }
]);
