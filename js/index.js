// function setCookie()  
// {  

//     Cookies.set({SameSite:'strict'});
// }  
// // document.cookie = "path =/;domain www.youtube-nocookie.com; SameSite=Strict;";

setInterval(on_load, 10000);

function on_load(){
    fetch("https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD,JPY,EUR")
    .then(function(response){
        return response.json();
    })
    .then(function(today_pick){
        let bitcoinele = document.getElementById("bitcoin");
        let out=`
        USD : ${today_pick.USD} <br> EUR : ${today_pick.EUR}
        `;
            
                bitcoinele.innerHTML = out;
    })
}
