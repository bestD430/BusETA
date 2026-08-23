function updateClock() {
  const now = new Date();

  document.getElementById("clock").innerHTML =
    now.toLocaleTimeString("zh-HK");

  document.getElementById("date").innerHTML =
    now.toLocaleDateString("zh-HK");
}

setInterval(updateClock, 1000);

updateClock();
