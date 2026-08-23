async function fetchWeatherData() {
  const targetUrl = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc&_t=" + Date.now();

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error("網絡回應錯誤");
    const data = await response.json();

    // 1. 取得圖案編號並確保補足 2 位數 (例如 5 變成 05)
    let rawIcon = (data.icon && data.icon.length > 0) ? data.icon[0] : 50;
    let iconNum = String(rawIcon).padStart(2, '0');
    
    // 使用天文台官方最穩定、支援 CORS 的圖案網址
    const iconUrl = `https://www.hko.gov.hk/textonly/v2/m/img/pic${iconNum}.dev.png`;

    // 2. 取得氣溫列表
    const tempArray = data.temperature ? data.temperature.data : [];

    // 3. 搜尋地點 (天文台 API 尖沙咀區域為「京士柏」或「尖沙咀」)
    const tungChung = tempArray.find((item) => item.place && item.place.includes("東涌"));
    const tst = tempArray.find((item) => item.place && (item.place.includes("尖沙咀") || item.place.includes("京士柏")));

    // 4. 更新 東涌 UI
    const tungChungElem = document.getElementById("tungchung");
    if (tungChungElem) {
      const val = tungChung ? tungChung.value : "--";
      tungChungElem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${iconUrl}" alt="天氣" style="width: 40px; height: 40px;" onerror="this.onerror=null; this.src='https://www.hko.gov.hk/images/HKO_flaticon/pic${rawIcon}.png';">
          <span style="font-size: 24px; font-weight: bold;">${val}°C</span>
        </div>
      `;
    }

    // 5. 更新 尖沙咀 UI
    const tstElem = document.getElementById("tst");
    if (tstElem) {
      const val = tst ? tst.value : "--";
      tstElem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${iconUrl}" alt="天氣" style="width: 40px; height: 40px;" onerror="this.onerror=null; this.src='https://www.hko.gov.hk/images/HKO_flaticon/pic${rawIcon}.png';">
          <span style="font-size: 24px; font-weight: bold;">${val}°C</span>
        </div>
      `;
    }

  } catch (error) {
    console.error("抓取天氣失敗：", error);
  }
}

fetchWeatherData();
setInterval(fetchWeatherData, 300000);
