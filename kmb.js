<!-- 九巴 / 龍運 卡片 -->
<div class="card">

  <h2>🚌 九巴／龍運</h2>

  <div class="bus-inputs">

    <input
      type="text"
      id="kmb-route"
      placeholder="路線 (例:E31)"
      value="E31">

    <input
      type="text"
      id="kmb-stop-name"
      placeholder="站名或代號 (例: 東涌纜車站)"
      value="東涌纜車站">

    <button onclick="saveAndFetchKmb()">
      更新
    </button>

  </div>

  <div id="kmb" class="bus-eta-list">
    載入中...
  </div>

</div>
