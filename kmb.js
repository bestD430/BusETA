// =====================================
// KMB ETA Widget (修復版)
// =====================================

let kmbRoute = localStorage.getItem("kmb_route") || "E31";
let kmbStopName = localStorage.getItem("kmb_stop_name") || "東涌";
let selectedStopId = localStorage.getItem("kmb_stop_id") || null;

// DOM 載入後執行
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("kmb-route").value = kmbRoute;
    document.getElementById("kmb-stop-name").value = kmbStopName;

    searchStops();
});

// ===========================
// 搜尋車站 (優化：只抓該路線的車站)
// ===========================
async function searchStops() {
    const routeInput = document.getElementById("kmb-route").value.trim().toUpperCase();
    const stopInput = document.getElementById("kmb-stop-name").value.trim();
    const resultContainer = document.getElementById("kmb-stop-results");

    if (!routeInput) {
        resultContainer.innerHTML = "請輸入路線";
        return;
    }

    kmbRoute = routeInput;
    kmbStopName = stopInput;
    resultContainer.innerHTML = "搜尋車站中...";

    try {
        // 1. 抓取該路線的所有站單 (包含去程 outbound / 回程 inbound)
        const [outboundRes, inboundRes] = await Promise.all([
            fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${kmbRoute}/outbound/1`),
            fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${kmbRoute}/inbound/1`)
        ]);

        const outboundData = await outboundRes.json();
        const inboundData = await inboundRes.json();

        let routeStops = [];
        if (outboundData.data) routeStops.push(...outboundData.data);
        if (inboundData.data) routeStops.push(...inboundData.data);

        if (routeStops.length === 0) {
            resultContainer.innerHTML = `找不到路線 ${kmbRoute}`;
            return;
        }

        // 2. 取得所有車站名稱細節 (並行查詢獨立車站名稱 API)
        const uniqueStopIds = [...new Set(routeStops.map(s => s.stop))];
        const stopDetailsMap = {};

        await Promise.all(
            uniqueStopIds.map(async (stopId) => {
                try {
                    const res = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop/${stopId}`);
                    const data = await res.json();
                    if (data.data) {
                        stopDetailsMap[stopId] = data.data.name_tc;
                    }
                } catch (e) {
                    console.error(`無法取得車站資料 ${stopId}`, e);
                }
            })
        );

        // 3. 過濾用戶輸入的關鍵字
        let matches = uniqueStopIds.map(stopId => ({
            stopId: stopId,
            name: stopDetailsMap[stopId] || stopId
        }));

        if (kmbStopName) {
            matches = matches.filter(s => s.name.includes(kmbStopName));
        }

        if (matches.length === 0) {
            resultContainer.innerHTML = `路線 ${kmbRoute} 中找不到包含「${kmbStopName}」的車站`;
            return;
        }

        // 4. 渲染下拉選單
        let html = `
            <div style="margin-top: 8px;">
                <label for="kmb-stop-select">選擇車站：</label>
                <select id="kmb-stop-select">
        `;

        matches.forEach(item => {
            const isSelected = item.stopId === selectedStopId ? "selected" : "";
            html += `<option value="${item.stopId}" ${isSelected}>${item.name} (${item.stopId})</option>`;
        });

        html += `
                </select>
                <button onclick="fetchSelectedStopETA()">查詢 ETA</button>
            </div>
        `;

        resultContainer.innerHTML = html;

        // 若之前已有紀錄或只有一個結果，自動查詢 ETA
        const selectElem = document.getElementById("kmb-stop-select");
        if (selectElem) {
            selectedStopId = selectElem.value;
            fetchKmbETA();
        }

    } catch (error) {
        console.error("搜尋車站失敗:", error);
        resultContainer.innerHTML = "搜尋車站失敗，請檢查網絡連線";
    }
}

// ===========================
// 選擇車站按鈕事件
// ===========================
function fetchSelectedStopETA() {
    const selectElem = document.getElementById("kmb-stop-select");
    if (!selectElem) return;

    selectedStopId = selectElem.value;
    localStorage.setItem("kmb_stop_id", selectedStopId);

    fetchKmbETA();
}

// ===========================
// 查詢到站時間 (ETA)
// ===========================
async function fetchKmbETA() {
    const container = document.getElementById("kmb");

    if (!selectedStopId) {
        container.innerHTML = "請先選擇車站";
        return;
    }

    container.innerHTML = "載入 ETA...";

    try {
        // 使用 Stop-ETA API，一次取得該站點所有方向與路線的班次
        const response = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${selectedStopId}`);
        const etaData = await response.json();

        if (!etaData.data || etaData.data.length === 0) {
            container.innerHTML = "沒有到站班次";
            return;
        }

        // 篩選出符合指定路線 (例如 E31) 且有有效到站時間的資料
        const etaList = etaData.data
            .filter(item => item.route === kmbRoute && item.eta)
            .slice(0, 3);

        if (etaList.length === 0) {
            container.innerHTML = `路線 ${kmbRoute} 暫無班次`;
            return;
        }

        let html = "";
        const now = new Date();

        etaList.forEach(item => {
            const etaTime = new Date(item.eta);
            const mins = Math.round((etaTime - now) / 60000);

            const etaText = mins <= 0 ? "即將到站" : `${mins} 分鐘`;

            let colorClass = "eta-green";
            if (mins <= 2) {
                colorClass = "eta-red";
            } else if (mins <= 5) {
                colorClass = "eta-orange";
            }

            const destText = item.dest_tc ? `往 ${item.dest_tc}` : "";

            html += `
                <div class="eta-item" style="display:flex; justify-content:space-between; margin:4px 0;">
                    <span class="route"><strong>${item.route}</strong> ${destText}</span>
                    <span class="${colorClass}">${etaText}</span>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (error) {
        console.error("ETA 載入失敗:", error);
        container.innerHTML = "ETA 載入失敗";
    }
}

// ===========================
// 更新按鈕 (儲存並重新搜尋)
// ===========================
function saveAndFetchKmb() {
    kmbRoute = document.getElementById("kmb-route").value.trim().toUpperCase();
    kmbStopName = document.getElementById("kmb-stop-name").value.trim();

    localStorage.setItem("kmb_route", kmbRoute);
    localStorage.setItem("kmb_stop_name", kmbStopName);

    searchStops();
}

// ===========================
// 每 30 秒自動刷新時間
// ===========================
setInterval(() => {
    if (selectedStopId) {
        fetchKmbETA();
    }
}, 30000);
