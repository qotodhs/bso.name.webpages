window.addK8sLabs([
  {
    id: "config-storage",
    exam: "ckad",
    title: "구성 주입과 스토리지 — ConfigMap·Secret·PV·PVC",
    minutes: 20,
    intro: "네임스페이스 `app` 이 준비돼 있습니다. 명령형으로 되는 것은 한 줄로 끝내고, 볼륨·env 처럼 안 되는 것은 `k run ... $do > x.yaml` 로 뼈대를 뽑아 고치세요.",
    files: {
      "/root/app.env": "MODE=prod\nLEVEL=info\n"
    },
    seed(c) {
      c.add({ apiVersion: "v1", kind: "Namespace", metadata: { name: "app" } });
    },
    solution: [
      "kubectl create configmap app-cfg --from-literal=MODE=prod --from-literal=LEVEL=info -n app",
      "kubectl create secret generic db-cred --from-literal=password=s3cret -n app",
      { write: "/root/api.yaml", text: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: api\n  namespace: app\nspec:\n  containers:\n    - name: api\n      image: nginx:1.25\n      envFrom:\n        - configMapRef:\n            name: app-cfg\n      env:\n        - name: DB_PASSWORD\n          valueFrom:\n            secretKeyRef:\n              name: db-cred\n              key: password\n" },
      "kubectl apply -f /root/api.yaml",
      { write: "/root/pv.yaml", text: "apiVersion: v1\nkind: PersistentVolume\nmetadata:\n  name: pv-data\nspec:\n  capacity:\n    storage: 2Gi\n  accessModes:\n    - ReadWriteOnce\n  persistentVolumeReclaimPolicy: Retain\n  storageClassName: manual\n  hostPath:\n    path: /mnt/data\n" },
      "kubectl apply -f /root/pv.yaml",
      { write: "/root/pvc.yaml", text: "apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: data-claim\n  namespace: app\nspec:\n  accessModes:\n    - ReadWriteOnce\n  storageClassName: manual\n  resources:\n    requests:\n      storage: 1Gi\n" },
      "kubectl apply -f /root/pvc.yaml",
      { write: "/root/writer.yaml", text: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: writer\n  namespace: app\nspec:\n  volumes:\n    - name: data\n      persistentVolumeClaim:\n        claimName: data-claim\n  containers:\n    - name: writer\n      image: nginx:1.25\n      volumeMounts:\n        - name: data\n          mountPath: /usr/share/nginx/html\n" },
      "kubectl apply -f /root/writer.yaml"
    ],
    tasks: [
      {
        id: "cm",
        prompt: "`app` 에 컨피그맵 `app-cfg` 를 만들어라. 항목은 `MODE=prod` 와 `LEVEL=info`.",
        hint: "`--from-literal` 을 두 번 주거나, 준비된 `/root/app.env` 를 `--from-env-file` 로 읽어도 된다.",
        docs: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/",
        verify: (ctx) => {
          const cm = ctx.c.get("configmaps", "app", "app-cfg");
          if (!cm) return { ok: false, detail: "컨피그맵 app-cfg 가 없습니다" };
          const data = cm.data || {};
          if (data.MODE !== "prod" || data.LEVEL !== "info") return { ok: false, detail: `지금 값: ${JSON.stringify(data)}` };
          return true;
        }
      },
      {
        id: "secret",
        prompt: "`app` 에 시크릿 `db-cred` 를 만들어라. 키 `password`, 값 `s3cret`.",
        hint: "`kubectl create secret generic db-cred --from-literal=password=s3cret -n app`",
        docs: "https://kubernetes.io/docs/concepts/configuration/secret/",
        verify: (ctx) => {
          const s = ctx.c.get("secrets", "app", "db-cred");
          if (!s) return { ok: false, detail: "시크릿 db-cred 가 없습니다" };
          const raw = (s.data || {}).password || (s.stringData || {}).password;
          if (!raw) return { ok: false, detail: "키 password 가 없습니다" };
          let plain = raw;
          try { plain = atob(raw); } catch (e) { /* stringData 로 넣은 경우 */ }
          if (plain !== "s3cret" && raw !== "s3cret") return { ok: false, detail: "값이 s3cret 이 아닙니다" };
          return true;
        }
      },
      {
        id: "inject",
        prompt: "`app` 에 파드 `api`(이미지 `nginx:1.25`)를 만들어라. 컨피그맵 `app-cfg` 의 모든 키를 환경변수로 주입하고, 시크릿 `db-cred` 의 `password` 는 환경변수 `DB_PASSWORD` 로 넣는다.",
        hint: "전체는 `envFrom.configMapRef`, 이름을 바꿔 넣는 하나는 `env[].valueFrom.secretKeyRef`.",
        docs: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/",
        verify: (ctx) => {
          const pod = ctx.c.get("pods", "app", "api");
          if (!pod) return { ok: false, detail: "파드 api 가 없습니다" };
          const ct = (pod.spec.containers || [])[0] || {};
          const from = (ct.envFrom || []).some((e) => (e.configMapRef || {}).name === "app-cfg");
          if (!from) return { ok: false, detail: "envFrom 으로 app-cfg 를 참조하지 않습니다" };
          const env = (ct.env || []).find((e) => e.name === "DB_PASSWORD");
          if (!env) return { ok: false, detail: "환경변수 DB_PASSWORD 가 없습니다" };
          const ref = ((env.valueFrom || {}).secretKeyRef) || {};
          if (ref.name !== "db-cred" || ref.key !== "password") return { ok: false, detail: "secretKeyRef 가 db-cred/password 를 가리키지 않습니다" };
          return true;
        }
      },
      {
        id: "pv",
        prompt: "PV `pv-data` 를 만들어라. 용량 2Gi, 접근 모드 ReadWriteOnce, 회수 정책 Retain, 스토리지클래스 `manual`, hostPath `/mnt/data`.",
        hint: "PV 는 명령형으로 못 만든다. 매니페스트를 써서 apply 하라.",
        docs: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/",
        verify: (ctx) => {
          const pv = ctx.c.get("persistentvolumes", "-", "pv-data");
          if (!pv) return { ok: false, detail: "PV pv-data 가 없습니다" };
          if ((pv.spec.capacity || {}).storage !== "2Gi") return { ok: false, detail: "용량이 2Gi 가 아닙니다" };
          if (!(pv.spec.accessModes || []).includes("ReadWriteOnce")) return { ok: false, detail: "접근 모드에 ReadWriteOnce 가 없습니다" };
          if (pv.spec.persistentVolumeReclaimPolicy !== "Retain") return { ok: false, detail: "회수 정책이 Retain 이 아닙니다" };
          if (pv.spec.storageClassName !== "manual") return { ok: false, detail: "스토리지클래스가 manual 이 아닙니다" };
          return true;
        }
      },
      {
        id: "pvc",
        prompt: "`app` 에 PVC `data-claim` 을 만들어라. 1Gi, ReadWriteOnce, 스토리지클래스 `manual`. 위 PV 에 바인딩되어야 한다.",
        hint: "PVC 는 `capacity` 가 아니라 `resources.requests.storage` 로 요청한다. 만든 뒤 `kubectl get pvc -n app` 으로 Bound 인지 확인하라.",
        docs: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/",
        verify: (ctx) => {
          const pvc = ctx.c.get("persistentvolumeclaims", "app", "data-claim");
          if (!pvc) return { ok: false, detail: "PVC data-claim 이 없습니다" };
          if (pvc.status.phase !== "Bound") return { ok: false, detail: `지금 상태가 ${pvc.status.phase} 입니다 — 접근 모드·용량·스토리지클래스가 PV 와 맞는지 보세요` };
          return true;
        }
      },
      {
        id: "mount",
        prompt: "`app` 에 파드 `writer`(이미지 `nginx:1.25`)를 만들어 PVC `data-claim` 을 `/usr/share/nginx/html` 에 마운트하라.",
        hint: "`spec.volumes[].persistentVolumeClaim.claimName` 과 `containers[].volumeMounts` 의 `name` 이 같아야 한다.",
        docs: "https://kubernetes.io/docs/concepts/storage/persistent-volumes/",
        verify: (ctx) => {
          const pod = ctx.c.get("pods", "app", "writer");
          if (!pod) return { ok: false, detail: "파드 writer 가 없습니다" };
          const vol = (pod.spec.volumes || []).find((v) => (v.persistentVolumeClaim || {}).claimName === "data-claim");
          if (!vol) return { ok: false, detail: "PVC data-claim 을 쓰는 볼륨이 없습니다" };
          const ct = (pod.spec.containers || [])[0] || {};
          const mount = (ct.volumeMounts || []).find((m) => m.name === vol.name);
          if (!mount) return { ok: false, detail: "컨테이너가 그 볼륨을 마운트하지 않습니다(이름이 다릅니다)" };
          if (mount.mountPath !== "/usr/share/nginx/html") return { ok: false, detail: `마운트 경로가 ${mount.mountPath} 입니다` };
          return true;
        }
      }
    ]
  }
]);
