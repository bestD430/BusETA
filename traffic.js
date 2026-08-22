let busTime = 42;
let taxiTime = 28;
 
function getTrafficIcon(minutes){
 
if(minutes <= 45){
return "🟢 暢順";
}
 
if(minutes <= 60){
return "🟡 車多";
}
 
return "🔴 擠塞";
}
 
document.getElementById("traffic-msg").innerHTML = `
 
🚍 巴士：${busTime}分鐘<br>
${getTrafficIcon(busTime)}
 
<br><br>
 
🚕 的士：${taxiTime}分鐘<br>
${getTrafficIcon(taxiTime)}
 
`;
