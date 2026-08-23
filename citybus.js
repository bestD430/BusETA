let citybusRoute = localStorage.getItem("citybus_route") || "A21";
let citybusStop = localStorage.getItem("citybus_stop") || "001000";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("citybus-route").value = citybusRoute;
  document.getElementById("citybus-stop").value = citybusStop;
  fetchCitybusETA();
});

async function fetchCitybusETA() {
  const container = document.getElementById("citybus");
  container.innerText = "更新中...";

  try {
    const response = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/${citybusStop}/${citybusRoute}`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      container.innerText = "暫無到站班次";
      return;
    }

    const list = data.data.slice(0, 3).map(item => {
      if (!item.eta) return `${item.route} - 暫無資料`;
      const diffMin = Math.round((new Date(item.eta) - new Date()) / 60000);
      const text = diffMin <= 0 ? "即將到站" : `${diffMin} 分鐘`;
      return `${item.route}往${item.dest_tc} - ${text}`;
    });

    container.innerHTML = list.join("<br>");
  } catch (err) {
    container.innerText = "載入失敗 (請檢查車站ID)";
  }
}

function saveAndFetchCitybus() {
  citybusRoute = document.getElementById("citybus-route").value.trim().toUpperCase();
  citybusStop = document.getElementById("citybus-stop").value.trim();

  localStorage.setItem("citybus_route", citybusRoute);
  localStorage.setItem("citybus_stop", citybusStop);

  fetchCitybusETA();
}

setInterval(fetchCitybusETA, 30000);
