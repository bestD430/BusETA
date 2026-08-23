async function fetchWeatherData() {
  try {
    const response = await fetch(
      "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc"
    );
    const data = await response.json();

    // 取得溫度數據陣列
    const tempTempData = data.temperature.data;

    // 尋找東涌與尖沙咀的氣溫
    const tungChungObj = tempTempData.find((item) => item.place === "東涌");
    const tstObj = tempTempData.find((item) => item.place === "尖沙咀");

    // 更新 東涌 顯示內容
    if (tungChungObj) {
      document.getElementById("tungchung").innerHTML = `
        氣溫：${tungChungObj.value}°C<br>
        更新時間：${data.updateTime.substring(11, 16)}
      `;
    }

    // 更新 尖沙咀 顯示內容
    if (tstObj) {
      document.getElementById("tst").innerHTML = `
        氣溫：${tstObj.value}°C<br>
        更新時間：${data.updateTime.substring(11, 16)}
      `;
    }
  } catch (error) {
    console.error("獲取天氣資料失敗:", error);
    document.getElementById("tungchung").innerHTML = "暫時無法取得數據";
    document.getElementById("tst").innerHTML = "暫時無法取得數據";
  }
}

// 首次載入執行
fetchWeatherData();

// 每 5 分鐘自動更新一次
setInterval(fetchWeatherData, 300000);
