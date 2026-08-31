// 全局設定狀態
var currentConfig = {
  company: "KMB",
  route: "",
  bound: "",
  dest: "",
  stopId: "",
  stopName: ""
};

var timer = null;

window.onload = function() {
  bindEvents();
  loadSavedConfig();
};

function bindEvents() {
  document.getElementById("settings-btn").onclick = function() {
    document.getElementById("settings-modal").classList.remove("hidden");
  };
  document.getElementById("close-btn").onclick = function() {
    document.getElementById("settings-modal").classList.add("hidden");
  };

  document.getElementById("search-route-btn").onclick = fetchRouteBounds;
  document.getElementById("bound-select").onchange = fetchStops;
  document.getElementById("save-btn").onclick = saveSettings;
}

function httpGet(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          callback(null, data);
        } catch(e) {
          callback("JSON Error", null);
        }
      } else {
        callback("HTTP Error: " + xhr.status, null);
      }
    }
  };
  xhr.send();
}

// 1. 搜尋路線方向
function fetchRouteBounds() {
  var company = document.getElementById("company-select").value;
  var route = document.getElementById("route-input").value.trim().toUpperCase();
  var boundSelect = document.getElementById("bound-select");
  var stopSelect = document.getElementById("stop-select");

  if (!route) {
    alert("請輸入路線號碼！");
    return;
  }

  boundSelect.innerHTML = '<option value="">搜尋中...</option>';
  boundSelect.disabled = true;
  stopSelect.innerHTML = '<option value="">請先選擇方向</option>';
  stopSelect.disabled = true;

  if (company === "KMB" || company === "LWB") {
    var url = "https://data.etabus.gov.hk/v1/transport/kmb/route/" + route;
    httpGet(url, function(err, res) {
      boundSelect.innerHTML = '<option value="">請選擇方向</option>';
      if (err || !res.data || res.data.length === 0) {
        alert("找不到此路線，請確認路線號碼（如 1A, E33）！");
        return;
      }
      
      // 過濾重複方向
      var boundsAdded = {};
      for (var i = 0; i < res.data.length; i++) {
        var item = res.data[i];
        if (!boundsAdded[item.bound]) {
          boundsAdded[item.bound] = true;
          var opt = document.createElement("option");
          opt.value = item.bound; // "O" 或 "I"
          opt.innerText = "往 " + item.dest_tc;
          opt.setAttribute("data-dest", item.dest_tc);
          boundSelect.appendChild(opt);
        }
      }
      boundSelect.disabled = false;
    });
  } else if (company === "CTB") {
    // 城巴 API 處理
    var url = "https://rt.data.gov.hk/v2/transport/citybus/route/ctb/" + route;
    httpGet(url, function(err, res) {
      boundSelect.innerHTML = '<option value="">請選擇方向</option>';
      if (err || !res.data) {
        alert("找不到城巴路線！");
        return;
      }
      var item = res.data;
      var opt1 = document.createElement("option");
      opt1.value = "outbound";
      opt1.innerText = "往 " + item.dest_tc;
      opt1.setAttribute("data-dest", item.dest_tc);
      boundSelect.appendChild(opt1);

      var opt2 = document.createElement("option");
      opt2.value = "inbound";
      opt2.innerText = "往 " + item.orig_tc;
      opt2.setAttribute("data-dest", item.orig_tc);
      boundSelect.appendChild(opt2);

      boundSelect.disabled = false;
    });
  } else {
    alert("大嶼山巴士 (NLB) 及港鐵巴士 (MTR) 的官方 API 無開放路線列表查詢，請優先選擇九巴/龍運/城巴。");
  }
}

// 2. 獲取車站清單（優化非同步效能）
function fetchStops() {
  var company = document.getElementById("company-select").value;
  var route = document.getElementById("route-input").value.trim().toUpperCase();
  var boundSelect = document.getElementById("bound-select");
  var bound = boundSelect.value;
  var stopSelect = document.getElementById("stop-select");

  if (!bound) return;

  stopSelect.innerHTML = '<option value="">載入車站中...</option>';
  stopSelect.disabled = true;

  if (company === "KMB" || company === "LWB") {
    var boundParam = (bound === "O") ? "outbound" : "inbound";
    var url = "https://data.etabus.gov.hk/v1/transport/kmb/route-stop/" + route + "/" + boundParam + "/1";

    httpGet(url, function(err, res) {
      if (err || !res.data || res.data.length === 0) {
        alert("無法載入車站列表！");
        return;
      }

      var stops = res.data;
      stopSelect.innerHTML = '<option value="">請選擇車站</option>';
      
      // 一次性獲取全部車站名稱
      httpGet("https://data.etabus.gov.hk/v1/transport/kmb/stop", function(sErr, sRes) {
        var stopMap = {};
        if (!sErr && sRes.data) {
          for (var j = 0; j < sRes.data.length; j++) {
            stopMap[sRes.data[j].stop] = sRes.data[j].name_tc;
          }
        }
        for (var i = 0; i < stops.length; i++) {
          var stopId = stops[i].stop;
          var name = stopMap[stopId] || ("車站 " + (i + 1));
          var opt = document.createElement("option");
          opt.value = stopId;
          opt.innerText = (i + 1) + ". " + name;
          stopSelect.appendChild(opt);
        }
        stopSelect.disabled = false;
      });
    });
  } else if (company === "CTB") {
    var url = "https://rt.data.gov.hk/v2/transport/citybus/route-stop/ctb/" + route + "/" + bound;
    httpGet(url, function(err, res) {
      if (err || !res.data) {
        alert("無法載入城巴車站！");
        return;
      }
      var stops = res.data;
      stopSelect.innerHTML = '<option value="">請選擇車站</option>';
      stops.forEach(function(item, idx) {
        var stopUrl = "https://rt.data.gov.hk/v2/transport/citybus/stop/" + item.stop;
        httpGet(stopUrl, function(sErr, sRes) {
          var name = (sRes && sRes.data) ? sRes.data.name_tc : item.stop;
          var opt = document.createElement("option");
          opt.value = item.stop;
          opt.innerText = (idx + 1) + ". " + name;
          stopSelect.appendChild(opt);
        });
      });
      stopSelect.disabled = false;
    });
  }
}

// 3. 儲存與預存
function saveSettings() {
  var company = document.getElementById("company-select").value;
  var route = document.getElementById("route-input").value.trim().toUpperCase();
  var boundSelect = document.getElementById("bound-select");
  var stopSelect = document.getElementById("stop-select");

  if (!stopSelect.value) {
    alert("請完整選擇路線、方向與車站！");
    return;
  }

  var selectedBoundOpt = boundSelect.options[boundSelect.selectedIndex];
  var selectedStopOpt = stopSelect.options[stopSelect.selectedIndex];

  currentConfig = {
    company: company,
    route: route,
    bound: boundSelect.value,
    dest: selectedBoundOpt.getAttribute("data-dest"),
    stopId: stopSelect.value,
    stopName: selectedStopOpt.innerText
  };

  localStorage.setItem("bus_config", JSON.stringify(currentConfig));
  document.getElementById("settings-modal").classList.add("hidden");
  applyAndStartETA();
}

function loadSavedConfig() {
  var saved = localStorage.getItem("bus_config");
  if (saved) {
    try {
      currentConfig = JSON.parse(saved);
      applyAndStartETA();
    } catch(e) {}
  }
}

// 4. 更新 UI 與到站時間
function applyAndStartETA() {
  document.getElementById("display-route").innerText = currentConfig.route;
  document.getElementById("display-dest").innerText = "往 " + currentConfig.dest;
  document.getElementById("display-stop").innerText = "📍 " + currentConfig.stopName;

  if (timer) clearInterval(timer);
  fetchETA();
  timer = setInterval(fetchETA, 30000);
}

function fetchETA() {
  if (!currentConfig.stopId) return;

  var url = "";
  if (currentConfig.company === "KMB" || currentConfig.company === "LWB") {
    url = "https://data.etabus.gov.hk/v1/transport/kmb/eta/" + currentConfig.stopId + "/" + currentConfig.route + "/1";
  } else if (currentConfig.company === "CTB") {
    url = "https://rt.data.gov.hk/v2/transport/citybus/eta/ctb/" + currentConfig.stopId + "/" + currentConfig.route;
  }

  httpGet(url, function(err, res) {
    if (err || !res.data) return;

    var validEtas = [];
    for (var i = 0; i < res.data.length; i++) {
      var item = res.data[i];
      // 依據公司過濾方向
      if (item.eta && ((item.dir === currentConfig.bound) || (item.dir === (currentConfig.bound === "outbound" ? "O" : "I")))) {
        validEtas.push(item);
      }
    }
    updateUI(validEtas);
  });
}

function updateUI(etaList) {
  for (var i = 0; i < 3; i++) {
    var elem = document.getElementById("eta" + (i + 1));
    if (etaList[i] && etaList[i].eta) {
      elem.innerText = calculateMinutes(etaList[i].eta);
    } else {
      elem.innerText = "--";
    }
  }

  var now = new Date();
  document.getElementById("update-time").innerText = 
    "最後更新: " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
}

function calculateMinutes(etaTime) {
  var eta = new Date(etaTime);
  var now = new Date();
  var diffMins = Math.round((eta - now) / 60000);

  if (diffMins <= 0) return "即將到站";
  return diffMins + " 分鐘";
}

function pad(n) { return n < 10 ? "0" + n : n; }
