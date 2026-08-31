async function loadCityBus(){
 
let html=
`
<div class="route">
<span>A11</span>
<span class="eta">查詢中...</span>
</div>
 
<div class="route">
<span>E11A</span>
<span class="eta">查詢中...</span>
</div>
`;
 
document.getElementById("citybus").innerHTML=
html;
}
 
loadCityBus();
 
setInterval(loadCityBus,30000);
