let kmbRoute =
    localStorage.getItem("kmb_route") || "E31";

let kmbStopName =
    localStorage.getItem("kmb_stop_name") || "東涌纜車站";

// 初始化
document.addEventListener("DOMContentLoaded", () => {

    const routeInput =
        document.getElementById("kmb-route");

    const stopInput =
        document.getElementById("kmb-stop-name");

    if (routeInput)
        routeInput.value = kmbRoute;

    if (stopInput)
        stopInput.value = kmbStopName;

    fetchKmbETA();

});

// 取得 ETA
async function fetchKmbETA() {

    const container =
        document.getElementById("kmb");

    if (!container)
        return;

    container.innerHTML = "搜尋車站中...";

    try {

        // 取得所有 KMB 車站

        const stopRes =
            await fetch(
                "https://data.etabus.gov.hk/v1/transport/kmb/stop"
            );

        const stopData =
            await stopRes.json();

        const input =
            kmbStopName.trim();

        let targetStop = null;

        // 站名搜尋

        const matched =
            stopData.data.find(
                stop =>
                    stop.name_tc &&
                    stop.name_tc.includes(input)
            );

        if (matched) {
            targetStop = matched.stop;
        }

        if (!targetStop) {

            container.innerHTML =
                "❌ 找不到車站";

            return;
        }

        // ETA

        const etaRes =
            await fetch(
                `https://data.etabus.gov.hk/v1/transport/kmb/eta/${targetStop}/${kmbRoute}/1`
            );

        const etaData =
            await etaRes.json();

        if (
            !etaData.data ||
            etaData.data.length === 0
        ) {

            container.innerHTML =
                "現時無到站班次";

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

        etaList.forEach(item => {

            const diffMinutes =
                Math.round(
                    (new Date(item.eta) - new Date())
                    / 60000
                );

            let etaText =
                diffMinutes <= 0
                ? "即將到站"
                : `${diffMinutes} 分鐘`;

            let colorClass =
                "eta-green";

            if (diffMinutes <= 2) {

                colorClass =
                    "eta-red";

            }
            else if (diffMinutes <= 5) {

                colorClass =
                    "eta-orange";

            }

            html += `
                <div class="eta-item">

                    <span class="route">
                        ${item.route}
                    </span>

                    <span class="${colorClass}">
                        ${etaText}
                    </span>

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

// 更新按鈕

function saveAndFetchKmb() {

    kmbRoute =
        document
            .getElementById("kmb-route")
            .value
            .trim()
            .toUpperCase();

    kmbStopName =
        document
            .getElementById("kmb-stop-name")
            .value
            .trim();

    localStorage.setItem(
        "kmb_route",
        kmbRoute
    );

    localStorage.setItem(
        "kmb_stop_name",
        kmbStopName
    );

    fetchKmbETA();

}

// 每30秒更新

setInterval(
    fetchKmbETA,
    30000
);
