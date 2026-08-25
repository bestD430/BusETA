// =====================================
// 港鐵巴士 ETA Widget (修復港鐵 API 比對)
// =====================================

let mtrbusConfigs = JSON.parse(localStorage.getItem("mtrbus_configs")) || [
    { route: "K51", stopName: "富泰", dir: "outbound" },
    { route: "K51A", stopName: "富泰", dir: "outbound" },
    { route: "", stopName: "", dir: "outbound" }
];

document.addEventListener("DOMContentLoaded", () => {
    for (let i = 0; i < 3; i++) {
        const conf = mtrbusConfigs[i] || { route: "", stopName: "富泰", dir: "outbound" };
        const routeEl = document.getElementById(`mtrbus-route-${i + 1}`);
        const stopEl = document.getElementById(`mtrbus-stop-${i + 1}`);
        const dirEl = document.getElementById(`mtrbus-dir-${i + 1}`);

        if (routeEl) routeEl.value = conf.route;
        if (stopEl) stopEl.value = conf.stopName;
        if (dirEl) dirEl.value = conf.dir || "outbound";
    }

    fetchAllMtrbusETA();
});

async function fetchAllMtrbusETA() {
    const container = document.getElementById("mtrbus");
    if (!container) return;

    let fullHtml = "";
    const activeConfigs = mtrbusConfigs.filter(c => c.route && c.route.trim() !== "");

    if (activeConfigs.length === 0) {
        container.innerHTML = "<div style='color:#888; padding: 10px 0;'>請點擊上方「⚙️ 設定」輸入路線</div>";
        return;
    }

    const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/a/ac/MTR_logo.svg";

    const promises = activeConfigs.map(conf =>
        fetch("https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                routeName: conf.route.trim().toUpperCase(),
                language: "zh"
            })
        })
        .then(res => res.json())
        .then(data => ({ conf, data }))
        .catch(err => {
            console.error(`港鐵巴士 ${conf.route} 載入失敗:`, err);
            return { conf, data: null };
        })
    );

    const results = await Promise.all(promises);

    results.forEach(({ conf, data }) => {
        let etaList = [];

        if (data && data.status === "1" && data.busStop && data.busStop.length > 0) {
            let targetStops = data.busStop;

            // 站名匹配：只要 API 站名包含設定的關鍵字（如「富泰」）即匹配
            if (conf.stopName && conf.stopName.trim() !== "") {
                const searchKey = conf.stopName.trim();
                const matched = data.busStop.filter(s => {
                    const name1 = s.busStopTitleName || "";
                    const name2 = s.busStopName || "";
                    return name1.includes(searchKey) || name2.includes(searchKey);
                });
                
                if (matched.length > 0) {
                    targetStops = matched;
                }
            }

            // 提取到站時間
            targetStops.forEach(stop => {
                if (stop.bus && Array.isArray(stop.bus)) {
                    stop.bus.forEach(b => {
                        let mins = null;

                        if (b.arrivalTimeInSecond !== undefined && b.arrivalTimeInSecond !== null) {
                            mins = Math.max(0, Math.floor(b.arrivalTimeInSecond / 60));
                        } else if (b.arrivalTimeText) {
                            const parts = b.arrivalTimeText.split(":");
                            if (parts.length === 2) {
                                const now = new Date();
                                const busTime = new Date();
                                busTime.setHours(parseInt(parts[0]), parseInt(parts[1]), 0);
                                mins = Math.max(0, Math.round((busTime - now) / 60000));
                            }
                        }

                        if (mins !== null && !isNaN(mins)) {
                            etaList.push({
                                mins: mins,
                                dest: b.busRemarks || b.departureTimeText || ""
                            });
                        }
                    });
                }
            });

            etaList.sort((a, b) => a.mins - b.mins);
            etaList = etaList.slice(0, 2);
        }

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

function saveAndFetchMtrbus() {
    for (let i = 0; i < 3; i++) {
        const routeEl = document.getElementById(`mtrbus-route-${i + 1}`);
        const stopEl = document.getElementById(`mtrbus-stop-${i + 1}`);
        const dirEl = document.getElementById(`mtrbus-dir-${i + 1}`);

        const route = routeEl ? routeEl.value.trim().toUpperCase() : "";
        const stopName = stopEl ? stopEl.value.trim() : "";
        const dir = dirEl ? dirEl.value : "outbound";

        mtrbusConfigs[i] = { route, stopName, dir };
    }

    localStorage.setItem("mtrbus_configs", JSON.stringify(mtrbusConfigs));

    if (typeof toggleSettings === "function") {
        toggleSettings("mtrbus-settings");
    }

    fetchAllMtrbusETA();
}

setInterval(() => {
    fetchAllMtrbusETA();
}, 30000);
