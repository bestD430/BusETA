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

// 初始化
window.onload = function() {
  bindEvents();
  loadSavedConfig();
};

function bindEvents() {
  var settingsBtn = document.getElementById("settings-btn");
  var closeBtn = document.getElementById("close-btn");
  var modal = document.getElementById("settings-modal");
  var searchBtn = document.getElementById("search-route-btn");
  var boundSelect = document.getElementById("bound-select");
  var saveBtn = document.getElementById("save-btn");

  settingsBtn.onclick = function() { modal.classList.remove("hidden"); };
  closeBtn.onclick = function() { modal.classList.add("hidden"); };

  searchBtn.onclick = fetchRouteBounds;
  boundSelect.onchange = fetchStops;
  saveBtn.onclick = saveSettings;
}

// 通用 AJAX 請求 (舊版 Safari 安全作法)
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
          callback(e, null);
        }
      } else {
        callback("Error: " + xhr.status, null);
      }
    }
  };
  xhr.send();
}

// 1. 依據路線搜尋方向/終點站
function fetchRouteBounds() {
  var company = document.getElementById("company-select").value;
  var route = document.getElementById("route-input").value.trim().toUpperCase();
  var boundSelect = document.getElementById("bound-select");
  
  if (!route) {
    alert("請先輸入路線號碼！");
    return;
  }

  boundSelect.innerHTML = '<option value="">載入中...</option>';
  boundSelect.disabled = true;

  // 專門處理九巴/龍運路線 API
  if (company === "KMB" || company === "LWB") {
    var url = "https://data.etabus.gov.hk/v1/transport/kmb/route/" + route;
    httpGet(url, function(err, res) {
      boundSelect.innerHTML = '<option value="">請選擇方向</option>';
      if (err || !res.data || res.data.length === 0) {
        alert("找不到此路線！");
        return;
      }
      for (var i = 0; i < res.data.length; i++) {
        var item = res.data[i];
        var opt = document.createElement("option");
        opt.value = item.bound; // "O" 或 "I"
        opt.innerText = "往 " + item.dest_tc;
        opt.setAttribute("data-dest", item.dest_tc);
        boundSelect.appendChild(opt);
      }
      boundSelect.disabled = false;
    });
  } else {
    // 其他巴士公司介面彈性擴充佔位 (城巴/大嶼山巴士)
    alert("目前完整開放九巴/龍運查詢，其他公司格式整合中！");
  }
}

// 2. 依據選擇的方向獲取車站清單
function fetchStops() {
  var company = document.getElementById("company-select").value;
  var route = document.getElementById("route-input").value.trim().toUpperCase();
  var boundSelect = document.getElementById("bound-select");
  var bound = boundSelect.value;
  var stopSelect = document.getElementById("stop-select");

  if (!bound) return;

  stopSelect.innerHTML = '<option value="">載入車站中...</option>';
  stopSelect.disabled = true;

  var boundParam = (bound === "O") ? "outbound" : "inbound";
  var url = "https://data.etabus.gov.hk/v1/transport/kmb/route-stop/" + route + "/" + boundParam + "/1";

  httpGet(url, function(err, res) {
    if (err || !res.data) {
      alert("無法載入車站資料");
      return;
    }

    var stopsData = res.data;
    stopSelect.innerHTML = '<option value="">請選擇車站</option>';
    
    // 依序取得車站名稱
    var count = 0;
    stopsData.forEach(function(item, index) {
      var stopUrl = "https://data.etabus.gov.hk/v1/transport/kmb/stop/" + item.stop;
      httpGet(stopUrl, function(sErr, sRes) {
        count++;
        if (!sErr && sRes.data) {
          var opt = document.createElement("option");
          opt.value = item.stop;
          opt.innerText = (index + 1) + ". " + sRes.data.name_tc;
          opt.setAttribute("data-seq", item.seq);
          stopSelect.appendChild(opt);
        }
        if (count === stopsData.length) {
          stopSelect.disabled = false;
        }
      });
    });
  });
}

// 3. 儲存設定並寫入 localStorage
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

// 4. 開始定時更新 ETA
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

  var url = "https://data.etabus.gov.hk/v1/transport/kmb/eta/" + 
            currentConfig.stopId + "/" + currentConfig.route + "/1";

  httpGet(url, function(err, res) {
    if (err || !res.data) return;

    // 篩選對應方向的數據
    var validEtas = [];
    for (var i = 0; i < res.data.length; i++) {
      if (res.data[i].dir === currentConfig.bound && res.data[i].eta) {
        validEtas.push(res.data[i]);
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
