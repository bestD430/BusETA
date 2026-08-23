let kmbRoute = localStorage.getItem("kmb_route") || "E36A";
let kmbStopName = localStorage.getItem("kmb_stop_name") || "東涌纜車站";
let kmbStopsCache = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("kmb-route").value = kmbRoute;
  document.getElementById("kmb-stop-name").value = kmbStopName;
  fetchKmbETA();
});

async function fetchKmbETA() {
  const container = document.getElementById("kmb");
  container.innerText = "搜尋車站中...";

  try {
    // 1. 抓取該路線的車站列表
    const routeStopsRes = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${kmbRoute}/outbound/1`);
    const routeStopsData = await routeStopsRes.json();

    if (!routeStopsData.data || routeStopsData.data.length === 0) {
      container.innerText = "找不到此路線";
      return;
    }

    // 2. 一次過抓取所有車站名稱資料（若無快取）
    if (!kmbStopsCache) {
      const allStopsRes = await fetch("https://data.etabus.gov.hk/v1/transport/kmb/stop");
      const allStopsData = await allStopsRes.json();
      kmbStopsCache = {};
      if (allStopsData.data) {
        allStopsData.data.forEach(s => { kmbStopsCache[s.stop] = s.name_tc; });
      }
    }

    // 3. 在記憶體中快速比對中文站名
    const targetStop = routeStopsData.data.find(s => {
      const name = kmbStopsCache[s.stop] || "";
      return name.includes(kmbStopName);
    });

    if (!targetStop) {
      container.innerText = "找不到此車站名稱";
      return;
    }

    // 4. 取得 ETA 到站時間
    const etaRes = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/eta/${targetStop.stop}/${kmbRoute}/1`);
    const etaData = await etaRes.json();

    if (!etaData.data || etaData.data.length === 0) {
      container.innerText = "現時無到站班次";
      return;
    }

    const list = etaData.data.slice(0, 3).map(item => {
      if (!item.eta) return `${item.route} - 暫無資料`;
      const diffMin = Math.round((new Date(item.eta) - new Date()) / 60000);
      const text = diffMin <= 0 ? "即將到站" : `${diffMin} 分鐘`;
      return `${item.route}往${item.dest_tc} - ${text}`;
    });

    container.innerHTML = list.join("<br>");
  } catch (err) {
    console.error(err);
    container.innerText = "載入失敗";
  }
}

function saveAndFetchKmb() {
  kmbRoute = document.getElementById("kmb-route").value.trim().toUpperCase();
  kmbStopName = document.getElementById("kmb-stop-name").value.trim();

  localStorage.setItem("kmb_route", kmbRoute);
  localStorage.setItem("kmb_stop_name", kmbStopName);

  fetchKmbETA();
}

setInterval(fetchKmbETA, 30000);
