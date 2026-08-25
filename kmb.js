// =====================================
// 九巴 / 龍運 ETA Widget (隱藏無班次路線版)
// =====================================

let kmbConfigs = JSON.parse(localStorage.getItem("kmb_configs")) || [
    { route: "E31", stopName: "逸東邨雍逸樓", dir: "outbound" },
    { route: "E36A", stopName: "逸東邨雍逸樓", dir: "outbound" },
    { route: "N31", stopName: "逸東邨雍逸樓", dir: "outbound" }
];

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

    fetchAllKmbETA();
});

async function fetchAllKmbETA() {
    const container = document.getElementById("kmb");
    if (!container) return;

    let fullHtml = "";
    const activeConfigs = kmbConfigs.filter(c => c.route && c.route.trim() !== "");

    if (activeConfigs.length === 0) {
        container.innerHTML = "<div style='color:#888; padding: 10px 0;'>請點擊上方「⚙️ 設定」輸入路線</div>";
        return;
    }

    const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/2/2e/KMB_Logo.svg";

    const promises = activeConfigs.map(async (conf) => {
        try {
            const route = conf.route.trim().toUpperCase();
            const bound = conf.dir === "inbound" ? "inbound" : "outbound";
            
            // 取得該路線站名對照表
            const routeStopsRes = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route}/${bound}/1`);
            const routeStopsData = await routeStopsRes.json();
            
            if (!routeStopsData.data || routeStopsData.data.length === 0) return { conf, etaList: [] };

            // 尋找符合站名關鍵字的車站 ID
            let stopId = null;
            if (conf.stopName && conf.stopName.trim() !== "") {
                const keyword = conf.stopName.trim();
                const allStopsRes = await fetch("https://data.etabus.gov.hk/v1/transport/kmb/stop");
                const allStopsData = await allStopsRes.json();
                
                const matchedStops = allStopsData.data.filter(s => 
                    s.name_tc && s.name_tc.includes(keyword)
                ).map(s => s.stop);

                const found = routeStopsData.data.find(s => matchedStops.includes(s.stop));
                if (found) stopId = found.stop;
            }

            // 若找不到特定站名，預設取第一站
            if (!stopId) stopId = routeStopsData.data[0].stop;

            // 取得 ETA 到站時間
            const etaRes = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${stopId}/${route}`);
            const etaData = await etaRes.json();

            if (!etaData.data) return { conf, etaList: [] };

            const now = new Date();
            const validEtas = etaData.data
                .filter(item => item.eta)
                .map(item => {
                    const etaTime = new Date(item.eta);
                    const mins = Math.max(0, Math.round((etaTime - now) / 60000));
                    return { mins, dest: item.dest_tc || "" };
                })
                .sort((a, b) => a.mins - b.mins)
                .slice(0, 2);

            return { conf, etaList: validEtas };
        } catch (e) {
            console.error(`九巴 ${conf.route} 載入失敗:`, e);
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

function saveAndFetchKmb() {
    for (let i = 0; i < 3; i++) {
        const routeEl = document.getElementById(`kmb-route-${i + 1}`);
        const stopEl = document.getElementById(`kmb-stop-${i + 1}`);
        const dirEl = document.getElementById(`kmb-dir-${i + 1}`);

        const route = routeEl ? routeEl.value.trim().toUpperCase() : "";
        const stopName = stopEl ? stopEl.value.trim() : "";
        const dir = dirEl ? dirEl.value : "outbound";

        kmbConfigs[i] = { route, stopName, dir };
    }

    localStorage.setItem("kmb_configs", JSON.stringify(kmbConfigs));

    if (typeof toggleSettings === "function") {
        toggleSettings("kmb-settings");
    }

    fetchAllKmbETA();
}

setInterval(() => {
    fetchAllKmbETA();
}, 30000);
