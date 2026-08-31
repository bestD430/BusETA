async function loadWeather(){
 
const url=
"https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc";
 
const res=await fetch(url);
 
const data=await res.json();
 
const temp=data.temperature.data[1].value;
 
const humidity=data.humidity.data[0].value;
 
document.getElementById("weather").innerHTML=
`
${temp}°C
<br>
相對濕度 ${humidity}%
`;
}
 
loadWeather();
 
setInterval(loadWeather,60000);
