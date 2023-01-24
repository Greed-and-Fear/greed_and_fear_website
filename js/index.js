// function setCookie()  
// {  

//     Cookies.set({SameSite:'strict'});
// }  
// // document.cookie = "path =/;domain www.youtube-nocookie.com; SameSite=Strict;";

let names = ["s1", "s2", "s3", "s4", "s5"];
let count = 0;

function cycleArray() {
    let name = names[count];
    document.getElementById(name).checked = true;
    // increment our counter
    count++;
    
    // reset counter if we reach end of array
    if (count === names.length) {
        count = 0;
    }
}

setInterval(cycleArray, 1500);

// change_card()


async function on_load(){
    get_intraday_stock()

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
            <div class="image"><img alt =${single_stock.stock_name}-chart class="result-img" src="${single_stock.img_path}"></div>
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
