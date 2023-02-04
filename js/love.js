var toggle = document.getElementById('switch');
toggle.onclick = function() {
  this.innerText='By Mankod';
 this.style.cursor='none';
      this.style.color='#bef'; 
           document.getElementById('lights').className = 'animate';
document.getElementById('switch').className = 'animate';
	document.getElementById('trav').style.color='#ccf';
    document.getElementById('photo').style.display = 'block';
};

document.getElementById('photo').style.display = 'none';
count = 1;

function change_background(){
    document.getElementById('photo').style.backgroundImage = "url(../images/roshni/"+count+".jpeg)";
    count +=1 ;
    if (count>19){
        count=1
    }}

setInterval(change_background,1500);