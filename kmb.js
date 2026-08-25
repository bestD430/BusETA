// =====================================
// 九巴 / 龍運 ETA Widget V10
// 支援：顯示最近 3 班到站時間
// =====================================

let kmbConfigs = JSON.parse(
  localStorage.getItem("kmb_configs")
) || [
  { route: "E31", stopName: "雍逸樓", dir: "outbound" },
  { route: "E36A", stopName: "雍逸樓", dir: "outbound" },
  { route: "N31", stopName: "雍逸樓", dir: "outbound" }
];

document.addEventListener("DOMContentLoaded", () => {
  console.log("KMB V10 Loaded");

  for (let i = 0; i < 3; i++) {
    const conf = kmbConfigs[i] || { route: "", stopName: "", dir: "outbound" };

    const routeEl = document.getElementById(`kmb-route-${i + 1}`);
    const stopEl = document.getElementById(`kmb-stop-${i + 1}`);
    const dirEl = document.getElementById(`kmb-dir-${i + 1}`);

    if (routeEl) routeEl.value = conf.route;
    if (stopEl) stopEl.value = conf.stopName;
    if (dirEl) dirEl.value = conf.dir;
  }

  fetchAllKmbETA();
});

// =====================================
// 查詢所有路線
// =====================================

async function fetchAllKmbETA() {
  const container = document.getElementById("kmb");
  if (!container) return;

  const results = await Promise.all(
    kmbConfigs
      .filter(c => c.route && c.route.trim())
      .map(conf => fetchSingleKmb(conf))
  );

  const html = results.filter(Boolean).join("");
  container.innerHTML = html || "<div style='color:#888; padding: 10px 0;'>目前沒有到站資料</div>";
}

// =====================================
// 查詢單一路線
// =====================================

async function fetchSingleKmb(conf) {
  try {
    const route = conf.route.trim().toUpperCase();
    const stopKeyword = conf.stopName.trim();
    const bound = conf.dir === "inbound" ? "inbound" : "outbound";

    // 取得路線車站
    const routeStopRes = await fetch(
      `https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route}/${bound}/1`
    );
    const routeStopData = await routeStopRes.json();

    if (!routeStopData.data || routeStopData.data.length === 0) {
      return "";
    }

    let targetStop = null;

    // 搜尋站名
    for (const item of routeStopData.data) {
      const stopRes = await fetch(
        `https://data.etabus.gov.hk/v1/transport/kmb/stop/${item.stop}`
      );
      const stopData = await stopRes.json();

      if (
        stopData.data &&
        stopData.data.name_tc &&
        stopData.data.name_tc.includes(stopKeyword)
      ) {
        targetStop = {
          stopId: item.stop,
          stopName: stopData.data.name_tc
        };
        break;
      }
    }

    if (!targetStop) {
      return `
        <div class="route-group">
          <div class="route-header">
            <span class="route-no">${route}</span>
          </div>
          <div class="next-eta-item">找不到車站：${stopKeyword}</div>
        </div>
      `;
    }

    // ETA
    const etaRes = await fetch(
      `https://data.etabus.gov.hk/v1/transport/kmb/eta/${targetStop.stopId}/${route}/1`
    );
    const etaData = await etaRes.json();

    if (!etaData.data || etaData.data.length === 0) {
      return "";
    }

    // 取前 3 班車
    const validEta = etaData.data
      .filter(item => item.route === route && item.eta)
      .slice(0, 3);

    if (validEta.length === 0) return "";

    let html = `
      <div class="route-group">
        <div class="route-header">
          <span class="route-no">${route}</span>
          <span class="route-stop">(${targetStop.stopName})</span>
        </div>
    `;

    validEta.forEach((item, index) => {
      const mins = Math.max(
        0,
        Math.round((new Date(item.eta) - new Date()) / 60000)
      );

      const etaText = mins <= 0 ? "即將到站" : `${mins} 分鐘`;

      let colorClass = "eta-green";
      if (mins <= 2) {
        colorClass = "eta-red";
      } else if (mins <= 5) {
        colorClass = "eta-orange";
      }

      if (index === 0) {
        html += `
          <div class="first-eta-item">
            <span class="first-eta-dest">${item.dest_tc || ""}</span>
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
    console.error("KMB Error", conf.route, e);
    return "";
  }
}

// =====================================
// 儲存設定
// =====================================

function saveAndFetchKmb() {
  for (let i = 0; i < 3; i++) {
    const route = document.getElementById(`kmb-route-${i + 1}`)?.value.trim().toUpperCase() || "";
    const stopName = document.getElementById(`kmb-stop-${i + 1}`)?.value.trim() || "";
    const dir = document.getElementById(`kmb-dir-${i + 1}`)?.value || "outbound";

    kmbConfigs[i] = { route, stopName, dir };
  }

  localStorage.setItem("kmb_configs", JSON.stringify(kmbConfigs));

  if (typeof toggleSettings === "function") {
    toggleSettings("kmb-settings");
  }

  fetchAllKmbETA();
}

// =====================================
// 自動更新
// =====================================

setInterval(fetchAllKmbETA, 30000);
