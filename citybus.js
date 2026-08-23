<!-- 九巴 / 龍運 卡片 -->
<div class="card">
  <h2>🚌 九巴／龍運</h2>
  <div class="bus-inputs">
    <input type="text" id="kmb-route" placeholder="路線 (例: E36A)" value="E36A">
    <input type="text" id="kmb-stop-name" placeholder="站名 (例: 東涌纜車站)" value="東涌纜車站">
    <button onclick="saveAndFetchKmb()">更新</button>
  </div>
  <div id="kmb" class="bus-eta-list">載入中...</div>
</div>

<!-- 城巴 卡片 -->
<div class="card">
  <h2>🚌 城巴</h2>
  <div class="bus-inputs">
    <input type="text" id="citybus-route" placeholder="路線 (例: A21)" value="A21">
    <input type="text" id="citybus-stop-name" placeholder="站名 (例: 金鐘站)" value="金鐘站">
    <button onclick="saveAndFetchCitybus()">更新</button>
  </div>
  <div id="citybus" class="bus-eta-list">載入中...</div>
</div>
