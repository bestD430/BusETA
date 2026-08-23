let kmbRoute = localStorage.getItem("kmb_route") || "E36A";
let kmbStopName = localStorage.getItem("kmb_stop_name") || "東涌纜車站";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("kmb-route").value = kmbRoute;
  document.getElementById("kmb-stop-name").value = kmbStopName;
  fetchKmbETA();
});

async function fetchKmbETA() {
  const container = document.getElementById("kmb");
  container.innerText = "搜尋車站中...";

  try {
    // 1. 取得該路線的所有站名與 Stop ID 列表
    const routeStopsRes = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${kmbRoute}/outbound/1`);
    const routeStopsData = await routeStopsRes.json();

    if (!routeStopsData.data || routeStopsData.data.length === 0) {
      container.innerText = "找不到此路線";
      return;
    }

    // 2. 尋找匹配的車站 ID
    let targetStopId = null;
    for (const stopItem of routeStopsData.data) {
      const stopDetailRes = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop/${stopItem.stop}`);
      const stopDetail = await stopDetailRes.json();
      if (stopDetail.data && stopDetail.data.name_tc.includes(kmbStopName)) {
        targetStopId = stopItem.stop;
        break;
      }
    }

    if (!targetStopId) {
      container.innerText = "找不到此車站名稱";
      return;
    }

    // 3. 取得 ETA 到站時間
    container.innerText = "載入班次中...";
    const etaRes = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/eta/${targetStopId}/${kmbRoute}/1`);
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
    container.innerText = "載入失敗 (請檢查網絡)";
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
