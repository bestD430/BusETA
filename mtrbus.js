// =====================================
// 港鐵巴士 ETA Widget V10
// =====================================
 
let mtrbusConfigs = JSON.parse(
localStorage.getItem("mtrbus_configs")
) || [
{
route: "K51",
stopName: "富泰",
dir: "outbound"
},
{
route: "K51A",
stopName: "富泰",
dir: "outbound"
},
{
route: "K52",
stopName: "屯門站",
dir: "outbound"
}
];
 
document.addEventListener("DOMContentLoaded", () => {
 
console.log("MTRBUS V10 Loaded");
 
for (let i = 0; i < 3; i++) {
 
const conf =
mtrbusConfigs[i] || {
route: "",
stopName: "",
dir: "outbound"
};
 
const routeEl =
document.getElementById(
`mtrbus-route-${i + 1}`
);
 
const stopEl =
document.getElementById(
`mtrbus-stop-${i + 1}`
);
 
const dirEl =
document.getElementById(
`mtrbus-dir-${i + 1}`
);
 
if (routeEl)
routeEl.value = conf.route;
 
if (stopEl)
stopEl.value = conf.stopName;
 
if (dirEl)
dirEl.value = conf.dir;
}
 
fetchAllMtrbusETA();
 
});
 
 
// =====================================
// 查詢全部路線
// =====================================
 
async function fetchAllMtrbusETA() {
 
const container =
document.getElementById("mtrbus");
 
if (!container)
return;
 
container.innerHTML = "載入中...";
 
const results = await Promise.all(
 
mtrbusConfigs
.filter(
c => c.route && c.route.trim()
)
.map(
conf => fetchSingleMtrbus(conf)
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
// 查詢單一路線
// =====================================
 
async function fetchSingleMtrbus(conf) {
 
try {
 
const route =
conf.route.trim().toUpperCase();
 
const stopKeyword =
conf.stopName.trim();
 
const res =
await fetch(
"https://rt.data.gov.hk/v1/transport/mtr/bus/getSchedule",
{
method: "POST",
headers: {
"Content-Type":
"application/json"
},
body: JSON.stringify({
routeName: route,
language: "zh"
})
}
);
 
const data =
await res.json();
 
if (
!data ||
data.status !== "1" ||
!data.busStop ||
data.busStop.length === 0
) {
 
return "";
}
 
let targetStop = null;
 
// 完全匹配優先
 
const exactMatch =
data.busStop.find(s => {
 
const name1 =
s.busStopTitleName || "";
 
const name2 =
s.busStopName || "";
 
return (
name1.trim() === stopKeyword ||
name2.trim() === stopKeyword
);
 
});
 
if (exactMatch) {
 
targetStop =
exactMatch;
 
}
else {
 
// 模糊匹配
 
const fuzzyMatch =
data.busStop.find(s => {
 
const name1 =
s.busStopTitleName || "";
 
const name2 =
s.busStopName || "";
 
return (
name1.includes(stopKeyword) ||
name2.includes(stopKeyword)
);
 
});
 
if (fuzzyMatch) {
 
targetStop =
fuzzyMatch;
 
}
 
}
 
if (!targetStop) {
 
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
 
let matchedStopName =
targetStop.busStopTitleName ||
targetStop.busStopName ||
stopKeyword;
 
const rawEtas = [];
 
if (
targetStop.bus &&
Array.isArray(targetStop.bus)
) {
 
const now =
new Date();
 
targetStop.bus.forEach(bus => {
 
let mins = null;
 
if (
bus.arrivalTimeInSecond !==
undefined &&
bus.arrivalTimeInSecond !==
null
) {
 
mins =
Math.max(
0,
Math.floor(
bus.arrivalTimeInSecond /
60
)
);
}
else if (
bus.arrivalTimeText
) {
 
const parts =
bus.arrivalTimeText
.split(":");
 
if (
parts.length === 2
) {
 
const etaTime =
new Date();
 
etaTime.setHours(
parseInt(parts[0]),
parseInt(parts[1]),
0
);
 
mins =
Math.max(
0,
Math.round(
(
etaTime -
now
) / 60000
)
);
}
}
 
if (
mins !== null &&
!isNaN(mins)
) {
 
rawEtas.push({
 
mins,
 
dest:
bus.busRemark ||
bus.busRemarks ||
""
 
});
 
}
 
});
 
}
 
const etaList =
rawEtas
.sort(
(a, b) =>
a.mins - b.mins
)
.slice(0, 2);
 
if (
etaList.length === 0
) {
 
return "";
}
 
const logoUrl =
"https://upload.wikimedia.org/wikipedia/commons/a/ac/MTR_logo.svg";
 
let html = `
 
<div class="route-group">
 
<div class="route-header">
 
}"
alt="MTR"
class="company-logo">
 
<span class="route-no">
${route}
</span>
 
<span class="route-stop">
(${matchedStopName})
</span>
 
</div>
`;
 
etaList.forEach(
(item, index) => {
 
const etaText =
item.mins <= 0
? "即將到站"
: `${item.mins} 分鐘`;
 
let colorClass =
"eta-green";
 
if (
item.mins <= 2
) {
 
colorClass =
"eta-red";
 
}
else if (
item.mins <= 5
) {
 
colorClass =
"eta-orange";
 
}
 
if (
index === 0
) {
 
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
 
}
else {
 
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
"MTR Bus Error",
conf.route,
e
);
 
return "";
}
}
 
 
// =====================================
// 儲存設定
// =====================================
 
function saveAndFetchMtrbus() {
 
for (let i = 0; i < 3; i++) {
 
const route =
document
.getElementById(
`mtrbus-route-${i + 1}`
)
?.value
.trim()
.toUpperCase() || "";
 
const stopName =
document
.getElementById(
`mtrbus-stop-${i + 1}`
)
?.value
.trim() || "";
 
const dir =
document
.getElementById(
`mtrbus-dir-${i + 1}`
)
?.value ||
"outbound";
 
mtrbusConfigs[i] = {
route,
stopName,
dir
};
}
 
localStorage.setItem(
"mtrbus_configs",
JSON.stringify(
mtrbusConfigs
)
);
 
if (
typeof toggleSettings ===
"function"
) {
toggleSettings(
"mtrbus-settings"
);
}
 
fetchAllMtrbusETA();
}
 
 
// =====================================
// 自動更新
// =====================================
 
setInterval(
fetchAllMtrbusETA,
30000
);
