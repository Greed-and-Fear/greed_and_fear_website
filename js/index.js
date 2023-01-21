// function setCookie()  
// {  

//     Cookies.set({SameSite:'strict'});
// }  
// // document.cookie = "path =/;domain www.youtube-nocookie.com; SameSite=Strict;";

// setInterval(get_intraday_stock(), 100);

function on_load(){
    get_intraday_stock()
    // fetch("https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD,JPY,EUR")
    // .then(function(response){
    //     return response.json();
    // })
    // .then(function(today_pick){
    //     let bitcoinele = document.getElementById("bitcoin");
    //     let out=`
    //     USD : ${today_pick.USD} <br> EUR : ${today_pick.EUR}
    //     `;
        
    //     bitcoinele.innerHTML = out;
    // })

}

function get_intraday_stock(){
fetch('https://johnson845173.github.io/algotrade/jsondata/intraday_first.json')
.then(function(response){
    return response.json();
})
.then(function(today_pick){
    let stock_cards = document.getElementById("cards");
    let out="";
    for(let single_stock of today_pick){
        out +=
        `
        <div class="card">
            <div class="stockname">${single_stock.stock_name}</div>
            <div class="image"><img class="result-img" src="${single_stock.img_path}"></div>
            <div class="profit per">+${single_stock.percentage}%</div>
            <div class="profit amt">Profit : ${single_stock.profit}₹</div>
        </div>
                `;
            }
            out+=`
            <div class="card">
                <div class="prem-message">
                    Checkout our daily, weekly and short term results
                </div>
                <a href="result.html"><button class="button">View More</button></a>
            </div>
            `
            stock_cards.innerHTML = out;
})
}
