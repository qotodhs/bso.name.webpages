window.addK8sNotes("network-storage", [
  {
    id: "networking",
    title: "서비스와 네트워킹",
    tagline: "누가 어디까지 접근하는가로 갈린다",
    exams: ["cka", "ckad"],
    topics: ["서비스", "인그레스", "네트워크폴리시", "DNS"],
    summary:
      "서비스 타입은 기능이 아니라 **접근 범위**로 갈린다. 안에서만 → ClusterIP, 노드 포트로 → NodePort, 외부 LB → LoadBalancer, 이름만 넘김 → ExternalName.",
    sections: [
      {
        heading: "1. 포트 세 개를 구분한다",
        table: {
          head: ["필드", "누구의 포트", "메모"],
          rows: [
            ["`port`", "서비스가 여는 포트", "클러스터 안에서 부르는 번호"],
            ["`targetPort`", "파드 컨테이너의 포트", "생략하면 `port` 와 같아진다"],
            ["`nodePort`", "노드의 포트", "30000~32767, NodePort/LoadBalancer 만"]
          ]
        },
        code: "k expose deployment web --name=web-svc --port=80 --target-port=8080\nk get endpoints web-svc      # 파드가 실제로 붙었는지",
        tip: "서비스가 안 되는 문항의 원인은 거의 항상 셋 중 하나다 — selector 라벨 불일치, targetPort 불일치, 파드가 Ready 아님. 순서대로 `describe svc` → `get endpoints` → `describe pod` 로 좁힌다."
      },
      {
        heading: "2. DNS 이름",
        list: [
          "서비스 — `<서비스>.<네임스페이스>.svc.cluster.local`. 같은 네임스페이스면 `<서비스>` 만으로 충분",
          "헤드리스(`clusterIP: None`) — 가상 IP 없이 파드 IP 목록을 그대로 돌려준다",
          "스테이트풀셋 파드 — `<파드>.<헤드리스서비스>.<네임스페이스>.svc.cluster.local`",
          "확인은 임시 파드로 — `k run tmp --image=busybox:1.28 --rm -it --restart=Never -- nslookup web.prod`"
        ]
      },
      {
        heading: "3. 인그레스",
        code:
          "apiVersion: networking.k8s.io/v1\nkind: Ingress\nspec:\n  ingressClassName: nginx\n  rules:\n    - host: shop.example.com\n      http:\n        paths:\n          - path: /api\n            pathType: Prefix\n            backend:\n              service:\n                name: api-svc\n                port:\n                  number: 80",
        list: [
          "`pathType` 은 필수다. 빠뜨리면 거부된다",
          "백엔드는 `service.name` + `service.port.number` 로 한 단계 깊다(구버전 문법과 다름)",
          "인그레스 컨트롤러가 없으면 만들어도 아무 일도 일어나지 않는다",
          "명령형 뼈대 — `k create ingress shop --rule=\"shop.example.com/api*=api-svc:80\" --class=nginx`"
        ]
      },
      {
        heading: "4. 네트워크폴리시",
        list: [
          "정책이 하나라도 붙은 파드는 **허용된 것만** 받는다(화이트리스트)",
          "규칙이 없는 정책 = 전면 차단. `podSelector: {}` 는 네임스페이스 전체를 뜻한다",
          "`from` 리스트의 항목이 각각이면 OR, 한 항목 안에 두 셀렉터를 나란히 쓰면 AND",
          "`policyTypes` 에 Egress 를 넣으면 나가는 방향도 통제한다. DNS(53/UDP)를 막아 장애를 만드는 함정이 흔하다",
          "CNI 가 지원하지 않으면 정책은 무시된다"
        ],
        code:
          "ingress:\n  - from:\n      - namespaceSelector:\n          matchLabels:\n            env: prod\n        podSelector:          # 같은 항목 → AND\n          matchLabels:\n            app: api\n    ports:\n      - protocol: TCP\n        port: 5432"
      }
    ],
    exam: [
      "`--target-port` 를 빠뜨려 서비스가 죽는 것이 최다 실수",
      "`- podSelector` 앞의 `-` 하나가 AND 를 OR 로 바꾼다",
      "다른 네임스페이스의 서비스는 짧은 이름으로 풀리지 않는다"
    ]
  },

  {
    id: "storage",
    title: "스토리지",
    tagline: "파드보다 오래 살아야 하는가",
    exams: ["cka", "ckad"],
    topics: ["볼륨", "PV", "PVC", "StorageClass"],
    summary:
      "볼륨 선택은 한 줄로 갈린다 — **파드가 사라져도 데이터가 남아야 하는가.** 아니면 emptyDir, 남아야 하면 PVC.",
    sections: [
      {
        heading: "1. 볼륨 종류",
        table: {
          head: ["종류", "수명", "쓰는 때"],
          rows: [
            ["`emptyDir`", "파드와 함께 사라짐", "컨테이너 간 파일 공유, 캐시"],
            ["`hostPath`", "노드에 남음", "노드의 로그·소켓 접근(시험용 PV)"],
            ["`configMap` / `secret`", "파드와 함께", "설정 파일·인증서 주입"],
            ["`persistentVolumeClaim`", "PV 정책에 따름", "실제 영속 데이터"]
          ]
        }
      },
      {
        heading: "2. PV ↔ PVC 바인딩 조건",
        list: [
          "접근 모드가 포함될 것 — RWO(노드 하나), ROX(여러 노드 읽기), RWX(여러 노드 읽기·쓰기), RWOP(파드 하나)",
          "용량이 충분할 것 — PV `capacity` ≥ PVC `resources.requests.storage`",
          "`storageClassName` 이 같을 것 — 정적 PV 를 쓰려면 양쪽에 같은 이름(또는 `\"\"`)",
          "PVC 가 Pending 이면 `kubectl describe pvc` 이벤트가 어느 조건이 어긋났는지 알려준다"
        ],
        tip: "PV 는 클러스터 범위, PVC 는 네임스페이스 범위다. 파드와 PVC 는 같은 네임스페이스에 있어야 한다."
      },
      {
        heading: "3. 회수 정책과 바인딩 모드",
        list: [
          "`Retain` — PVC 를 지워도 데이터를 남기고 PV 는 Released 로 남는다(수동 정리 필요)",
          "`Delete` — PVC 를 지우면 실제 볼륨까지 삭제",
          "`volumeBindingMode: Immediate` — PVC 생성 즉시 바인딩",
          "`WaitForFirstConsumer` — 파드가 스케줄될 때까지 미룬다. 볼륨과 파드가 다른 노드에 잡히는 문제를 막는다"
        ],
        code:
          "apiVersion: storage.k8s.io/v1\nkind: StorageClass\nmetadata:\n  name: local-sc\nprovisioner: kubernetes.io/no-provisioner\nvolumeBindingMode: WaitForFirstConsumer\nreclaimPolicy: Retain"
      },
      {
        heading: "4. 자주 틀리는 곳",
        list: [
          "StorageClass 에는 `spec` 이 없다 — provisioner 등이 최상위 필드다",
          "PVC 는 `capacity` 가 아니라 `resources.requests.storage` 로 요청한다",
          "파드는 PV 를 직접 참조하지 않는다. 언제나 `persistentVolumeClaim.claimName`",
          "`accessModes` 는 값이 하나여도 리스트다"
        ]
      }
    ],
    exam: [
      "PVC 미바인딩은 파드 Pending 의 흔한 원인 — describe 에 `unbound immediate PersistentVolumeClaims` 로 찍힌다",
      "두 컨테이너가 파일을 주고받으면 emptyDir, 재시작 후에도 남아야 하면 PVC",
      "`kubectl get pv --sort-by=.spec.capacity.storage` 같은 정렬 출력 문항이 종종 나온다"
    ]
  }
]);
