// =====================================
// 城巴 ETA Widget V11
// 修正版
// =====================================
 
let citybusConfigs =
JSON.parse(localStorage.getItem("citybus_configs")) || [
{
route: "E21A",
stopName: "雍逸樓",
dir: "outbound",
stopId: null
},
{
route: "E21B",
stopName: "雍逸樓",
dir: "outbound",
stopId: null
},
{
route: "S52",
stopName: "逸東邨總站",
dir: "outbound",
stopId: null
}
];
 
document.addEventListener("DOMContentLoaded", () => {
console.log("CITYBUS JS LOADED");
 
for (let i = 0; i < 3; i++) {
const conf =
citybusConfigs[i] || {
route: "",
stopName: "",
dir: "outbound"
};
 
const routeEl = document.getElementById(
`citybus-route-${i + 1}`
);
const stopEl = document.getElementById(
`citybus-stop-${i + 1}`
);
const dirEl = document.getElementById(
`citybus-dir-${i + 1}`
);
 
if (routeEl) routeEl.value = conf.route;
if (stopEl) stopEl.value = conf.stopName;
if (dirEl) dirEl.value = conf.dir;
}
 
initAndFetchAllCitybus();
});
 
async function initAndFetchAllCitybus() {
const container = document.getElementById("citybus");
 
if (!container) return;
 
container.innerHTML =
"<div style='color:#888;'>尋找城巴車站中...</div>";
 
for (let i = 0; i < citybusConfigs.length; i++) {
const conf = citybusConfigs[i];
 
if (conf.route && conf.stopName) {
conf.stopId = await findCitybusStopId(
conf.route,
conf.stopName,
conf.dir
);
} else {
conf.stopId = null;
}
}
 
localStorage.setItem(
"citybus_configs",
JSON.stringify(citybusConfigs)
);
 
fetchAllCitybusETA();
}
 
async function findCitybusStopId(
route,
keyword,
dir
) {
try {
console.log(
`搜尋車站: ${route} / ${keyword}`
);
 
const routeRes = await fetch(
`https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/${route}/${dir}`
);
 
if (!routeRes.ok) {
console.error("route-stop API失敗");
return null;
}
 
const routeData = await routeRes.json();
 
if (
!routeData.data ||
routeData.data.length === 0
) {
return null;
}
 
const stopIds = routeData.data.map(
item => item.stop
);
 
const stopDetails = await Promise.all(
stopIds.map(id =>
fetch(
`https://rt.data.gov.hk/v2/transport/citybus/stop/${id}`
)
.then(r => r.json())
.catch(() => null)
)
);
 
for (let i = 0; i < stopDetails.length; i++) {
const detail = stopDetails[i];
 
const stopName =
detail?.data?.name_tc || "";
 
if (stopName.includes(keyword)) {
console.log(
`${route} 找到車站`,
stopName,
stopIds[i]
);
 
return stopIds[i];
}
}
 
console.warn(
`${route} 找不到車站: ${keyword}`
);
 
return null;
} catch (e) {
console.error(
`尋找 ${route} 車站失敗`,
e
);
return null;
}
}
 
async function fetchAllCitybusETA() {
const container =
document.getElementById("citybus");
 
if (!container) return;
 
let fullHtml = "";
 
const activeConfigs =
citybusConfigs.filter(
c => c.route && c.stopId
);
 
if (activeConfigs.length === 0) {
container.innerHTML =
"<div style='color:#888;'>請設定路線及站名</div>";
return;
}
 
const results = await Promise.all(
activeConfigs.map(async conf => {
try {
const res = await fetch(
`https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/${conf.stopId}/${conf.route}`
);
 
const json = await res.json();
 
console.log(
conf.route,
conf.stopId,
json.data
);
 
return {
conf,
data: json.data || []
};
} catch (e) {
console.error(
"ETA取得失敗",
conf.route,
e
);
 
return {
conf,
data: []
};
}
})
);
 
results.forEach(({ conf, data }) => {
const etaList = data
.filter(item => item.eta)
.slice(0, 3);
 
fullHtml += `
<div class="route-group">
<div class="route-header">
<span class="route-no">${conf.route}</span>
<span class="route-stop">
(${conf.stopName})
</span>
</div>
`;
 
if (etaList.length === 0) {
fullHtml += `
<div class="next-eta-item">
暫無到站資料
</div>
`;
} else {
etaList.forEach((item, idx) => {
const mins = Math.max(
0,
Math.round(
(new Date(item.eta) - new Date()) /
60000
)
);
 
const etaText =
mins <= 0
? "即將到站"
: `${mins} 分鐘`;
 
let colorClass = "eta-green";
 
if (mins <= 2) {
colorClass = "eta-red";
} else if (mins <= 5) {
colorClass = "eta-orange";
}
 
const dest =
item.dest_tc || "";
 
if (idx === 0) {
fullHtml += `
<div class="first-eta-item">
<span class="first-eta-dest">
${dest}
</span>
<span class="first-eta-time ${colorClass}">
${etaText}
</span>
</div>
`;
} else {
fullHtml += `
<div class="next-eta-item">
<span>下班車 ${idx + 1}</span>
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
const route =
document
.getElementById(
`citybus-route-${i + 1}`
)
?.value.trim()
.toUpperCase() || "";
 
const stopName =
document.getElementById(
`citybus-stop-${i + 1}`
)?.value.trim() || "";
 
const dir =
document.getElementById(
`citybus-dir-${i + 1}`
)?.value || "outbound";
 
citybusConfigs[i] = {
route,
stopName,
dir,
stopId: null
};
}
 
localStorage.setItem(
"citybus_configs",
JSON.stringify(citybusConfigs)
);
 
if (typeof toggleSettings === "function") {
toggleSettings("citybus-settings");
}
 
initAndFetchAllCitybus();
}
 
setInterval(() => {
fetchAllCitybusETA();
}, 30000);
