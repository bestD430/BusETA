// =====================================
// 城巴 ETA Widget V10 (已修復版)
// 支援：顯示最近 3 班到站時間
// =====================================

let citybusConfigs = JSON.parse(
  localStorage.getItem("citybus_configs")
) || [
  { route: "E21A", stopName: "雍逸樓", dir: "outbound" },
  { route: "E21B", stopName: "雍逸樓", dir: "outbound" },
  { route: "S52", stopName: "逸東邨", dir: "outbound" }
];

document.addEventListener("DOMContentLoaded", () => {
  for (let i = 0; i < 3; i++) {
    const conf = citybusConfigs[i] || { route: "", stopName: "", dir: "outbound" };

    const routeEl = document.getElementById(`citybus-route-${i + 1}`);
    const stopEl = document.getElementById(`citybus-stop-${i + 1}`);
    const dirEl = document.getElementById(`citybus-dir-${i + 1}`);

    if (routeEl) routeEl.value = conf.route;
    if (stopEl) stopEl.value = conf.stopName;
    if (dirEl) dirEl.value = conf.dir || "outbound";
  }

  fetchAllCitybusETA();
});

async function fetchAllCitybusETA() {
  const container = document.getElementById("citybus");
  if (!container) return;

  const results = await Promise.all(
    citybusConfigs
      .filter(c => c.route && c.route.trim())
      .map(conf => fetchSingleCitybus(conf))
  );

  const html = results.filter(Boolean).join("");
  container.innerHTML = html || "<div style='color:#888; padding: 10px 0;'>目前沒有城巴到站資料</div>";
}

async function fetchSingleCitybus(conf) {
  try {
    const route = conf.route.trim().toUpperCase();
    const stopKeyword = conf.stopName.trim();
    const bound = conf.dir === "inbound" ? "inbound" : "outbound";
    const dirChar = conf.dir === "inbound" ? "I" : "O";

    // 1. 取得路線車站
    const routeStopRes = await fetch(
      `https://data.etabus.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB/${route}/${bound}`
    );
    const routeStopData = await routeStopRes.json();

    if (!routeStopData.data || routeStopData.data.length === 0) {
      return "";
    }

    let targetStop = null;

    // 2. 搜尋站名 (逐一對比城巴車站 API)
    for (const item of routeStopData.data) {
      try {
        const stopRes = await fetch(
          `https://data.etabus.gov.hk/v1/transport/citybus-nwfb/stop/${item.stop}`
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
      } catch (err) {
        continue;
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

    // 3. 取得 ETA 數據
    const etaRes = await fetch(
      `https://data.etabus.gov.hk/v1/transport/citybus-nwfb/eta/CTB/${targetStop.stopId}/${route}`
    );
    const etaData = await etaRes.json();

    if (!etaData.data || etaData.data.length === 0) {
      return "";
    }

    // 過濾出方向正確且有 ETA 的前 3 班車
    const validEta = etaData.data
      .filter(item => (item.dir === dirChar || !item.dir) && item.eta)
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
      if (mins <= 2) colorClass = "eta-red";
      else if (mins <= 5) colorClass = "eta-orange";

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
    console.error("Citybus Error", conf.route, e);
    return "";
  }
}

function saveAndFetchCitybus() {
  for (let i = 0; i < 3; i++) {
    const route = document.getElementById(`citybus-route-${i + 1}`)?.value.trim().toUpperCase() || "";
    const stopName = document.getElementById(`citybus-stop-${i + 1}`)?.value.trim() || "";
    const dir = document.getElementById(`citybus-dir-${i + 1}`)?.value || "outbound";

    citybusConfigs[i] = { route, stopName, dir };
  }

  localStorage.setItem("citybus_configs", JSON.stringify(citybusConfigs));

  if (typeof toggleSettings === "function") {
    toggleSettings("citybus-settings");
  }

  fetchAllCitybusETA();
}

setInterval(fetchAllCitybusETA, 30000);

