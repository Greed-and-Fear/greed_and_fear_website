fetch('./jsondata/today_pick.json')
.then(function(response){
    return response.json();
})
.then(function(today_pick){
    let stock_cards = document.querySelector(".row");
    let out="";
    for(let single_stock of today_pick){
        out +=
        `
                <div class="column">
                    <div class="stockcard">
                        <div class="card-name">${single_stock.stockname}</div> 
                        <img src="${single_stock.pictureUrl}" alt="#" class="${single_stock.trend}">
                        <div class="entry-price">ENTRY@${single_stock.entry_price}₹</div>
                        <div class="exit-price">EXIT@${single_stock.exit_price}₹</div>
                        <div class="stoploss">SL@${single_stock.stoploss}₹</div>
                        <div class="time-frame">Time Frame:${single_stock.time_frame}</div>
                    </div>
                </div>
                `;
            }
            stock_cards.innerHTML = out;
})


fetch('./jsondata/highvolume.json')
.then(function(response){
    return response.json();
})
.then(function(today_pick){
    let high_vol_cards = document.querySelector(".high-row");
    let newhtml="";
    for(let single_stock of today_pick){
        newhtml +=
        `
        <div class="column">
            <div class="stockcard">
                <div class = "fullname"> ${single_stock.name}</div>
                <div class = "nsename"> ${single_stock.nsecode}</div>
                <div class = "percentage"> ${single_stock.per_chg}%</div>
                <div class = "close-price">Price: ${single_stock.close}₹</div>
                <div class = "volume">Volume : ${single_stock.volume}</div>
            </div>
        </div>
                `;
            }
            high_vol_cards.innerHTML = newhtml;
})



 // <div class="column">
                //     <div class="stockcard">
                //         <div class="card-name">${single_stock.stockname}</div> 
                //         <img src="${single_stock.pictureUrl}" alt="#" class="${single_stock.trend}">
                //         <div class="entry-price">ENTRY@${single_stock.entry_price}₹</div>
                //         <div class="exit-price">EXIT@${single_stock.exit_price}₹</div>
                //         <div class="stoploss">SL@${single_stock.stoploss}₹</div>
                //         <div class="time-frame">Time Frame:${single_stock.time_frame}</div>
                //     </div>
                // </div>
