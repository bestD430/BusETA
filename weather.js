// 天文台圖案編號對應的 Emoji 備用表
function getWeatherEmoji(iconNum) {
  const code = parseInt(iconNum);
  if ([50, 51, 52].includes(code)) return "☀️"; // 陽光/天晴
  if ([53, 54, 60, 61].includes(code)) return "⛅"; // 多雲/陽光陣顯
  if ([62, 63, 64, 65].includes(code)) return "🌧️"; // 有雨/陣雨
  if ([70, 71, 72, 73, 74, 75, 76, 77].includes(code)) return "🌩️"; // 雷暴
  return "🌤️"; // 預設
}

async function fetchWeatherData() {
  const targetUrl = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc&_t=" + Date.now();

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) throw new Error("網絡回應錯誤");
    const data = await response.json();

    // 1. 取得圖案編號
    const rawIcon = (data.icon && data.icon.length > 0) ? data.icon[0] : 50;
    const iconNum = String(rawIcon).padStart(2, '0');
    
    // 使用 Data.gov.hk / HKO 官方靜態網址
    const imgUrl = `https://www.hko.gov.hk/images/HKO_flaticon/pic${rawIcon}.png`;
    const emoji = getWeatherEmoji(rawIcon);

    // 2. 氣溫數據
    const tempArray = data.temperature ? data.temperature.data : [];
    const tungChung = tempArray.find((item) => item.place && item.place.includes("東涌"));
    const tst = tempArray.find((item) => item.place && (item.place.includes("尖沙咀") || item.place.includes("京士柏")));

    //  HTML 渲染範本（若圖片載入失敗，會自動切換顯示高畫質 Emoji）
    const renderCard = (elementId, itemData) => {
      const elem = document.getElementById(elementId);
      if (!elem) return;
      const val = itemData ? itemData.value : "--";

      elem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; height: 48px;">
          <img src="${imgUrl}" alt="天氣" style="width: 42px; height: 42px; object-fit: contain;" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
          <span style="display: none; font-size: 32px; line-height: 1;">${emoji}</span>
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
