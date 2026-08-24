// =====================================
// KMB ETA Widget (效能修復版)
// =====================================

// 預設 3 組路線與站名設定
let kmbConfigs = JSON.parse(localStorage.getItem("kmb_configs")) || [
    { route: "E31", stopName: "雍逸樓", stopId: null },
    { route: "E36A", stopName: "雍逸東", stopId: null },
    { route: "N31", stopName: "雍逸樓", stopId: null }
];

let globalStopsCache = null; // 全域快取所有車站數據

document.addEventListener("DOMContentLoaded", () => {
    // 填入儲存的設定值到輸入框
    for (let i = 0; i < 3; i++) {
        const conf = kmbConfigs[i] || { route: "", stopName: "" };
        const routeEl = document.getElementById(`kmb-route-${i + 1}`);
        const stopEl = document.getElementById(`kmb-stop-${i + 1}`);
        if (routeEl) routeEl.value = conf.route;
        if (stopEl) stopEl.value = conf.stopName;
    }

    initAndFetchAll();
});

// 取得全港所有九巴車站資料 (帶快取機制)
async function fetchAllStopsOnce() {
    if (globalStopsCache) return globalStopsCache;
    try {
        const res = await fetch("https://data.etabus.gov.hk/v1/transport/kmb/stop");
        const data = await res.json();
        if (data && data.data) {
            // 建立以 stop ID 為 key 的 Map 方便快速比對
            globalStopsCache = new Map(data.data.map(s => [s.stop, s.name_tc]));
            return globalStopsCache;
        }
    } catch (e) {
        console.error("下載全港車站清單失敗:", e);
    }
    return new Map();
}

// 初始化車站 ID 並抓取 ETA
async function initAndFetchAll() {
    const container = document.getElementById("kmb");
    container.innerHTML = "尋找車站中...";

    // 1. 先下載一次車站清單
    const stopsMap = await fetchAllStopsOnce();

    // 2. 為每條設定尋找匹配的 Stop ID
    for (let i = 0; i < kmbConfigs.length; i++) {
        const conf = kmbConfigs[i];
        if (conf.route && conf.stopName) {
            conf.stopId = await findStopId(conf.route, conf.stopName, stopsMap);
        } else {
            conf.stopId = null;
        }
    }

    localStorage.setItem("kmb_configs", JSON.stringify(kmbConfigs));
    fetchAllKmbETA();
}

// 根據路線與關鍵字尋找匹配的 Stop ID (零網路延遲比對)
async function findStopId(route, keyword, stopsMap) {
    try {
        // 抓取該路線的去程與回程站單
        const [outRes, inRes] = await Promise.all([
            fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route}/outbound/1`).catch(() => null),
            fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route}/inbound/1`).catch(() => null)
        ]);

        let routeStops = [];
        if (outRes && outRes.ok) {
            const d = await outRes.json();
            if (d.data) routeStops.push(...d.data);
        }
        if (inRes && inRes.ok) {
            const d = await inRes.json();
            if (d.data) routeStops.push(...d.data);
        }

        // 本地比對站名
        for (const item of routeStops) {
            const stopName = stopsMap.get(item.stop) || "";
            if (stopName.includes(keyword)) {
                return item.stop; // 找到第一個名稱匹配的車站
            }
        }
    } catch (e) {
        console.error(`尋找路線 ${route} 車站失敗:`, e);
    }
    return null;
}

// 同時查詢並顯示所有設定路線的 ETA
async function fetchAllKmbETA() {
    const container = document.getElementById("kmb");
    let fullHtml = "";

    const activeConfigs = kmbConfigs.filter(c => c.route && c.stopId);

    if (activeConfigs.length === 0) {
        container.innerHTML = "<div style='color:#aaa;'>請檢查路線與站名是否正確</div>";
        return;
    }

    // 並行抓取所有已匹配 Stop ID 的 ETA
    const promises = activeConfigs.map(conf =>
        fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${conf.stopId}`)
            .then(res => res.json())
            .then(data => ({ conf, data: data.data || [] }))
            .catch(() => ({ conf, data: [] }))
    );

    const results = await Promise.all(promises);

    results.forEach(({ conf, data }) => {
        const etaList = data
            .filter(item => item.route === conf.route && item.eta)
            .slice(0, 2); // 每條路線顯示最新 2 班

        fullHtml += `<div class="route-group" style="margin-bottom: 8px; border-bottom: 1px dashed #3a3a3c; padding-bottom: 6px;">`;
        fullHtml += `<div style="font-weight: bold; color: #fff; font-size: 14px;">🚌 ${conf.route} (${conf.stopName})</div>`;

        if (etaList.length === 0) {
            fullHtml += `<div style="font-size: 12px; color: #888;">暫無到站班次</div>`;
        } else {
            etaList.forEach(item => {
                const mins = Math.round((new Date(item.eta) - new Date()) / 60000);
                const etaText = mins <= 0 ? "即將到站" : `${mins} 分鐘`;

                let colorClass = "eta-green";
                if (mins <= 2) colorClass = "eta-red";
                else if (mins <= 5) colorClass = "eta-orange";

                const destText = item.dest_tc ? `往 ${item.dest_tc}` : "";

                fullHtml += `
                    <div class="eta-item" style="display:flex; justify-content:space-between; font-size: 13px; margin-top: 2px;">
                        <span style="color:#ccc;">${destText}</span>
                        <span class="${colorClass}">${etaText}</span>
                    </div>
                `;
            });
        }
        fullHtml += `</div>`;
    });

    container.innerHTML = fullHtml;
}

// 按鈕更新事件 (重新讀取輸入框)
function saveAndFetchKmb() {
    for (let i = 0; i < 3; i++) {
        const route = document.getElementById(`kmb-route-${i + 1}`).value.trim().toUpperCase();
        const stopName = document.getElementById(`kmb-stop-${i + 1}`).value.trim();

        kmbConfigs[i] = { route, stopName, stopId: null };
    }

    initAndFetchAll();
}

// 每 30 秒自動刷新 ETA
setInterval(() => {
    fetchAllKmbETA();
}, 30000);
