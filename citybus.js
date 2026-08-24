// =====================================
// Citybus ETA Widget (支援行車方向選單)
// =====================================

// 預設 3 組城巴路線、站名與方向 (outbound / inbound)
let citybusConfigs = JSON.parse(localStorage.getItem("citybus_configs")) || [
    { route: "E21A", stopName: "雍逸樓", dir: "outbound", stopId: null },
    { route: "E21B", stopName: "雍逸樓", dir: "outbound", stopId: null },
    { route: "S52", stopName: "逸東邨總站", dir: "outbound", stopId: null }
];

document.addEventListener("DOMContentLoaded", () => {
    // 填入儲存的設定值到輸入框與選單
    for (let i = 0; i < 3; i++) {
        const conf = citybusConfigs[i] || { route: "", stopName: "", dir: "outbound" };
        const routeEl = document.getElementById(`citybus-route-${i + 1}`);
        const stopEl = document.getElementById(`citybus-stop-${i + 1}`);
        const dirEl = document.getElementById(`citybus-dir-${i + 1}`);

        if (routeEl) routeEl.value = conf.route;
        if (stopEl) stopEl.value = conf.stopName;
        if (dirEl) dirEl.value = conf.dir || "outbound";
    }

    initAndFetchAllCitybus();
});

async function initAndFetchAllCitybus() {
    const container = document.getElementById("citybus");
    container.innerHTML = "尋找城巴車站中...";

    for (let i = 0; i < citybusConfigs.length; i++) {
        const conf = citybusConfigs[i];
        if (conf.route && conf.stopName) {
            conf.stopId = await findCitybusStopId(conf.route, conf.stopName, conf.dir);
        } else {
            conf.stopId = null;
        }
    }

    localStorage.setItem("citybus_configs", JSON.stringify(citybusConfigs));
    fetchAllCitybusETA();
}

async function findCitybusStopId(route, keyword, dir) {
    try {
        // 只抓取指定方向 (outbound / inbound) 的站單
        const res = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/${route}/${dir}`);
        if (!res.ok) return null;
        const d = await res.json();

        if (!d.data || d.data.length === 0) return null;

        const stopIds = d.data.map(s => s.stop);

        // 平行發送請求查詢站名
        const stopPromises = stopIds.map(stopId =>
            fetch(`https://rt.data.gov.hk/v2/transport/citybus/stop/${stopId}`)
                .then(r => r.json())
                .catch(() => null)
        );

        const stopsDetails = await Promise.all(stopPromises);

        for (const detail of stopsDetails) {
            if (detail && detail.data && detail.data.name_tc && detail.data.name_tc.includes(keyword)) {
                return detail.data.stop; // 回傳匹配該方向的車站 ID
            }
        }
    } catch (e) {
        console.error(`尋找城巴 ${route} (${dir}) 車站失敗:`, e);
    }
    return null;
}

async function fetchAllCitybusETA() {
    const container = document.getElementById("citybus");
    let fullHtml = "";

    const activeConfigs = citybusConfigs.filter(c => c.route && c.stopId);

    if (activeConfigs.length === 0) {
        container.innerHTML = "<div style='color:#aaa;'>請檢查城巴路線與站名</div>";
        return;
    }

    const promises = activeConfigs.map(conf =>
        fetch(`https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/${conf.stopId}/${conf.route}`)
            .then(res => res.json())
            .then(data => ({ conf, data: data.data || [] }))
            .catch(() => ({ conf, data: [] }))
    );

    const results = await Promise.all(promises);

    results.forEach(({ conf, data }) => {
        // 城巴 dir 代碼 (outbound -> O / inbound -> I)
        const dirCode = conf.dir === "outbound" ? "O" : "I";
        const etaList = data
            .filter(item => item.dir === dirCode && item.eta)
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

function saveAndFetchCitybus() {
    for (let i = 0; i < 3; i++) {
        const route = document.getElementById(`citybus-route-${i + 1}`).value.trim().toUpperCase();
        const stopName = document.getElementById(`citybus-stop-${i + 1}`).value.trim();
        const dir = document.getElementById(`citybus-dir-${i + 1}`).value;

        citybusConfigs[i] = { route, stopName, dir, stopId: null };
    }

    initAndFetchAllCitybus();
}

setInterval(() => {
    fetchAllCitybusETA();
}, 30000);
