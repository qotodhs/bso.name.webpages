window.addK8sNotes("exam", [
  {
    id: "exam-info",
    title: "두 시험의 차이와 준비 순서",
    tagline: "CKA 는 클러스터를 고치고 CKAD 는 앱을 올린다",
    exams: ["cka", "ckad"],
    topics: ["시험개요", "계획"],
    summary:
      "둘 다 객관식이 아니라 **살아 있는 클러스터를 실제로 조작하는 실기 시험**이다. 정답 문장을 외우는 공부가 아니라 손이 먼저 움직이는 훈련이 필요하다.",
    sections: [
      {
        heading: "1. 한눈에 비교",
        table: {
          head: ["", "CKA", "CKAD"],
          rows: [
            ["관점", "클러스터를 운영·복구하는 관리자", "앱을 정의·배포하는 개발자"],
            ["시간", "120분", "120분"],
            ["합격선", "66 %", "66 %"],
            ["최대 영역", "트러블슈팅 30 %", "환경·구성·보안 25 %"],
            ["고유 주제", "kubeadm, etcd 백업·복구, 노드 관리, RBAC", "멀티컨테이너 패턴, 프로브, Job/CronJob"],
            ["공통 주제", "서비스·네트워킹, 스토리지, 배포와 롤아웃, 로그·디버깅", "←"]
          ]
        },
        tip:
          "겹치는 범위가 절반이 넘는다. 두 시험을 모두 볼 계획이면 공통 부분을 먼저 끝내고, CKA 는 운영(kubeadm·etcd·노드), CKAD 는 앱 설계(패턴·프로브·구성 주입)만 따로 얹는 순서가 가장 빠르다."
      },
      {
        heading: "2. 영역별 배점",
        list: [
          "**CKA** — 트러블슈팅 30 %, 클러스터 아키텍처·설치·구성 25 %, 서비스·네트워킹 20 %, 워크로드·스케줄링 15 %, 스토리지 10 %",
          "**CKAD** — 환경·구성·보안 25 %, 설계·빌드 20 %, 배포 20 %, 서비스·네트워킹 20 %, 관측·유지보수 15 %",
          "배점은 곧 공부 시간 배분이다. CKA 에서 트러블슈팅과 클러스터 구성 둘만 55 %이므로 여기가 흔들리면 나머지를 다 맞혀도 위태롭다"
        ]
      },
      {
        heading: "3. 4주 준비 골격",
        list: [
          "1주 — kubectl 명령형 문법과 `--dry-run=client -o yaml` 습관화. 파드·디플로이먼트·서비스만 반복",
          "2주 — 구성 주입(ConfigMap·Secret)·프로브·스케줄링·스토리지. 매니페스트를 손으로 쓰는 훈련",
          "3주 — 시험별 고유 영역. CKA 는 kubeadm 업그레이드·etcd·RBAC, CKAD 는 멀티컨테이너 패턴과 Job",
          "4주 — 시간을 재고 모의 세션. 틀린 문항만 반복하며 **문서에서 답을 찾는 경로**를 몸에 붙인다"
        ],
        tip:
          "인증 유효기간·재응시 정책·시험 환경은 바뀐다. 응시 전에 Linux Foundation 의 시험 안내를 반드시 다시 확인한다."
      }
    ],
    exam: [
      "두 시험 모두 부분점수가 있다. 완벽하지 않아도 만든 만큼 점수가 된다 — 막히면 붙들지 말고 넘어간다",
      "문항마다 클러스터가 다르다. 첫 줄의 컨텍스트 전환 명령을 반드시 실행한다",
      "시험 중 공식 문서(kubernetes.io) 열람이 허용된다. 무엇을 외울지보다 어디서 찾을지를 정해 둔다"
    ]
  },

  {
    id: "exam-speed",
    title: "시험장 세팅과 속도",
    tagline: "처음 3분에 하는 세팅이 20분을 번다",
    exams: ["cka", "ckad"],
    topics: ["세팅", "속도"],
    summary:
      "실기 시험에서 떨어지는 가장 흔한 이유는 몰라서가 아니라 **시간이 모자라서**다. 타이핑을 줄이는 세팅을 시작하자마자 걸어 둔다.",
    sections: [
      {
        heading: "1. 터미널에 먼저 치는 것",
        code:
          "alias k=kubectl\nsource <(kubectl completion bash)\ncomplete -o default -F __start_kubectl k\nexport do=\"--dry-run=client -o yaml\"\nexport now=\"--grace-period=0 --force\"",
        body:
          "이후로는 `k run web --image=nginx $do > pod.yaml` 처럼 쓴다. 매니페스트가 필요한 모든 문항이 이 한 줄에서 시작한다.",
        tip: "자동완성이 되면 리소스 이름 오타로 잃는 시간이 사라진다. 세팅은 문항 푸는 시간이 아니라 투자다."
      },
      {
        heading: "2. vim 설정",
        code: "# ~/.vimrc\nset expandtab\nset tabstop=2\nset shiftwidth=2\nset number",
        body:
          "YAML 은 탭 문자를 허용하지 않는다. `expandtab` 이 없으면 눈에 보이지 않는 탭 때문에 파싱 오류가 난다. 블록 들여쓰기는 비주얼 모드에서 `>` `<`, 반복은 `.` 로 처리한다."
      },
      {
        heading: "3. 시간 배분",
        list: [
          "문항당 평균 6~7분. 타이머를 보고 **8분을 넘기면 표시해 두고 넘어간다**",
          "배점이 표시되므로 낮은 배점의 어려운 문항보다 높은 배점의 쉬운 문항을 먼저",
          "남은 시간 15분은 검토용으로 비워 둔다 — 컨텍스트를 잘못 잡은 문항을 여기서 건진다"
        ]
      },
      {
        heading: "4. 확인 습관",
        list: [
          "만들었으면 `kubectl get <리소스> -n <네임스페이스>` 로 실제로 생겼는지 본다",
          "서비스는 `kubectl get endpoints`, 파드는 `kubectl get pods -w` 로 Ready 까지 확인",
          "파일로 답을 저장하는 문항은 `cat` 으로 내용을 눈으로 본다",
          "고친 매니페스트는 `kubectl apply -f` 의 출력이 `configured` 인지 `unchanged` 인지 확인"
        ],
        tip: "'만든 것 같다'와 '만들어졌다' 사이에서 점수가 갈린다. 확인 명령 한 줄이 부분점수를 지킨다."
      }
    ],
    exam: [
      "`$do` 와 자동완성 세팅은 시험 시작 직후 3분 안에 끝낸다",
      "vim 의 `expandtab` 이 없으면 YAML 문항 전체가 위험해진다",
      "8분 룰 — 한 문항에 매몰되지 않는 것이 합격선을 지키는 가장 확실한 전략"
    ]
  },

  {
    id: "kubectl-imperative",
    title: "명령형으로 되는 것과 안 되는 것",
    tagline: "만들 수 있으면 명령형, 아니면 뼈대만 뽑아 편집",
    exams: ["cka", "ckad"],
    topics: ["kubectl", "치트시트"],
    summary:
      "판별 기준은 하나다 — **`kubectl create/run/expose` 의 플래그로 표현되는 필드인가.** 표현되면 한 줄로 끝내고, 안 되면 `$do` 로 뼈대를 뽑아 그 필드만 채운다.",
    sections: [
      {
        heading: "1. 한 줄로 끝나는 것",
        code:
          "k run web --image=nginx:1.25 --port=80 -n dev\nk create deployment web --image=nginx:1.25 --replicas=3\nk expose deployment web --name=web-svc --port=80 --target-port=8080\nk create configmap app --from-literal=MODE=prod\nk create secret generic db --from-literal=password=s3cret\nk create job pi --image=perl -- perl -Mbignum=bpi -wle 'print bpi(200)'\nk create cronjob report --image=busybox --schedule=\"*/5 * * * *\" -- date\nk create role reader --verb=get,list --resource=pods\nk create rolebinding read --role=reader --serviceaccount=dev:ci\nk create ingress shop --rule=\"host/path*=svc:80\" --class=nginx\nk scale deployment web --replicas=5\nk set image deployment/web nginx=nginx:1.27\nk autoscale deployment web --min=2 --max=10 --cpu-percent=70\nk label pod web tier=front --overwrite\nk taint nodes node01 gpu=true:NoSchedule"
      },
      {
        heading: "2. 매니페스트로만 되는 것",
        list: [
          "볼륨과 볼륨마운트 — emptyDir, PVC, ConfigMap/Secret 마운트",
          "프로브 — liveness / readiness / startup",
          "초기화 컨테이너, 사이드카, 멀티컨테이너 파드",
          "톨러레이션, 노드·파드 어피니티",
          "securityContext, 자원 requests/limits(디플로이먼트는 `set resources` 로 가능)",
          "네트워크폴리시, PV, StorageClass, PodDisruptionBudget"
        ],
        tip: "이 목록에 있는 지시어가 문제에 보이면 곧바로 `k run ... $do > x.yaml` 로 뼈대를 만들고 편집기로 들어간다. 처음부터 손으로 쓰지 않는다."
      },
      {
        heading: "3. 이미 있는 리소스를 고칠 때",
        table: {
          head: ["상황", "방법", "메모"],
          rows: [
            ["필드 몇 개 수정", "`kubectl edit <리소스> <이름>`", "불변 필드는 거부된다"],
            ["스크립트로 정확히", "`kubectl patch ... -p '{...}'`", "JSON 조각으로 지정"],
            ["통째로 교체", "`kubectl replace -f x.yaml --force`", "지우고 다시 만든다"],
            ["기존 정의 뽑기", "`kubectl get pod web -o yaml > web.yaml`", "`status` 와 기본값이 딸려 온다"]
          ]
        },
        body:
          "파드의 이미지·자원처럼 수정할 수 없는 필드는 edit 가 거부한다. 그때는 YAML 로 뽑아 고친 뒤 `--force` 로 교체하거나, 애초에 파드를 지우고 다시 만든다."
      }
    ],
    exam: [
      "`--dry-run=client -o yaml` 은 시험 전체에서 가장 많이 치는 문자열이다. `$do` 로 짧게 만들어 둔다",
      "`kubectl explain pod.spec.containers --recursive` 는 문서를 열지 않고 필드 이름을 확인하는 가장 빠른 길",
      "만들 수 없는 필드를 명령형으로 시도하다 시간을 버리는 것이 초반 최대 손실"
    ]
  }
]);
