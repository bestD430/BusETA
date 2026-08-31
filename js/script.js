// 九巴 1A 線（往尖沙咀碼頭）- 秀茂坪邨秀樂樓站 (Stop ID: B2A29C5B64E4D3E6)
var API_URL = "https://data.etabus.gov.hk/v1/transport/kmb/eta/B2A29C5B64E4D3E6/1A/1";

function fetchETA() {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", API_URL, true);

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          var response = JSON.parse(xhr.responseText);
          updateUI(response.data);
        } catch (e) {
          console.error("JSON 解析失敗", e);
        }
      } else {
        console.error("API 請求失敗，狀態碼：", xhr.status);
      }
    }
  };
  xhr.send();
}

function updateUI(data) {
  if (!data || data.length === 0) return;

  for (var i = 0; i < 3; i++) {
    var element = document.getElementById("eta" + (i + 1));
    if (data[i] && data[i].eta) {
      element.innerText = calculateMinutes(data[i].eta);
    } else {
      element.innerText = "--";
    }
  }

  var now = new Date();
  document.getElementById("update-time").innerText =
    "最後更新: " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
}

function calculateMinutes(etaTime) {
  var eta = new Date(etaTime);
  var now = new Date();
  var diffMins = Math.round((eta - now) / 60000);

  if (diffMins <= 0) return "即將到站";
  return diffMins + " 分鐘";
}

function pad(num) {
  return num < 10 ? "0" + num : num;
}

// 首次載入與定時更新
fetchETA();
setInterval(fetchETA, 30000);
