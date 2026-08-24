// =====================================
// KMB ETA Widget (支援行車方向選單)
// =====================================

// 預設 3 組九巴路線、站名與方向 (outbound / inbound)
let kmbConfigs = JSON.parse(localStorage.getItem("kmb_configs")) || [
    { route: "E31", stopName: "雍逸樓", dir: "outbound", stopId: null },
    { route: "E36A", stopName: "雍逸東", dir: "outbound", stopId: null },
    { route: "N31", stopName: "雍逸樓", dir: "outbound", stopId: null }
];

let globalKmbStopsCache = null;

document.addEventListener("DOMContentLoaded", () => {
    // 填入儲存的設定值到輸入框與選單
    for (let i = 0; i < 3; i++) {
        const conf = kmbConfigs[i] || { route: "", stopName: "", dir: "outbound" };
        const routeEl = document.getElementById(`kmb-route-${i + 1}`);
        const stopEl = document.getElementById(`kmb-stop-${i + 1}`);
        const dirEl = document.getElementById(`kmb-dir-${i + 1}`);

        if (routeEl) routeEl.value = conf.route;
        if (stopEl) stopEl.value = conf.stopName;
        if (dirEl) dirEl.value = conf.dir || "outbound";
    }

    initAndFetchAllKmb();
});

// 下載全港車站資料 (帶快取)
async function fetchAllKmbStopsOnce() {
    if (globalKmbStopsCache) return globalKmbStopsCache;
    try {
        const res = await fetch("https://data.etabus.gov.hk/v1/transport/kmb/stop");
        const data = await res.json();
        if (data && data.data) {
            globalKmbStopsCache = new Map(data.data.map(s => [s.stop, s.name_tc]));
            return globalKmbStopsCache;
        }
    } catch (e) {
        console.error("下載九巴車站資料失敗:", e);
    }
    return new Map();
}

async function initAndFetchAllKmb() {
    const container = document.getElementById("kmb");
    container.innerHTML = "尋找九巴車站中...";

    const stopsMap = await fetchAllKmbStopsOnce();

    // 依據路線、站名與方向尋找對應 Stop ID
    for (let i = 0; i < kmbConfigs.length; i++) {
        const conf = kmbConfigs[i];
        if (conf.route && conf.stopName) {
            conf.stopId = await findKmbStopId(conf.route, conf.stopName, conf.dir, stopsMap);
        } else {
            conf.stopId = null;
        }
    }

    localStorage.setItem("kmb_configs", JSON.stringify(kmbConfigs));
    fetchAllKmbETA();
}

async function findKmbStopId(route, keyword, dir, stopsMap) {
    try {
        // 只抓取指定方向 (outbound 去程 / inbound 回程) 的站單
        const serviceType = "1";
        const res = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route}/${dir}/${serviceType}`);
        if (!res.ok) return null;
        const d = await res.json();
        
        if (!d.data || d.data.length === 0) return null;

        for (const item of d.data) {
            const stopName = stopsMap.get(item.stop) || "";
            if (stopName.includes(keyword)) {
                return item.stop; // 找到第一個匹配該方向的車站 ID
            }
        }
    } catch (e) {
        console.error(`尋找九巴 ${route} (${dir}) 車站失敗:`, e);
    }
    return null;
}

async function fetchAllKmbETA() {
    const container = document.getElementById("kmb");
    let fullHtml = "";

    const activeConfigs = kmbConfigs.filter(c => c.route && c.stopId);

    if (activeConfigs.length === 0) {
        container.innerHTML = "<div style='color:#aaa;'>請檢查九巴路線與站名</div>";
        return;
    }

    const promises = activeConfigs.map(conf =>
        fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${conf.stopId}`)
            .then(res => res.json())
            .then(data => ({ conf, data: data.data || [] }))
            .catch(() => ({ conf, data: [] }))
    );

    const results = await Promise.all(promises);

    results.forEach(({ conf, data }) => {
        // 篩選對應路線與方向 (dir = outbound -> O / inbound -> I)
        const dirCode = conf.dir === "outbound" ? "O" : "I";
        const etaList = data
            .filter(item => item.route === conf.route && item.dir === dirCode && item.eta)
            .slice(0, 2);

        const dirText = conf.dir === "outbound" ? "去程" : "回程";

        fullHtml += `<div class="route-group" style="margin-bottom: 8px; border-bottom: 1px dashed #3a3a3c; padding-bottom: 6px;">`;
        fullHtml += `<div style="font-weight: bold; color: #fff; font-size: 14px;">🚌 ${conf.route} [${dirText}] (${conf.stopName})</div>`;

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

function saveAndFetchKmb() {
    for (let i = 0; i < 3; i++) {
        const route = document.getElementById(`kmb-route-${i + 1}`).value.trim().toUpperCase();
        const stopName = document.getElementById(`kmb-stop-${i + 1}`).value.trim();
        const dir = document.getElementById(`kmb-dir-${i + 1}`).value;

        kmbConfigs[i] = { route, stopName, dir, stopId: null };
    }

    initAndFetchAllKmb();
}

setInterval(() => {
    fetchAllKmbETA();
}, 30000);
