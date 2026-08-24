// =========================
// KMB ETA Widget
// 支援：站名 或 KMB Stop ID
// =========================

let kmbRoute =
    localStorage.getItem("kmb_route") || "E36A";

let kmbStopInput =
    localStorage.getItem("kmb_stop") || "TC413";

// 初始化
document.addEventListener("DOMContentLoaded", () => {

    const routeInput =
        document.getElementById("kmb-route");

    const stopInput =
        document.getElementById("kmb-stop");

    if (routeInput)
        routeInput.value = kmbRoute;

    if (stopInput)
        stopInput.value = kmbStopInput;

    fetchKmbETA();

});

// 判斷是否 KMB Stop ID
function isStopCode(value) {

    return /^[A-Z]{2}[0-9]{3}$/i.test(
        value.trim()
    );

}

// 站名轉 Stop ID
async function getStopId(input) {

    // 如果直接輸入 TC413
    if (isStopCode(input)) {
        return input.toUpperCase();
    }

    // 用站名搜尋
    const response = await fetch(
        "https://data.etabus.gov.hk/v1/transport/kmb/stop"
    );

    const data = await response.json();

    const matched = data.data.find(stop =>
        stop.name_tc &&
        stop.name_tc.includes(input)
    );

    return matched ? matched.stop : null;
}

// 取得 ETA
async function fetchKmbETA() {

    const container =
        document.getElementById("kmb");

    if (!container)
        return;

    container.innerHTML = "搜尋車站中...";

    try {

        const stopId =
            await getStopId(kmbStopInput);

        if (!stopId) {

            container.innerHTML =
                "❌ 找不到車站";

            return;
        }

        const response = await fetch(

            `https://data.etabus.gov.hk/v1/transport/kmb/eta/${stopId}/${kmbRoute}/1`

        );

        const etaData =
            await response.json();

        if (
            !etaData.data ||
            etaData.data.length === 0
        ) {

            container.innerHTML =
                "沒有到站班次";

            return;
        }

        const etaList =
            etaData.data
                .filter(item => item.eta)
                .slice(0, 3);

        if (etaList.length === 0) {

            container.innerHTML =
                "暫無 ETA 資料";

            return;
        }

        let html = "";

        etaList.forEach((item, index) => {

            const diffMinutes = Math.round(

                (new Date(item.eta) - new Date()) /
                60000

            );

            let etaText = "";

            if (diffMinutes <= 0) {

                etaText = "即將到站";

            } else {

                etaText =
                    `${diffMinutes} 分鐘`;

            }

            let colorClass = "eta-green";

            if (diffMinutes <= 2) {

                colorClass = "eta-red";

            } else if (diffMinutes <= 5) {

                colorClass = "eta-orange";

            }

            html += `

                <div class="eta-item">

                    <div class="route">
                        ${item.route}
                    </div>

                    <div class="${colorClass}">

                        ${etaText}

                    </div>

                </div>

            `;

        });

        container.innerHTML = html;

    }
    catch (error) {

        console.error(error);

        container.innerHTML =
            "❌ 載入失敗";

    }
}

// 按下更新
function saveAndFetchKmb() {

    kmbRoute =
        document
            .getElementById("kmb-route")
            .value
            .trim()
            .toUpperCase();

    kmbStopInput =
        document
            .getElementById("kmb-stop")
            .value
            .trim();

    localStorage.setItem(
        "kmb_route",
        kmbRoute
    );

    localStorage.setItem(
        "kmb_stop",
        kmbStopInput
    );

    fetchKmbETA();

}

// 每30秒更新
setInterval(
    fetchKmbETA,
    30000
);
