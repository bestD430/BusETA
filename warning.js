async function fetchWarningData() {
  try {
    const response = await fetch(
      "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=tc"
    );
    const data = await response.json();

    const warningBox = document.getElementById("warning-msg");
    const warningIconBox = document.getElementById("warning-icon");

    // 若當前無任何警告
    if (Object.keys(data).length === 0) {
      warningBox.innerText = "現時生效警告：無";
      warningIconBox.innerHTML = "";
      return;
    }

    // 若有警告，取第一個顯示
    let warningNames = [];
    for (let key in data) {
      warningNames.push(data[key].name);
    }

    warningBox.innerText = warningNames.join("、");
    warningIconBox.innerHTML = "⚠️";
  } catch (error) {
    document.getElementById("warning-msg").innerText = "暫無警告資料";
  }
}

fetchWarningData();
setInterval(fetchWarningData, 300000);
