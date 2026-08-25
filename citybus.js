// =====================================
// 城巴 (Citybus) ETA Widget V10
// 支援：
// 1. 三條路線 (顯示最近到站 3 班車)
// 2. 站名模糊搜尋 + 下拉選單建議
// 3. 去程 / 回程 (outbound / inbound)
// 4. 30秒自動更新
// =====================================

let citybusConfigs = JSON.parse(
  localStorage.getItem("citybus_configs")
) || [
  { route: "E21A", stopName: "雍逸樓", dir: "outbound" },
  { route: "E21B", stopName: "雍逸樓", dir: "outbound" },
  { route: "S52", stopName: "逸東邨", dir: "outbound" }
];

document.addEventListener("DOMContentLoaded", () => {
  console.log("Citybus V10 Loaded");

  // 初始化 DOM & 載入選單數據
  for (let i = 0; i < 3; i++) {
    const conf = citybusConfigs[i] || { route: "", stopName: "", dir: "outbound" };

    const routeEl = document.getElementById(`citybus-route-${i + 1}`);
    const stopEl = document.getElementById(`citybus-stop-${i + 1}`);
    const dirEl = document.getElementById(`citybus-dir-${i + 1}`);

    if (routeEl) routeEl.value = conf.route;
    if (stopEl) stopEl.value = conf.stopName;
    if (dirEl) dirEl.value = conf.dir;

    // 綁定輸入監聽，實現動態模糊搜尋選單
    if (stopEl) {
      ensureDatalistExists(`citybus-stop-list-${i + 1}`);
      stopEl.setAttribute("list", `citybus-stop-list-${i + 1}`);
      stopEl.addEventListener("input", (e) => handleStopFuzzySearch(e.target.value, routeEl?.value, dirEl?.value, `citybus-stop-list-${i + 1}`));
    }
  }

  fetchAllCitybusETA();
});

// 建立 HTML datalist 容器
function ensureDatalistExists(listId) {
  if (!document.getElementById(listId)) {
    const datalist = document.createElement("datalist");
    datalist.id = listId;
    document.body.appendChild(datalist);
  }
}

// 動態模糊搜尋城巴站名並更新選單
async function handleStopFuzzySearch(keyword, route, dir, listId) {
  if (!keyword || keyword.trim().length === 0 || !route) return;

  const datalist = document.getElementById(listId);
  if (!datalist) return;

  try {
    const bound = dir === "inbound" ? "inbound" : "outbound";
    const routeStopRes = await fetch(
      `https://data.etabus.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB/${route.trim().toUpperCase()}/${bound}`
    );
    const routeStopData = await routeStopRes.json();

    if (!routeStopData.data) return;

    datalist.innerHTML = ""; // 清除舊選項

    // 搜尋匹配站名
    for (const item of routeStopData.data) {
      const stopRes = await fetch(`https://data.etabus.gov.hk/v1/transport/citybus-nwfb/stop/${item.stop}`);
      const stopData = await stopRes.json();

      if (stopData.data && stopData.data.name_tc && stopData.data.name_tc.includes(keyword.trim())) {
        const option = document.createElement("option");
        option.value = stopData.data.name_tc;
        datalist.appendChild(option);
      }
    }
  } catch (e) {
    console.error("Citybus Fuzzy Search Error", e);
  }
}

// =====================================
// 查詢所有路線
// =====================================

async function fetchAllCitybusETA() {
  const container = document.getElementById("citybus");
  if (!container) return;

  container.innerHTML = "載入中...";

  const results = await Promise.all(
    citybusConfigs
      .filter(c => c.route && c.route.trim())
      .map(conf => fetchSingleCitybus(conf))
  );

  const html = results.filter(Boolean).join("");
  container.innerHTML = html || "目前沒有到站資料";
}

// =====================================
// 查詢單一路線 (以城巴開放 API 為準)
// =====================================

async function fetchSingleCitybus(conf) {
  try {
    const route = conf.route.trim().toUpperCase();
    const stopKeyword = conf.stopName.trim();
    const bound = conf.dir === "inbound" ? "inbound" : "outbound";
    const dirChar = conf.dir === "inbound" ? "I" : "O";

    // 1. 取得路線車站順序列表
    const routeStopRes = await fetch(
      `https://data.etabus.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB/${route}/${bound}`
    );
    const routeStopData = await routeStopRes.json();

    if (!routeStopData.data || routeStopData.data.length === 0) {
      return "";
    }

    let targetStop = null;

    // 2. 比對城巴 App 正確站名
    for (const item of routeStopData.data) {
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

    // 3. 取得城巴到站時間 (ETA)
    const etaRes = await fetch(
      `https://data.etabus.gov.hk/v1/transport/citybus-nwfb/eta/CTB/${targetStop.stopId}/${route}`
    );
    const etaData = await etaRes.json();

    if (!etaData.data || etaData.data.length === 0) {
      return "";
    }

    // 過濾並取得最近 3 班車
    const validEta = etaData.data
      .filter(item => item.dir === dirChar && item.eta)
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
    console.error("Citybus Error", conf.route, e);
    return "";
  }
}

// =====================================
// 儲存設定
// =====================================

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

// =====================================
// 30秒自動更新
// =====================================

setInterval(fetchAllCitybusETA, 30000);
