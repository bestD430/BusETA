async function fetchWeatherData() {
  try {
    // 呼叫香港天文台即時天氣 API
    const response = await fetch(
      "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc"
    );
    const data = await response.json();

    // 1. 取得天文台官方天氣圖案編號
    const iconNumber = data.icon ? data.icon[0] : 50;
    const iconUrl = `https://www.hko.gov.hk/images/HKO_flaticon/pic${iconNumber}.png`;

    // 2. 搜尋東涌與尖沙咀氣溫
    const tempArray = data.temperature.data;
    const tungChung = tempArray.find((item) => item.place === "東涌");
    const tst = tempArray.find((item) => item.place === "尖沙咀");

    // 3. 渲染東涌資料
    if (tungChung) {
      document.getElementById("tungchung").innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
          <img src="${iconUrl}" alt="天氣圖案" style="width: 48px; height: 48px;">
          <span style="font-size: 28px; font-weight: bold;">${tungChung.value}°C</span>
        </div>
      `;
    }

    // 4. 渲染尖沙咀資料
    if (tst) {
      document.getElementById("tst").innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
          <img src="${iconUrl}" alt="天氣圖案" style="width: 48px; height: 48px;">
          <span style="font-size: 28px; font-weight: bold;">${tst.value}°C</span>
        </div>
      `;
    }
  } catch (error) {
    console.error("無法取得天氣資料：", error);
  }
}

// 立即執行並設定每 5 分鐘自動更新
fetchWeatherData();
setInterval(fetchWeatherData, 300000);
