// =====================================
// 港鐵巴士 ETA Widget (增強穩定版)
// =====================================

let mtrbusConfigs = JSON.parse(localStorage.getItem("mtrbus_configs")) || [
    { route: "K76", stopName: "天恒邨", dir: "outbound" },
    { route: "506", stopName: "屯門站", dir: "outbound" },
    { route: "K52", stopName: "屯門站", dir: "outbound" }
];

document.addEventListener("DOMContentLoaded", () => {
    for (let i = 0; i < 3; i++) {
        const conf = mtrbusConfigs[i] || { route: "", stopName: "", dir: "outbound" };
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
        container.innerHTML = "<div style='color:#aaa;'>請點擊「⚙️ 設定」輸入路線與站名</div>";
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
        fullHtml += `<div class="route-group">`;
        fullHtml += `
            <div class="route-header">
                <img src="${logoUrl}" alt="logo" class="company-logo">
                <span class="route-no">${conf.route}</span>
                <span class="route-stop">(${conf.stopName || "所有車站"})</span>
            </div>
        `;

        let etaList = [];

        if (data && data.status === "1" && data.busStop && data.busStop.length > 0) {
            let targetStops = data.busStop;

            // 1. 若有輸入站名，嘗試搜尋包含關鍵字的車站
            if (conf.stopName && conf.stopName.trim() !== "") {
                const keyword = conf.stopName.trim();
                const matched = data.busStop.filter(s => {
                    const name1 = s.busStopTitleName || "";
                    const name2 = s.busStopName || "";
                    return name1.includes(keyword) || name2.includes(keyword);
                });
                if (matched.length > 0) {
                    targetStops = matched;
                }
            }

            // 2. 提取班次時間
            targetStops.forEach(stop => {
                if (stop.bus && Array.isArray(stop.bus)) {
                    stop.bus.forEach(b => {
                        let mins = null;

                        // 判斷剩餘秒數或時間字串
                        if (b.arrivalTimeInSecond !== undefined && b.arrivalTimeInSecond !== null) {
                            mins = Math.max(0, Math.floor(b.arrivalTimeInSecond / 60));
                        } else if (b.arrivalTimeText) {
                            // 若無秒數，由時間文字解析
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

            // 按時間排序並取前兩班
            etaList.sort((a, b) => a.mins - b.mins);
            etaList = etaList.slice(0, 2);
        }

        if (etaList.length === 0) {
            fullHtml += `<div style="font-size: 13px; color: #888; padding: 4px 0;">暫無到站班次</div>`;
        } else {
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
        }
        fullHtml += `</div>`;
    });

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
