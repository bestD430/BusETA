// =====================================
// KMB ETA Widget (多路線支援版)
// =====================================

// 預設 3 組路線與站名設定
let kmbConfigs = JSON.parse(localStorage.getItem("kmb_configs")) || [
    { route: "E31", stopName: "東涌纜車站", stopId: null },
    { route: "37M", stopName: "迎東邨", stopId: null },
    { route: "", stopName: "", stopId: null }
];

document.addEventListener("DOMContentLoaded", () => {
    // 填入先前儲存的設定值
    for (let i = 0; i < 3; i++) {
        const conf = kmbConfigs[i] || { route: "", stopName: "" };
        const routeEl = document.getElementById(`kmb-route-${i + 1}`);
        const stopEl = document.getElementById(`kmb-stop-${i + 1}`);
        if (routeEl) routeEl.value = conf.route;
        if (stopEl) stopEl.value = conf.stopName;
    }

    initAndFetchAll();
});

// ===========================
// 初始化車站並抓取 ETA
// ===========================
async function initAndFetchAll() {
    const container = document.getElementById("kmb");
    container.innerHTML = "載入中...";

    // 逐一尋找各路線的對應 Stop ID
    for (let i = 0; i < kmbConfigs.length; i++) {
        const conf = kmbConfigs[i];
        if (conf.route && conf.stopName && !conf.stopId) {
            conf.stopId = await findStopId(conf.route, conf.stopName);
        }
    }

    localStorage.setItem("kmb_configs", JSON.stringify(kmbConfigs));
    fetchAllKmbETA();
}

// 根據路線與關鍵字尋找最匹配的 Stop ID
async function findStopId(route, keyword) {
    try {
        const [outRes, inRes] = await Promise.all([
            fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route}/outbound/1`),
            fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route}/inbound/1`)
        ]);

        const outData = await outRes.json();
        const inData = await inRes.json();

        let stops = [];
        if (outData.data) stops.push(...outData.data);
        if (inData.data) stops.push(...inData.data);

        const uniqueStopIds = [...new Set(stops.map(s => s.stop))];

        for (const stopId of uniqueStopIds) {
            const res = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop/${stopId}`);
            const data = await res.json();
            if (data.data && data.data.name_tc.includes(keyword)) {
                return stopId; // 回傳第一個匹配的車站 ID
            }
        }
    } catch (e) {
        console.error(`尋找路線 ${route} 車站失敗`, e);
    }
    return null;
}

// ===========================
// 同時查詢並顯示最多 3 條路線的 ETA
// ===========================
async function fetchAllKmbETA() {
    const container = document.getElementById("kmb");
    let fullHtml = "";

    const activeConfigs = kmbConfigs.filter(c => c.route && c.stopId);

    if (activeConfigs.length === 0) {
        container.innerHTML = "請輸入有效的路線與站名";
        return;
    }

    // 並行抓取所有設定路線的 ETA
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
            .slice(0, 2); // 每條路線最多顯示近 2 班

        fullHtml += `<div class="route-group" style="margin-bottom: 10px; border-bottom: 1px dashed #ccc; padding-bottom: 5px;">`;
        fullHtml += `<div style="font-weight: bold; color: #333;">🚌 ${conf.route} (${conf.stopName})</div>`;

        if (etaList.length === 0) {
            fullHtml += `<div style="font-size: 12px; color: #888;">暫無班次或資訊</div>`;
        } else {
            etaList.forEach(item => {
                const mins = Math.round((new Date(item.eta) - new Date()) / 60000);
                const etaText = mins <= 0 ? "即將到站" : `${mins} 分鐘`;

                let colorClass = "eta-green";
                if (mins <= 2) colorClass = "eta-red";
                else if (mins <= 5) colorClass = "eta-orange";

                const destText = item.dest_tc ? `往 ${item.dest_tc}` : "";

                fullHtml += `
                    <div class="eta-item" style="display:flex; justify-content:space-between; font-size: 14px; margin: 2px 0;">
                        <span>${destText}</span>
                        <span class="${colorClass}">${etaText}</span>
                    </div>
                `;
            });
        }
        fullHtml += `</div>`;
    });

    container.innerHTML = fullHtml;
}

// ===========================
// 按鈕更新事件
// ===========================
function saveAndFetchKmb() {
    for (let i = 0; i < 3; i++) {
        const route = document.getElementById(`kmb-route-${i + 1}`).value.trim().toUpperCase();
        const stopName = document.getElementById(`kmb-stop-${i + 1}`).value.trim();

        // 若輸入有變更，清除既有 Stop ID 重置查詢
        if (kmbConfigs[i].route !== route || kmbConfigs[i].stopName !== stopName) {
            kmbConfigs[i] = { route, stopName, stopId: null };
        }
    }

    initAndFetchAll();
}

// 每 30 秒自動刷新
setInterval(() => {
    fetchAllKmbETA();
}, 30000);
