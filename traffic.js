let busTime = 42;
2
let taxiTime = 28;
3
 
4
function getTrafficIcon(minutes){
5
 
6
if(minutes <= 45){
7
return "🟢 暢順";
8
}
9
 
10
if(minutes <= 60){
11
return "🟡 車多";
12
}
13
 
14
return "🔴 擠塞";
15
}
16
 
17
document.getElementById("traffic-msg").innerHTML = `
18
 
19
🚍 巴士：${busTime}分鐘<br>
20
${getTrafficIcon(busTime)}
21
 
22
<br><br>
23
 
24
🚕 的士：${taxiTime}分鐘<br>
25
${getTrafficIcon(taxiTime)}
26
 
27
`;
