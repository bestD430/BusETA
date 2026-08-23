// 取得儲存的設定或預設值
let kmbRoute = localStorage.getItem("kmb_route") || "E36A";
let kmbStop = localStorage.getItem("kmb_stop") || "002221";

// 初始化輸入框數值
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("kmb-route").value = kmbRoute;
  document.getElementById("kmb-stop").value = kmbStop;
  fetchKmbETA();
});

async function fetchKmbETA() {
  const container = document.getElementById("kmb");
  container.innerText = "更新中...";

  try {
    const response = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/eta/${kmbStop}/${kmbRoute}/1`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      container.innerText = "暫無到站班次";
      return;
    }

    // 取前 3 班巴士的 ETA
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

function saveAndFetchKmb() {
  kmbRoute = document.getElementById("kmb-route").value.trim().toUpperCase();
  kmbStop = document.getElementById("kmb-stop").value.trim();

  localStorage.setItem("kmb_route", kmbRoute);
  localStorage.setItem("kmb_stop", kmbStop);

  fetchKmbETA();
}

setInterval(fetchKmbETA, 30000);
