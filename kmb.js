// =====================================
// 九巴 / 龍運 ETA Widget (完整版)
// =====================================

let kmbConfigs = JSON.parse(localStorage.getItem("kmb_configs")) || [
    { route: "E31", stopName: "雍逸樓", dir: "outbound", stopId: null },
    { route: "E36A", stopName: "雍逸東", dir: "outbound", stopId: null },
    { route: "N31", stopName: "雍逸樓", dir: "outbound", stopId: null }
];

let globalKmbStopsCache = null;

document.addEventListener("DOMContentLoaded", () => {
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
    container.innerHTML = "<div style='color:#aaa;'>尋找九巴車站中...</div>";

    const stopsMap = await fetchAllKmbStopsOnce();

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
        const serviceType = "1";
        const res = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route}/${dir}/${serviceType}`);
        if (!res.ok) return null;
        const d = await res.json();
        
        if (!d.data || d.data.length === 0) return null;

        for (const item of d.data) {
            const stopName = stopsMap.get(item.stop) || "";
            if (stopName.includes(keyword)) {
                return item.stop;
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
        container.innerHTML = "<div style='color:#aaa;'>請點擊「⚙️ 設定」輸入路線與站名</div>";
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
        const dirCode = conf.dir === "outbound" ? "O" : "I";
        const etaList = data
            .filter(item => item.route === conf.route && item.dir === dirCode && item.eta)
            .slice(0, 2);

        // 自動判斷龍運路線 (A/E/NA/S/R/N 開頭之龍運線) 與九巴路線之 Logo
        const isLwb = /^(E|A|NA|S|R)\d+/i.test(conf.route);
        const logoUrl = isLwb 
            ? "https://upload.wikimedia.org/wikipedia/commons/e/e0/Long_Win_Bus_Logo.svg"
            : "https://upload.wikimedia.org/wikipedia/commons/f/f6/KMB_Logo.svg";

        fullHtml += `<div class="route-group">`;
        fullHtml += `
            <div class="route-header">
                <img src="${logoUrl}" alt="logo" class="company-logo">
                <span class="route-no">${conf.route}</span>
                <span class="route-stop">(${conf.stopName})</span>
            </div>
        `;

        if (etaList.length === 0) {
            fullHtml += `<div style="font-size: 13px; color: #888; padding: 4px 0;">暫無到站班次</div>`;
        } else {
            etaList.forEach((item, index) => {
                const mins = Math.round((new Date(item.eta) - new Date()) / 60000);
                const etaText = mins <= 0 ? "即將到站" : `${mins} 分鐘`;

                let colorClass = "eta-green";
                if (mins <= 2) colorClass = "eta-red";
                else if (mins <= 5) colorClass = "eta-orange";

                const destText = item.dest_tc ? `往 ${item.dest_tc}` : "";

                if (index === 0) {
                    fullHtml += `
                        <div class="first-eta-item">
                            <span class="first-eta-dest">${destText}</span>
                            <span class="first-eta-time ${colorClass}">${etaText}</span>
                        </div>
                    `;
                } else {
                    fullHtml += `
                        <div class="next-eta-item">
                            <span>下班車：${destText}</span>
                            <span>${etaText}</span>
                        </div>
                    `;
                }
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

    if (typeof toggleSettings === "function") {
        toggleSettings("kmb-settings");
    }

    initAndFetchAllKmb();
}

setInterval(() => {
    fetchAllKmbETA();
}, 30000);
