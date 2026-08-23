function updateClock() {
  const now = new Date();

  // 1. 顯示年月日 (例如: 2026/8/23)
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  document.getElementById("date").innerText = `${date}/${month}/${year}`;

  // 2. 顯示 上午 / 下午
  const hours = now.getHours();
  const ampmText = hours >= 12 ? "下午" : "上午";
  document.getElementById("ampm").innerText = ampmText;

  // 3. 顯示 8 位數時間 (HH:MM:SS)
  const formattedTime = now.toTimeString().split(" ")[0];
  document.getElementById("clock").innerText = formattedTime;
}

// 立即執行並設定每秒更新
updateClock();
setInterval(updateClock, 1000);
