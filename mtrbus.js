// =====================================
// 港鐵巴士 MTR Bus ETA Widget (修正版)
// =====================================

// 港鐵巴士常見路線與車站代碼對照表 (確保 API 正確獲取)
const MTRBUS_STOP_MAP = {
    "K51": { "富泰": "FUT", "屯門站": "TUM", "兆康": "SIH" },
    "K76": { "天恒": "THM", "天恒邨": "THM", "天水圍站": "TIS" },
    "506": { "屯門站": "TUM", "碼頭": "TMW", "兆麟": "SLL" },
    "K52": { "屯門站": "TUM", "龍鼓灘": "LKT" }
};

let mtrbusConfigs = JSON.parse(localStorage.getItem("mtrbus_configs")) || [
    { route: "K51", stopName: "富泰", dir: "outbound" },
    { route: "K76", stopName: "天恒邨", dir: "outbound" },
    { route: "506", stopName: "屯門站", dir: "outbound" }
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
        container.innerHTML = "<div style='color:#888; padding: 10px 0;'>請點擊上方「⚙️ 設定」輸入路線</div>";
        return;
    }

    const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/4/41/MTR_Bus_Logo.svg";

    const promises = activeConfigs.map(async (conf) => {
        try {
            const route = conf.route.trim().toUpperCase();
            const stopName = conf.stopName ? conf.stopName.trim() : "";
            
            // 查表獲取港鐵車站代碼，若無則嘗試預設代碼
            let stopCode = MTRBUS_STOP_MAP[route]?.[stopName] || "FUT"; 

            const res = await fetch("https://rt.mtr.com.hk/v1/transport/mtr/bus/getSchedule.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ language: "zh", routeName: route })
            });

            const data = await res.json();
            if (!data || data.status !== 1 || !data.busStop) return { conf, etaList: [] };

            // 尋找目標車站
            let targetStop = data.busStop.find(s => s.busStopId === stopCode || (stopName && s.busStopNameNameTC?.includes(stopName)));
            if (!targetStop) targetStop = data.busStop[0]; // fallback 第一站

            if (!targetStop || !targetStop.bus) return { conf, etaList: [] };

            const validEtas = targetStop.bus
                .map(b => {
                    const mins = parseInt(b.departureTimeInSecond / 60, 10);
                    return {
                        mins: isNaN(mins) ? 0 : Math.max(0, mins),
                        dest: b.busArrivalTimeText || ""
                    };
                })
                .slice(0, 2);

            return { conf, etaList: validEtas };
        } catch (e) {
            console.error(`港鐵巴士 ${conf.route} 載入失敗:`, e);
            return { conf, etaList: [] };
        }
    });

    const results = await Promise.all(promises);

    results.forEach(({ conf, etaList }) => {
        if (etaList.length === 0) return;

        fullHtml += `<div class="route-group">`;
        fullHtml += `
            <div class="route-header">
                <img src="${logoUrl}" alt="logo" class="company-logo" onerror="this.style.display='none'">
                <span class="route-no">${conf.route}</span>
                <span class="route-stop">(${conf.stopName || "車站"})</span>
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
