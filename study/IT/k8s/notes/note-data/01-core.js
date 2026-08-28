window.addK8sNotes("core", [
  {
    id: "workload-controllers",
    title: "워크로드 컨트롤러 고르기",
    tagline: "무엇이 파드를 다시 만들어 주는가",
    exams: ["cka", "ckad"],
    topics: ["워크로드", "컨트롤러"],
    summary:
      "컨트롤러는 종류를 외우는 게 아니라 **'파드가 죽으면 누가 어떻게 되살리는가'** 한 줄로 갈린다.",
    sections: [
      {
        heading: "1. 판별표",
        table: {
          head: ["종류", "언제 쓰나", "핵심 필드"],
          rows: [
            ["Pod", "일회성 확인, 정적 파드", "없음 — 죽으면 끝"],
            ["Deployment", "무상태 앱 대부분. 롤링 업데이트·롤백", "`replicas`, `strategy`"],
            ["ReplicaSet", "직접 만들 일은 거의 없다(디플로이먼트가 만든다)", "`selector`"],
            ["StatefulSet", "각 파드가 고유 이름·고유 볼륨을 가져야 할 때", "`serviceName`, `volumeClaimTemplates`"],
            ["DaemonSet", "노드마다 하나씩(로그·모니터링·CNI)", "`replicas` 없음"],
            ["Job", "끝이 있는 작업", "`completions`, `parallelism`, `backoffLimit`"],
            ["CronJob", "정해진 시각에 Job 생성", "`schedule`, `concurrencyPolicy`"]
          ]
        },
        tip:
          "'노드마다 하나' 가 보이면 DaemonSet, '끝나면 완료' 가 보이면 Job, '순서와 이름이 중요' 하면 StatefulSet. 나머지는 거의 다 Deployment 다."
      },
      {
        heading: "2. 디플로이먼트 롤아웃",
        code:
          "k set image deployment/web nginx=nginx:1.27\nk rollout status deployment/web\nk rollout history deployment/web\nk rollout undo deployment/web --to-revision=2\nk rollout pause deployment/web\nk rollout resume deployment/web",
        list: [
          "새 리비전은 **파드 템플릿이 바뀔 때만** 생긴다. `scale` 은 리비전을 만들지 않는다",
          "`maxSurge` 는 정원보다 더 띄울 수, `maxUnavailable` 은 동시에 빠질 수 있는 수",
          "무중단이 필요하면 `maxUnavailable: 0`, 자원이 빠듯하면 `maxSurge: 0`(둘 다 0 은 불가)",
          "`Recreate` 전략은 전부 내리고 새로 올린다 — 볼륨을 RWO 로 공유하는 앱에 쓴다"
        ]
      },
      {
        heading: "3. Job 의 세 숫자",
        list: [
          "`completions` — 몇 번 성공해야 완료인가",
          "`parallelism` — 동시에 몇 개를 돌리는가",
          "`backoffLimit` — 몇 번까지 재시도하고 실패로 처리하는가(기본 6)",
          "`activeDeadlineSeconds` — 이 시간을 넘으면 강제 종료",
          "파드 템플릿의 `restartPolicy` 는 `Never` 또는 `OnFailure` 만 가능하다"
        ],
        tip: "CronJob 이 안 도는 것처럼 보이면 Job → 파드 순으로 한 단계씩 내려가며 본다. `concurrencyPolicy: Forbid` 때문에 이전 실행이 안 끝나 건너뛰는 경우가 흔하다."
      }
    ],
    exam: [
      "`kubectl create daemonset` 은 존재하지 않는다 — 디플로이먼트를 뽑아 kind 를 바꾸고 `replicas`·`strategy` 를 지운다",
      "`selector` 와 `template.metadata.labels` 가 다르면 생성 자체가 거부된다",
      "롤백 문항은 `rollout history` → `--to-revision` 두 단계로 끝난다"
    ]
  },

  {
    id: "scheduling",
    title: "스케줄링 — 어디로 보낼 것인가",
    tagline: "노드가 거절하는 힘과 파드가 고르는 힘",
    exams: ["cka", "ckad"],
    topics: ["스케줄링", "테인트", "어피니티"],
    summary:
      "네 가지 도구가 헷갈리는 이유는 **방향**이 다르기 때문이다. 노드에서 파드로 미는 힘(테인트)과 파드에서 노드를 고르는 힘(셀렉터·어피니티)을 나눠 보면 정리된다.",
    sections: [
      {
        heading: "1. 방향으로 나누기",
        table: {
          head: ["도구", "누가 거는가", "뜻"],
          rows: [
            ["taint", "노드", "허가받지 않은 파드는 오지 마라"],
            ["toleration", "파드", "그 거절을 견딜 수 있다 (갈 수 있다 ≠ 간다)"],
            ["nodeSelector", "파드", "이 라벨을 가진 노드로만 간다 (딱딱한 조건)"],
            ["nodeAffinity", "파드", "같은 일을 표현식으로. required 는 필수, preferred 는 선호"],
            ["podAffinity / podAntiAffinity", "파드", "다른 파드와 같은/다른 토폴로지에 배치"]
          ]
        },
        tip:
          "'특정 노드에서만 돌게 하라'는 톨러레이션만으로 풀리지 않는다. 톨러레이션 + nodeSelector(또는 어피니티) 두 개가 한 세트다."
      },
      {
        heading: "2. 테인트 효과 셋",
        list: [
          "`NoSchedule` — 새로 스케줄되지 않는다. 이미 떠 있는 파드는 그대로",
          "`PreferNoSchedule` — 가능하면 피한다(강제 아님)",
          "`NoExecute` — 새 파드를 막고, **이미 떠 있는 파드도 쫓아낸다**. `tolerationSeconds` 로 유예 지정",
          "테인트 제거는 뒤에 빼기 — `kubectl taint nodes node01 gpu=true:NoSchedule-`"
        ],
        code:
          "tolerations:\n  - key: gpu\n    operator: Equal\n    value: \"true\"\n    effect: NoSchedule\n\nnodeSelector:\n  accelerator: gpu"
      },
      {
        heading: "3. 그밖의 배치 도구",
        list: [
          "`nodeName` — 스케줄러를 건너뛰고 특정 노드에 직접 꽂는다. 시험에서 스케줄러가 죽은 상황의 답이 되기도 한다",
          "`topologySpreadConstraints` — 존·노드에 고르게 분산",
          "`priorityClassName` — 자원이 모자랄 때 낮은 우선순위 파드를 밀어낸다(preemption)",
          "스케줄되지 않은 이유는 언제나 `kubectl describe pod` 의 Events 한 줄에 있다"
        ]
      }
    ],
    exam: [
      "컨트롤플레인 노드에는 기본 테인트가 걸려 있다. 여기에 파드를 올리라는 문항이면 톨러레이션이 필요하다",
      "`value: \"true\"` 는 따옴표를 씌워 문자열로 만든다 — 불리언으로 파싱되면 매칭에 실패한다",
      "Pending 의 원인 네 가지(자원 부족·테인트·셀렉터 불일치·PVC 미바인딩)를 describe 로 구분한다"
    ]
  },

  {
    id: "config-security",
    title: "구성 주입과 보안 컨텍스트",
    tagline: "값을 어떻게 넣고 누구 권한으로 돌리나",
    exams: ["ckad", "cka"],
    topics: ["ConfigMap", "Secret", "보안"],
    summary:
      "구성 주입은 네 가지 조합뿐이다 — **환경변수냐 파일이냐 × 전체냐 일부냐.** 여기에 '누구 권한으로 돌 것인가'(securityContext·서비스어카운트)가 붙는다.",
    sections: [
      {
        heading: "1. 주입 네 가지",
        table: {
          head: ["방법", "필드", "쓰는 때"],
          rows: [
            ["전체를 환경변수로", "`envFrom: [configMapRef|secretRef]`", "키 이름을 그대로 쓸 때"],
            ["키 하나를 환경변수로", "`env[].valueFrom.configMapKeyRef` / `secretKeyRef`", "이름을 바꿔 넣을 때"],
            ["전체를 파일로", "`volumes[].configMap` / `.secret`", "설정 파일·인증서"],
            ["키 일부만 파일로", "볼륨의 `items: [{key, path}]`", "특정 키만 특정 이름으로"]
          ]
        },
        tip:
          "환경변수로 넣은 값은 컨피그맵을 고쳐도 **갱신되지 않는다**(파드를 다시 만들어야 한다). 볼륨으로 마운트한 값은 자동으로 갱신된다 — 이 차이가 판별 기준이다."
      },
      {
        heading: "2. 시크릿",
        code:
          "k create secret generic db --from-literal=password=s3cret\nk create secret docker-registry regcred --docker-server=... --docker-username=... --docker-password=...\nk create secret tls web-tls --cert=tls.crt --key=tls.key\n\nk get secret db -o jsonpath='{.data.password}' | base64 -d",
        list: [
          "YAML 로 직접 쓸 때 `data` 는 base64, `stringData` 는 평문",
          "base64 는 암호화가 아니라 인코딩이다. 저장 시 암호화는 etcd 쪽 설정(EncryptionConfiguration)",
          "이미지 풀 시크릿은 파드의 `imagePullSecrets` 또는 서비스어카운트에 붙인다"
        ]
      },
      {
        heading: "3. securityContext 는 두 층",
        table: {
          head: ["필드", "파드 레벨", "컨테이너 레벨"],
          rows: [
            ["`runAsUser` / `runAsGroup`", "○", "○ (컨테이너가 우선)"],
            ["`fsGroup`", "○", "×"],
            ["`allowPrivilegeEscalation`", "×", "○"],
            ["`capabilities`", "×", "○"],
            ["`privileged`", "×", "○"],
            ["`readOnlyRootFilesystem`", "×", "○"]
          ]
        },
        body:
          "볼륨 파일의 소유 그룹을 바꾸는 `fsGroup` 은 파드에만, 권한 상승·커널 능력처럼 프로세스에 관한 것은 컨테이너에만 있다."
      },
      {
        heading: "4. 자원 requests / limits",
        list: [
          "`requests` — 스케줄러가 노드를 고를 때 쓰는 예약값",
          "`limits` — 런타임 상한. 메모리 초과는 **OOMKilled**, CPU 초과는 죽지 않고 스로틀",
          "네임스페이스 총합은 ResourceQuota, 컨테이너 하나의 상·하한과 기본값은 LimitRange",
          "쿼터가 걸린 네임스페이스에서는 requests/limits 없는 파드가 아예 생성되지 않는다"
        ]
      }
    ],
    exam: [
      "'다른 이름의 환경변수로' 라는 표현이 보이면 `envFrom` 이 아니라 `env[].valueFrom` 이다",
      "시크릿 볼륨의 필드는 `secretName`, 컨피그맵 볼륨은 `name` — 이름이 다르다",
      "RBAC 세트는 서비스어카운트 → Role → RoleBinding → 파드에 붙이기 → `auth can-i` 확인 네 단계"
    ]
  }
]);
