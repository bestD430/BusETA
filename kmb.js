let kmbRoute =
    localStorage.getItem("kmb_route") || "E31";

let kmbStopName =
    localStorage.getItem("kmb_stop_name") || "東涌纜車站";

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("kmb-route").value =
        kmbRoute;

    document.getElementById("kmb-stop-name").value =
        kmbStopName;

    fetchKmbETA();

});

async function fetchKmbETA() {

    const container =
        document.getElementById("kmb");

    container.innerHTML = "搜尋車站中...";

    try {

        const stopRes =
            await fetch(
                "https://data.etabus.gov.hk/v1/transport/kmb/stop"
            );

        const stopData =
            await stopRes.json();

        let targetStop = null;

        const input =
            kmbStopName.trim();

        // 支援 TC413

        if (/^[A-Z]{2}[0-9]{3}$/i.test(input)) {

            const matched =
                stopData.data.find(
                    stop =>
                        stop.stop.toUpperCase() ===
                        input.toUpperCase()
                );

            if (matched) {
                targetStop = matched.stop;
            }

        } else {

            const matched =
                stopData.data.find(
                    stop =>
                        stop.name_tc &&
                        stop.name_tc.includes(input)
                );

            if (matched) {
                targetStop = matched.stop;
            }
        }

        if (!targetStop) {

            container.innerHTML =
                "❌ 找不到車站";

            return;

        }

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
                "沒有到站班次";

            return;
        }

        const etas =
            etaData.data
                .filter(item => item.eta)
                .slice(0, 3);

        if (etas.length === 0) {

            container.innerHTML =
                "暫無 ETA";

            return;

        }

        let html = "";

        etas.forEach(item => {

            const mins = Math.round(
                (new Date(item.eta) - new Date()) /
                60000
            );

            let etaText;

            if (mins <= 0) {

                etaText = "即將到站";

            } else {

                etaText =
                    `${mins} 分鐘`;

            }

            html += `
                <div class="eta-item">

                    <span class="route">
                        ${item.route}
                    </span>

                    <span class="eta">
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

setInterval(
    fetchKmbETA,
    30000
);
