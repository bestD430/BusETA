// =====================================
// 城巴 ETA Widget V10
// 支援：
// 1. 三條路線
// 2. 站名模糊搜尋
// 3. 去程 / 回程
// 4. 30秒自動更新
// =====================================
 
let citybusConfigs = JSON.parse(
localStorage.getItem("citybus_configs")
) || [
{ route: "E21A", stopName: "雍逸樓", dir: "outbound" },
{ route: "E21B", stopName: "雍逸樓", dir: "outbound" },
{ route: "S52", stopName: "逸東邨", dir: "outbound" }
];
 
document.addEventListener("DOMContentLoaded", () => {
 
console.log("CITYBUS V10 Loaded");
 
for (let i = 0; i < 3; i++) {
 
const conf =
citybusConfigs[i] || {
route: "",
stopName: "",
dir: "outbound"
};
 
const routeEl =
document.getElementById(
`citybus-route-${i + 1}`
);
 
const stopEl =
document.getElementById(
`citybus-stop-${i + 1}`
);
 
const dirEl =
document.getElementById(
`citybus-dir-${i + 1}`
);
 
if (routeEl)
routeEl.value = conf.route;
 
if (stopEl)
stopEl.value = conf.stopName;
 
if (dirEl)
dirEl.value = conf.dir;
}
 
fetchAllCitybusETA();
 
});
 
// =====================================
// 查詢所有路線
// =====================================
 
async function fetchAllCitybusETA() {
 
const container =
document.getElementById("citybus");
 
if (!container)
return;
 
container.innerHTML = "載入中...";
 
const results = await Promise.all(
 
citybusConfigs
.filter(
c => c.route && c.route.trim()
)
.map(
conf => fetchSingleCitybus(conf)
)
 
);
 
const html =
results
.filter(Boolean)
.join("");
 
container.innerHTML =
html || "目前沒有到站資料";
}
 
// =====================================
// 單一路線
// =====================================
 
async function fetchSingleCitybus(conf) {
 
try {
 
const route =
conf.route.trim().toUpperCase();
 
const stopKeyword =
conf.stopName.trim();
 
const bound =
conf.dir === "inbound"
? "inbound"
: "outbound";
 
const dirChar =
conf.dir === "inbound"
? "I"
: "O";
 
// 取得該路線車站
 
const routeStopsRes =
await fetch(
`https://data.etabus.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB/${route}/${bound}`
);
 
const routeStopsData =
await routeStopsRes.json();
 
if (
!routeStopsData.data ||
routeStopsData.data.length === 0
) {
 
return "";
}
 
let targetStopId = null;
let matchedStopName = "";
 
// 平行查詢所有站資料
 
const stopPromises =
routeStopsData.data.map(async item => {
 
try {
 
const stopRes =
await fetch(
`https://data.etabus.gov.hk/v1/transport/citybus-nwfb/stop/${item.stop}`
);
 
const stopData =
await stopRes.json();
 
if (
stopData.data &&
stopData.data.name_tc
) {
 
return {
stopId: item.stop,
stopName:
stopData.data.name_tc
};
}
 
} catch (e) {}
 
return null;
 
});
 
const stopResults =
(await Promise.all(stopPromises))
.filter(Boolean);
 
const exactMatch =
stopResults.find(
s =>
s.stopName.trim() ===
stopKeyword
);
 
if (exactMatch) {
 
targetStopId =
exactMatch.stopId;
 
matchedStopName =
exactMatch.stopName;
 
} else {
 
const fuzzyMatch =
stopResults.find(
s =>
s.stopName.includes(
stopKeyword
)
);
 
if (fuzzyMatch) {
 
targetStopId =
fuzzyMatch.stopId;
 
matchedStopName =
fuzzyMatch.stopName;
}
}
 
if (!targetStopId) {
 
return `
<div class="route-group">
 
<div class="route-header">
<span class="route-no">
${route}
</span>
</div>
 
<div class="next-eta-item">
找不到車站：
${stopKeyword}
</div>
 
</div>
`;
}
 
// ETA
 
const etaRes =
await fetch(
`https://data.etabus.gov.hk/v1/transport/citybus-nwfb/eta/CTB/${targetStopId}/${route}`
);
 
const etaData =
await etaRes.json();
 
if (
!etaData.data ||
etaData.data.length === 0
) {
 
return "";
}
 
const validEta =
 
etaData.data
 
.filter(
item =>
item.dir === dirChar &&
item.eta
)
 
.map(item => {
 
const mins =
Math.max(
0,
Math.round(
(
new Date(item.eta)
-
new Date()
) / 60000
)
);
 
return {
mins,
dest:
item.dest_tc || ""
};
 
})
 
.sort(
(a, b) =>
a.mins - b.mins
)
 
.slice(0, 2);
 
if (
validEta.length === 0
) {
 
return "";
}
 
const logoUrl =
"https://upload.wikimedia.org/wikipedia/commons/e/e0/Citybus_logo.svg";
 
let html = `
 
<div class="route-group">
 
<div class="route-header">
 
${logoUrl}
 
<span class="route-no">
${route}
</span>
 
<span class="route-stop">
(${matchedStopName})
</span>
 
</div>
`;
 
validEta.forEach(
(item, index) => {
 
const etaText =
item.mins <= 0
? "即將到站"
: `${item.mins} 分鐘`;
 
let colorClass =
"eta-green";
 
if (item.mins <= 2) {
 
colorClass =
"eta-red";
 
} else if (
item.mins <= 5
) {
 
colorClass =
"eta-orange";
}
 
if (index === 0) {
 
html += `
<div class="first-eta-item">
 
<span class="first-eta-dest">
${item.dest}
</span>
 
<span class="first-eta-time ${colorClass}">
${etaText}
</span>
 
</div>
`;
} else {
 
html += `
<div class="next-eta-item">
 
<span>
下班車
</span>
 
<span>
${etaText}
</span>
 
</div>
`;
}
}
);
 
html += `</div>`;
 
return html;
 
}
catch (e) {
 
console.error(
"Citybus Error",
conf.route,
e
);
 
return "";
}
}
 
// =====================================
// 儲存設定
// =====================================
 
function saveAndFetchCitybus() {
 
for (let i = 0; i < 3; i++) {
 
const route =
document
.getElementById(
`citybus-route-${i + 1}`
)
?.value
.trim()
.toUpperCase() || "";
 
const stopName =
document
.getElementById(
`citybus-stop-${i + 1}`
)
?.value
.trim() || "";
 
const dir =
document
.getElementById(
`citybus-dir-${i + 1}`
)
?.value ||
"outbound";
 
citybusConfigs[i] = {
route,
stopName,
dir
};
}
 
localStorage.setItem(
"citybus_configs",
JSON.stringify(
citybusConfigs
)
);
 
if (
typeof toggleSettings
=== "function"
) {
toggleSettings(
"citybus-settings"
);
}
 
fetchAllCitybusETA();
}
 
// =====================================
// 自動更新
// =====================================
 
setInterval(
fetchAllCitybusETA,
30000
);
