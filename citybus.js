// =====================================
// Citybus ETA Widget (多路線 & 效能修復版)
// =====================================

// 預設 3 組城巴路線與站名設定
let citybusConfigs = JSON.parse(localStorage.getItem("citybus_configs")) || [
    { route: "E21A", stopName: "雍逸樓", stopId: null },
    { route: "E21B", stopName: "雍逸樓", stopId: null },
    { route: "S52", stopName: "逸東邨總站", stopId: null }
];

document.addEventListener("DOMContentLoaded", () => {
    // 填入儲存的設定值到輸入框
    for (let i = 0; i < 3; i++) {
        const conf = citybusConfigs[i] || { route: "", stopName: "" };
        const routeEl = document.getElementById(`citybus-route-${i + 1}`);
        const stopEl = document.getElementById(`citybus-stop-${i + 1}`);
        if (routeEl) routeEl.value = conf.route;
        if (stopEl) stopEl.value = conf.stopName;
    }

    initAndFetchAllCitybus();
});

// 初始化車站 ID 並抓取 ETA
async function initAndFetchAllCitybus() {
    const container = document.getElementById("citybus");
    container.innerHTML = "尋找城巴車站中...";

    // 為每條設定尋找匹配的 Stop ID
    for (let i = 0; i < citybusConfigs.length; i++) {
        const conf = citybusConfigs[i];
        if (conf.route && conf.stopName) {
            conf.stopId = await findCitybusStopId(conf.route, conf.stopName);
        } else {
            conf.stopId = null;
        }
    }

    localStorage.setItem("citybus_configs", JSON.stringify(citybusConfigs));
    fetchAllCitybusETA();
}

// 根據路線與關鍵字尋找匹配的城巴 Stop ID (同時搜尋去程與回程)
async function findCitybusStopId(route, keyword) {
    try {
        // 同時抓取去程 (outbound) 與回程 (inbound) 站單
        const [outRes, inRes] = await Promise.all([
            fetch(`https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/${route}/outbound`).catch(() => null),
            fetch(`https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/${route}/inbound`).catch(() => null)
        ]);

        let stops = [];
        if (outRes && outRes.ok) {
            const d = await outRes.json();
            if (d.data) stops.push(...d.data);
        }
        if (inRes && inRes.ok) {
            const d = await inRes.json();
            if (d.data) stops.push(...d.data);
        }

        if (stops.length === 0) return null;

        // 取得唯一的 stop ID 清單
        const uniqueStopIds = [...new Set(stops.map(s => s.stop))];

        // 查詢車站詳細名稱細節
        const stopPromises = uniqueStopIds.map(stopId =>
            fetch(`https://rt.data.gov.hk/v2/transport/citybus/stop/${stopId}`)
                .then(r => r.json())
                .catch(() => null)
        );

        const stopsDetails = await Promise.all(stopPromises);

        for (const detail of stopsDetails) {
            if (detail && detail.data && detail.data.name_tc && detail.data.name_tc.includes(keyword)) {
                return detail.data.stop; // 回傳匹配的車站 ID
            }
        }
    } catch (e) {
        console.error(`尋找城巴路線 ${route} 車站失敗:`, e);
    }
    return null;
}

// 同時查詢並顯示所有設定路線的城巴 ETA
async function fetchAllCitybusETA() {
    const container = document.getElementById("citybus");
    let fullHtml = "";

    const activeConfigs = citybusConfigs.filter(c => c.route && c.stopId);

    if (activeConfigs.length === 0) {
        container.innerHTML = "<div style='color:#aaa;'>請檢查城巴路線與站名</div>";
        return;
    }

    // 並行抓取所有已匹配 Stop ID 的 ETA
    const promises = activeConfigs.map(conf =>
        fetch(`https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/${conf.stopId}/${conf.route}`)
            .then(res => res.json())
            .then(data => ({ conf, data: data.data || [] }))
            .catch(() => ({ conf, data: [] }))
    );

    const results = await Promise.all(promises);

    results.forEach(({ conf, data }) => {
        const etaList = data
            .filter(item => item.eta)
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

// 按鈕更新事件 (對應 index.html 的 saveAndFetchCitybus())
function saveAndFetchCitybus() {
    for (let i = 0; i < 3; i++) {
        const routeEl = document.getElementById(`citybus-route-${i + 1}`);
        const stopEl = document.getElementById(`citybus-stop-${i + 1}`);

        const route = routeEl ? routeEl.value.trim().toUpperCase() : "";
        const stopName = stopEl ? stopEl.value.trim() : "";

        citybusConfigs[i] = { route, stopName, stopId: null };
    }

    initAndFetchAllCitybus();
}

// 每 30 秒自動刷新 ETA
setInterval(() => {
    fetchAllCitybusETA();
}, 30000);
