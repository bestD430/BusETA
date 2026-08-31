async function loadKMB(){
 
document.getElementById("kmb").innerHTML=
"載入中...";
 
const stopId="TC413";
 
const routes=["E31","E36A","A41"];
 
let html="";
 
for(const route of routes){
 
html+=`
<div class="route">
<span>${route}</span>
<span class="eta">查詢中...</span>
</div>
`;
}
 
document.getElementById("kmb").innerHTML=html;
}
 
loadKMB();
 
setInterval(loadKMB,30000);
