async function fetchWeatherData() {
  const targetUrl = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc&_t=" + Date.now();

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error("網絡回應錯誤");
    const data = await response.json();

    // 1. 取得圖案編號 (若無則預設 50)
    const rawIcon = (data.icon && data.icon.length > 0) ? data.icon[0] : 50;
    
    // 指向你 GitHub 內的本地圖片路徑
    const localImgUrl = `./weather-icons/pic${rawIcon}.png`;

    // 2. 取得氣溫列表
    const tempArray = data.temperature ? data.temperature.data : [];
    const tungChung = tempArray.find((item) => item.place && item.place.includes("東涌"));
    const tst = tempArray.find((item) => item.place && (item.place.includes("尖沙咀") || item.place.includes("京士柏")));

    // 渲染卡片 HTML
    const renderCard = (elementId, itemData) => {
      const elem = document.getElementById(elementId);
      if (!elem) return;
      const val = itemData ? itemData.value : "--";

      elem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; height: 48px;">
          <img src="${localImgUrl}" alt="天氣" style="width: 42px; height: 42px; object-fit: contain;" onerror="this.onerror=null; this.src='./weather-icons/pic50.png';">
          <span style="font-size: 26px; font-weight: bold;">${val}°C</span>
        </div>
      `;
    };

    // 3. 更新 UI
    renderCard("tungchung", tungChung);
    renderCard("tst", tst);

  } catch (error) {
    console.error("抓取天氣失敗：", error);
  }
}

fetchWeatherData();
setInterval(fetchWeatherData, 300000);
