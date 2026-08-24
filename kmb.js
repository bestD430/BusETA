let kmbRoute =
    localStorage.getItem("kmb_route") || "E31";

let kmbStopName =
    localStorage.getItem("kmb_stop_name") || "東涌";

let selectedStopId = null;


// 初始化

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("kmb-route").value =
        kmbRoute;

    document.getElementById("kmb-stop-name").value =
        kmbStopName;

    searchStops();

});


// ===========================
// 搜尋車站
// ===========================

async function searchStops() {

    const keyword =
        document.getElementById("kmb-stop-name")
            .value
            .trim();

    kmbStopName = keyword;

    const resultContainer =
        document.getElementById(
            "kmb-stop-results"
        );

    if (!keyword) {

        resultContainer.innerHTML =
            "請輸入站名";

        return;
    }

    try {

        const response =
            await fetch(
                "https://data.etabus.gov.hk/v1/transport/kmb/stop"
            );

        const stopData =
            await response.json();

        const matches =
            stopData.data.filter(
                stop =>
                    stop.name_tc &&
                    stop.name_tc.includes(keyword)
            );

        if (matches.length === 0) {

            resultContainer.innerHTML =
                "找不到車站";

            return;
        }

        let html = `
        <div>

            <label>
            選擇車站：
            </label>

            <select id="kmb-stop-select">
        `;

        matches.forEach(stop => {

            html += `
            <option value="${stop.stop}">
                ${stop.name_tc}
            </option>
            `;

        });

        html += `
            </select>

            <button onclick="fetchSelectedStopETA()">
                查詢 ETA
            </button>

        </div>
        `;

        resultContainer.innerHTML =
            html;

    }
    catch (error) {

        console.error(error);

        resultContainer.innerHTML =
            "搜尋失敗";
    }
}


// ===========================
// 查詢選定車站 ETA
// ===========================

async function fetchSelectedStopETA() {

    const stopId =
        document.getElementById(
            "kmb-stop-select"
        ).value;

    selectedStopId = stopId;

    fetchKmbETA();

}


// ===========================
// 查詢 ETA
// ===========================

async function fetchKmbETA() {

    const container =
        document.getElementById("kmb");

    if (!selectedStopId) {

        container.innerHTML =
            "請先選擇車站";

        return;
    }

    container.innerHTML =
        "載入 ETA...";

    try {

        const response =
            await fetch(
                `https://data.etabus.gov.hk/v1/transport/kmb/eta/${selectedStopId}/${kmbRoute}/1`
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
                "暫無 ETA";

            return;
        }

        let html = "";

        etaList.forEach(item => {

            const mins =
                Math.round(
                    (new Date(item.eta) -
                     new Date()) / 60000
                );

            const etaText =
                mins <= 0
                ? "即將到站"
                : `${mins} 分鐘`;

            let colorClass =
                "eta-green";

            if (mins <= 2) {

                colorClass =
                    "eta-red";

            }
            else if (mins <= 5) {

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

        container.innerHTML =
            html;

    }
    catch (error) {

        console.error(error);

        container.innerHTML =
            "載入失敗";
    }
}


// ===========================
// 更新按鈕
// ===========================

function saveAndFetchKmb() {

    kmbRoute =
        document.getElementById(
            "kmb-route"
        ).value
        .trim()
        .toUpperCase();

    localStorage.setItem(
        "kmb_route",
        kmbRoute
    );

    searchStops();
}


// ===========================
// 30秒更新
// ===========================

setInterval(() => {

    if (selectedStopId) {

        fetchKmbETA();

    }

}, 30000);
`
