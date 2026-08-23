async function fetchWeatherData() {
  // 使用 CORS 代理伺服器以防止 GitHub Pages 被天文台阻擋
  const targetUrl = "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc";
  const apiUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("網路回應失敗");
    
    const data = await response.json();

    // 1. 取得圖案（若失敗則自動預設為 50 號天晴圖案）
    const iconNumber = (data.icon && data.icon.length > 0) ? data.icon[0] : 50;
    const iconUrl = `https://www.hko.gov.hk/images/HKO_flaticon/pic${iconNumber}.png`;

    // 2. 取得氣溫列表
    const tempArray = data.temperature ? data.temperature.data : [];
    
    // 3. 搜尋地點（增加彈性搜尋機制）
    const tungChung = tempArray.find((item) => item.place.includes("東涌"));
    const tst = tempArray.find((item) => item.place.includes("尖沙咀") || item.place.includes("京士柏"));

    // 4. 更新東涌 UI
    const tungChungElem = document.getElementById("tungchung");
    if (tungChung && tungChungElem) {
      tungChungElem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${iconUrl}" style="width: 40px; height: 40px;">
          <span style="font-size: 24px; font-weight: bold;">${tungChung.value}°C</span>
        </div>
      `;
    } else if (tungChungElem) {
      tungChungElem.innerText = "暫無數據";
    }

    // 5. 更新尖沙咀 UI
    const tstElem = document.getElementById("tst");
    if (tst && tstElem) {
      tstElem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${iconUrl}" style="width: 40px; height: 40px;">
          <span style="font-size: 24px; font-weight: bold;">${tst.value}°C</span>
        </div>
      `;
    } else if (tstElem) {
      tstElem.innerText = "暫無數據";
    }

  } catch (error) {
    console.error("抓取天氣失敗：", error);
    document.getElementById("tungchung").innerText = "無法載入";
    document.getElementById("tst").innerText = "無法載入";
  }
}

fetchWeatherData();
setInterval(fetchWeatherData, 300000);
