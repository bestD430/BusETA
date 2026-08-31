async function loadWarning(){
 
const url=
"https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=tc";
 
const res=await fetch(url);
 
const data=await res.json();
 
let html="";
 
for(let key in data){
 
html += data[key].name + "<br>";
}
 
if(html===""){
 
html="目前沒有天氣警告";
}
 
document.getElementById("warning").innerHTML=html;
}
 
loadWarning();
 
setInterval(loadWarning,60000);
