let citybusRoute = localStorage.getItem("citybus_route") || "A21";
let citybusStopName = localStorage.getItem("citybus_stop_name") || "金鐘站";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("citybus-route").value = citybusRoute;
  document.getElementById("citybus-stop-name").value = citybusStopName;
  fetchCitybusETA();
});

async function fetchCitybusETA() {
  const container = document.getElementById("citybus");
  container.innerText = "搜尋車站中...";

  try {
    // 1. 取得該路線的車站列表
    const routeStopsRes = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/${citybusRoute}/inbound`);
    const routeStopsData = await routeStopsRes.json();

    if (!routeStopsData.data || routeStopsData.data.length === 0) {
      container.innerText = "找不到此路線";
      return;
    }

    // 2. 只查詢該路線的車站詳細名稱（平行發送請求，提升速度）
    const stopPromises = routeStopsData.data.slice(0, 15).map(s => 
      fetch(`https://rt.data.gov.hk/v2/transport/citybus/stop/${s.stop}`).then(r => r.json())
    );
    const stopsDetails = await Promise.all(stopPromises);

    let targetStopId = null;
    for (const detail of stopsDetails) {
      if (detail.data && detail.data.name_tc.includes(citybusStopName)) {
        targetStopId = detail.data.stop;
        break;
      }
    }

    if (!targetStopId) {
      container.innerText = "找不到此車站名稱";
      return;
    }

    // 3. 抓取城巴 ETA 數據
    const etaRes = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/${targetStopId}/${citybusRoute}`);
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

function saveAndFetchCitybus() {
  citybusRoute = document.getElementById("citybus-route").value.trim().toUpperCase();
  citybusStopName = document.getElementById("citybus-stop-name").value.trim();

  localStorage.setItem("citybus_route", citybusRoute);
  localStorage.setItem("citybus_stop_name", citybusStopName);

  fetchCitybusETA();
}

setInterval(fetchCitybusETA, 30000);
