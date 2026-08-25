// =====================================
// 港鐵巴士 ETA Widget V10 (已修復版)
// 支援：顯示最近 3 班到站時間
// =====================================

let mtrbusConfigs = JSON.parse(
  localStorage.getItem("mtrbus_configs")
) || [
  { route: "K51", stopName: "富泰", dir: "outbound" },
  { route: "K51A", stopName: "富泰", dir: "outbound" },
  { route: "", stopName: "", dir: "outbound" }
];

document.addEventListener("DOMContentLoaded", () => {
  for (let i = 0; i < 3; i++) {
    const conf = mtrbusConfigs[i] || { route: "", stopName: "", dir: "outbound" };

    const routeEl = document.getElementById(`mtrbus-route-${i + 1}`);
    const stopEl = document.getElementById(`mtrbus-stop-${i + 1}`);
    const dirEl = document.getElementById(`mtrbus-dir-${i + 1}`);

    if (routeEl) routeEl.value = conf.route;
    if (stopEl) stopEl.value = conf.stopName;
    if (dirEl) dirEl.value = conf.dir || "outbound";
  }

  fetchAllMtrbusETA();
});

async function fetchAllMtrbusETA() {
  const container = document.getElementById("mtrbus");
  if (!container) return;

  const results = await Promise.all(
    mtrbusConfigs
      .filter(c => c.route && c.route.trim())
      .map(conf => fetchSingleMtrbus(conf))
  );

  const html = results.filter(Boolean).join("");
  container.innerHTML = html || "<div style='color:#888; padding: 10px 0;'>目前沒有港鐵巴士到站資料</div>";
}

async function fetchSingleMtrbus(conf) {
  try {
    const route = conf.route.trim().toUpperCase();
    const stopKeyword = conf.stopName.trim();

    // 港鐵巴士官方 GET API 端點
    const res = await fetch(
      `https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule?routeName=${route}`
    );
    const data = await res.json();

    if (!data || data.status !== "1" || !data.busStop || data.busStop.length === 0) {
      return "";
    }

    // 車站篩選
    let targetStops = data.busStop;
    if (stopKeyword !== "") {
      const matched = data.busStop.filter(s => {
        const name1 = s.busStopTitleName || "";
        const name2 = s.busStopName || "";
        return name1.includes(stopKeyword) || name2.includes(stopKeyword);
      });
      if (matched.length > 0) {
        targetStops = matched;
      }
    }

    let rawEtas = [];

    targetStops.forEach(stop => {
      if (stop.bus && Array.isArray(stop.bus)) {
        stop.bus.forEach(b => {
          let mins = null;

          // 優先讀取以秒為單位的到站倒數
          if (b.arrivalTimeInSecond !== undefined && b.arrivalTimeInSecond !== null) {
            mins = Math.max(0, Math.floor(b.arrivalTimeInSecond / 60));
          } else if (b.arrivalTimeText) {
            // 文字解析格式 (HH:MM)
            const parts = b.arrivalTimeText.split(":");
            if (parts.length === 2) {
              const now = new Date();
              const busTime = new Date();
              busTime.setHours(parseInt(parts[0]), parseInt(parts[1]), 0);
              mins = Math.max(0, Math.round((busTime - now) / 60000));
            }
          }

          if (mins !== null && !isNaN(mins)) {
            rawEtas.push({
              mins: mins,
              dest: b.busRemarks || b.departureTimeText || "",
              stopName: stop.busStopTitleName || stop.busStopName || stopKeyword
            });
          }
        });
      }
    });

    if (rawEtas.length === 0) return "";

    // 按時間排序並截取前 3 班
    const validEtas = rawEtas
      .sort((a, b) => a.mins - b.mins)
      .slice(0, 3);

    const stopDisplayName = validEtas[0].stopName || stopKeyword;

    let html = `
      <div class="route-group">
        <div class="route-header">
          <span class="route-no">${route}</span>
          <span class="route-stop">(${stopDisplayName})</span>
        </div>
    `;

    validEtas.forEach((item, index) => {
      const etaText = item.mins <= 0 ? "即將到站" : `${item.mins} 分鐘`;

      let colorClass = "eta-green";
      if (item.mins <= 2) colorClass = "eta-red";
      else if (item.mins <= 5) colorClass = "eta-orange";

      if (index === 0) {
        html += `
          <div class="first-eta-item">
            <span class="first-eta-dest">${item.dest}</span>
            <span class="first-eta-time ${colorClass}">${etaText}</span>
          </div>
        `;
      } else {
        html += `
          <div class="next-eta-item">
            <span>下班車 (${index + 1})</span>
            <span>${etaText}</span>
          </div>
        `;
      }
    });

    html += "</div>";
    return html;

  } catch (e) {
    console.error("MTR Bus Error", conf.route, e);
    return "";
  }
}

function saveAndFetchMtrbus() {
  for (let i = 0; i < 3; i++) {
    const route = document.getElementById(`mtrbus-route-${i + 1}`)?.value.trim().toUpperCase() || "";
    const stopName = document.getElementById(`mtrbus-stop-${i + 1}`)?.value.trim() || "";
    const dir = document.getElementById(`mtrbus-dir-${i + 1}`)?.value || "outbound";

    mtrbusConfigs[i] = { route, stopName, dir };
  }

  localStorage.setItem("mtrbus_configs", JSON.stringify(mtrbusConfigs));

  if (typeof toggleSettings === "function") {
    toggleSettings("mtrbus-settings");
  }

  fetchAllMtrbusETA();
}

setInterval(fetchAllMtrbusETA, 30000);
