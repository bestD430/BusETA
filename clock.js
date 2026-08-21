function updateClock(){
2
 
3
const now = new Date();
4
 
5
document.getElementById("clock").innerHTML =
6
now.toLocaleTimeString("zh-HK");
7
 
8
document.getElementById("date").innerHTML =
9
now.toLocaleDateString("zh-HK");
10
}
11
 
12
setInterval(updateClock,1000);
13
 
14
updateClock();
