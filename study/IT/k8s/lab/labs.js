// 실습 시나리오 로더
// ---------------------------------------------------------------------------
// 한 랩 = 시드(미리 만들어 둘 오브젝트) + 시작 파일 + 과제 목록이다.
// 과제의 verify(cluster) 는 클러스터 상태를 직접 보고 통과 여부를 돌려준다 —
// 명령 문자열이 아니라 결과를 보는 것이 실제 시험과 같은 방식이다.
//
//   {
//     id, exam: "cka"|"ckad", title, minutes, intro,
//     files: { "/root/x.yaml": "..." },
//     seed(cluster) {},
//     tasks: [{ id, weight, prompt, hint, docs, verify(c) → true|false|{ok,detail} }]
//   }
// ---------------------------------------------------------------------------
window.K8S_LABS = [];

const labLoaderScript = document.currentScript;
const labDataBase = new URL("./lab-data/", labLoaderScript.src);

window.addK8sLabs = (labs) => {
  labs.forEach((lab) => {
    window.K8S_LABS.push(Object.assign({ minutes: 20, files: {}, tasks: [], seed() {} }, lab));
  });
};

// 시드에서 자주 쓰는 도우미
window.labHelpers = {
  deployment(name, namespace, image, replicas, labels) {
    const l = labels || { app: name };
    return {
      apiVersion: "apps/v1", kind: "Deployment",
      metadata: { name, namespace, labels: l },
      spec: {
        replicas: replicas === undefined ? 1 : replicas,
        selector: { matchLabels: l },
        template: { metadata: { labels: l }, spec: { containers: [{ name, image }] } }
      }
    };
  },
  pod(name, namespace, image, extra) {
    return Object.assign({
      apiVersion: "v1", kind: "Pod",
      metadata: { name, namespace, labels: { app: name } },
      spec: { containers: [{ name, image }] }
    }, extra || {});
  }
};

[
  "01-basics.js",
  "02-workloads.js",
  "03-config-storage.js",
  "04-troubleshoot.js"
].forEach((filename) => {
  document.write(`<script src="${new URL(filename, labDataBase).href}"><\/script>`);
});
