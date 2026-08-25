// =====================================
// 城巴 ETA Widget (完整版)
// =====================================

let citybusConfigs = JSON.parse(localStorage.getItem("citybus_configs")) || [
    { route: "E21A", stopName: "雍逸樓", dir: "outbound", stopId: null },
    { route: "E21B", stopName: "雍逸樓", dir: "outbound", stopId: null },
    { route: "S52", stopName: "逸東邨總站", dir: "outbound", stopId: null }
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

    initAndFetchAllCitybus();
});

async function initAndFetchAllCitybus() {
    const container = document.getElementById("citybus");
    container.innerHTML = "<div style='color:#aaa;'>尋找城巴車站中...</div>";

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
        const res = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/${route}/${dir}`);
        if (!res.ok) return null;
        const d = await res.json();

        if (!d.data || d.data.length === 0) return null;

        const stopIds = d.data.map(s => s.stop);

        const stopPromises = stopIds.map(stopId =>
            fetch(`https://rt.data.gov.hk/v2/transport/citybus/stop/${stopId}`)
                .then(r => r.json())
                .catch(() => null)
        );

        const stopsDetails = await Promise.all(stopPromises);

        for (const detail of stopsDetails) {
            if (detail && detail.data && detail.data.name_tc && detail.data.name_tc.includes(keyword)) {
                return detail.data.stop;
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
        container.innerHTML = "<div style='color:#aaa;'>請點擊「⚙️ 設定」輸入路線與站名</div>";
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
        const dirCode = conf.dir === "outbound" ? "O" : "I";
        const etaList = data
            .filter(item => item.dir === dirCode && item.eta)
            .slice(0, 2);

        const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/c/c3/Citybus_Logo.svg";

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

function saveAndFetchCitybus() {
    for (let i = 0; i < 3; i++) {
        const route = document.getElementById(`citybus-route-${i + 1}`).value.trim().toUpperCase();
        const stopName = document.getElementById(`citybus-stop-${i + 1}`).value.trim();
        const dir = document.getElementById(`citybus-dir-${i + 1}`).value;

        citybusConfigs[i] = { route, stopName, dir, stopId: null };
    }

    if (typeof toggleSettings === "function") {
        toggleSettings("citybus-settings");
    }

    initAndFetchAllCitybus();
}

setInterval(() => {
    fetchAllCitybusETA();
}, 30000);
