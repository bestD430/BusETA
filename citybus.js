// =====================================
// 城巴 ETA Widget (隱藏無班次路線版)
// =====================================

let citybusConfigs = JSON.parse(localStorage.getItem("citybus_configs")) || [
    { route: "E21A", stopName: "逸東邨雍逸樓", dir: "outbound" },
    { route: "E21B", stopName: "逸東邨雍逸樓", dir: "outbound" },
    { route: "S52", stopName: "逸東邨總站", dir: "outbound" }
];

document.addEventListener("DOMContentLoaded", () => {
    for (let i = 0; i < 3; i++) {
        const conf = citybusConfigs[i] || { route: "", stopName: "", dir: "outbound" };
        const routeEl = document.getElementById(`citybus-route-${i + 1}`);
        const stopEl = document.getElementById(`citybus-stop-${i + 1}`);
        const dirEl = document.getElementById(`citybus-dir-${i + 1}`);

        if (routeEl) routeEl.value = conf.route;
        if (stopEl) stopEl.value = conf.stopName;
        if (dirEl) dirEl.value = conf.dir || "outbound";
    }

    fetchAllCitybusETA();
});

async function fetchAllCitybusETA() {
    const container = document.getElementById("citybus");
    if (!container) return;

    let fullHtml = "";
    const activeConfigs = citybusConfigs.filter(c => c.route && c.route.trim() !== "");

    if (activeConfigs.length === 0) {
        container.innerHTML = "<div style='color:#888; padding: 10px 0;'>請點擊上方「⚙️ 設定」輸入路線</div>";
        return;
    }

    const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/e/e0/Citybus_logo.svg";

    const promises = activeConfigs.map(async (conf) => {
        try {
            const route = conf.route.trim().toUpperCase();
            const dir = conf.dir === "inbound" ? "I" : "O";

            // 1. 取得該路線的車站對照表
            const routeStopsRes = await fetch(`https://data.etabus.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB/${route}/${conf.dir === "inbound" ? "inbound" : "outbound"}`);
            const routeStopsData = await routeStopsRes.json();

            if (!routeStopsData.data || routeStopsData.data.length === 0) return { conf, etaList: [] };

            // 2. 尋找車站 ID
            let stopId = null;
            if (conf.stopName && conf.stopName.trim() !== "") {
                const keyword = conf.stopName.trim();
                for (const s of routeStopsData.data) {
                    const stopDetailRes = await fetch(`https://data.etabus.gov.hk/v1/transport/citybus-nwfb/stop/${s.stop}`);
                    const stopDetailData = await stopDetailRes.json();
                    if (stopDetailData.data && stopDetailData.data.name_tc && stopDetailData.data.name_tc.includes(keyword)) {
                        stopId = s.stop;
                        break;
                    }
                }
            }

            if (!stopId) stopId = routeStopsData.data[0].stop;

            // 3. 取得 ETA 到站時間
            const etaRes = await fetch(`https://data.etabus.gov.hk/v1/transport/citybus-nwfb/eta/CTB/${stopId}/${route}`);
            const etaData = await etaRes.json();

            if (!etaData.data) return { conf, etaList: [] };

            const now = new Date();
            const validEtas = etaData.data
                .filter(item => item.dir === dir && item.eta)
                .map(item => {
                    const etaTime = new Date(item.eta);
                    const mins = Math.max(0, Math.round((etaTime - now) / 60000));
                    return { mins, dest: item.dest_tc || "" };
                })
                .sort((a, b) => a.mins - b.mins)
                .slice(0, 2);

            return { conf, etaList: validEtas };
        } catch (e) {
            console.error(`城巴 ${conf.route} 載入失敗:`, e);
            return { conf, etaList: [] };
        }
    });

    const results = await Promise.all(promises);

    results.forEach(({ conf, etaList }) => {
        // 如果無班次，直接隱藏該路線
        if (etaList.length === 0) return;

        fullHtml += `<div class="route-group">`;
        fullHtml += `
            <div class="route-header">
                <img src="${logoUrl}" alt="logo" class="company-logo">
                <span class="route-no">${conf.route}</span>
                <span class="route-stop">(${conf.stopName || "所有車站"})</span>
            </div>
        `;

        etaList.forEach((item, index) => {
            const etaText = item.mins <= 0 ? "即將到站" : `${item.mins} 分鐘`;

            let colorClass = "eta-green";
            if (item.mins <= 2) colorClass = "eta-red";
            else if (item.mins <= 5) colorClass = "eta-orange";

            const destText = item.dest ? ` (${item.dest})` : "";

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

        fullHtml += `</div>`;
    });

    if (fullHtml === "") {
        fullHtml = `<div style="font-size: 13px; color: #888; padding: 10px 0;">目前所有設定路線均無班次</div>`;
    }

    container.innerHTML = fullHtml;
}

function saveAndFetchCitybus() {
    for (let i = 0; i < 3; i++) {
        const routeEl = document.getElementById(`citybus-route-${i + 1}`);
        const stopEl = document.getElementById(`citybus-stop-${i + 1}`);
        const dirEl = document.getElementById(`citybus-dir-${i + 1}`);

        const route = routeEl ? routeEl.value.trim().toUpperCase() : "";
        const stopName = stopEl ? stopEl.value.trim() : "";
        const dir = dirEl ? dirEl.value : "outbound";

        citybusConfigs[i] = { route, stopName, dir };
    }

    localStorage.setItem("citybus_configs", JSON.stringify(citybusConfigs));

    if (typeof toggleSettings === "function") {
        toggleSettings("citybus-settings");
    }

    fetchAllCitybusETA();
}

setInterval(() => {
    fetchAllCitybusETA();
}, 30000);
