function updateClock(){
 
const now=new Date();
 
document.getElementById("clock").innerHTML=
now.toLocaleTimeString("zh-HK");
 
document.getElementById("date").innerHTML=
now.toLocaleDateString("zh-HK",{
weekday:"long",
year:"numeric",
month:"long",
day:"numeric"
});
}
 
updateClock();
setInterval(updateClock,1000);
