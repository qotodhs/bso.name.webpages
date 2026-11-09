addHVACPracticalExam({
  id: "20211016",
  date: "2021-10-16",
  problems: [
    {
      no: 1,
      points: 8,
      title: "덕트 설계 — 정압법 구간 치수와 전손실",
      theory: [{ topic: "덕트설계", title: "덕트 설계와 취출구" }],
      body: "다음과 같은 덕트 설비에 대해서 물음에 답하시오.",
      conditions: [
        "각 취출구에서의 풍량은 각각 $2000\\ \\mathrm{m^3/h}$",
        "직관저항: $1.0\\ \\mathrm{Pa/m}$",
        {
          text: "곡관부저항: a부, b부, c부, d부의 각각 손실계수 $\\zeta = 0.3$",
          note: "단, a부와 b부의 속도는 $8\\ \\mathrm{m/s}$이며, c부와 d부의 속도는 $10\\ \\mathrm{m/s}$로 간주한다."
        },
        "공기흡입구저항: $50\\ \\mathrm{Pa}$, 공기취출구저항: $40\\ \\mathrm{Pa}$"
      ],
      needs: ["덕트 계통도 (구간 ②~⑤·곡관 a~d 위치·직관 길이)", "원형덕트 선도 (문제에 첨부되었다면)"],
      parts: [
        {
          label: "(1)",
          text: "정압법($1.0\\ \\mathrm{Pa/m}$)에 의한 풍량, 풍속, 원형덕트의 크기를 구하시오.",
          input: {
            type: "table",
            head: ["구간", "풍량 ($\\mathrm{m^3/h}$)", "저항 ($\\mathrm{Pa/m}$)", "풍속 ($\\mathrm{m/s}$)", "원형덕트 ($\\mathrm{cm}$)"],
            rows: [
              ["②", { unit: "m³/h" }, "1.0", { unit: "m/s" }, { unit: "cm" }],
              ["③", { unit: "m³/h" }, "1.0", { unit: "m/s" }, { unit: "cm" }],
              ["④", { unit: "m³/h" }, "1.0", { unit: "m/s" }, { unit: "cm" }],
              ["⑤", { unit: "m³/h" }, "1.0", { unit: "m/s" }, { unit: "cm" }]
            ]
          }
        },
        {
          label: "(2)",
          text: "덕트에서 전손실($\\mathrm{Pa}$)을 구하시오.",
          input: { type: "number", unit: "Pa" }
        }
      ]
    }
  ]
});
