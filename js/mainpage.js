function show_today_pick()
{
    const elephantsArray = [
        {
        id: 1,
        stockname: "BATA",
        entry_price: 1000,
        exit_price: 1200,
        stoploss: "900",
        pictureUrl:"images/svg/increase-up-profit-icon.svg",
        trend:"img-trend-up"
        },
        {
            id: 2,
            stockname: "TATASTEEL",
            entry_price: 1000,
            exit_price: 1200,
            stoploss: "900",
            pictureUrl:"images/svg/decrease-down-loss-icon.svg",
            trend:"img-trend-down"
        },
        {
            id: 3,
            stockname: "HCL",
            entry_price: 1000,
            exit_price: 1200,
            stoploss: "900",
            pictureUrl:"images/svg/increase-up-profit-icon.svg",
            trend:"img-trend-up"
        },
        {
            id: 4,
            stockname: "IOCL",
            entry_price: 1000,
            exit_price: 1200,
            stoploss: "900",
            pictureUrl:"images/svg/decrease-down-loss-icon.svg",
            trend:"img-trend-down"
        },
        {
            id: 5,
            stockname: "BAJAJFIN",
            entry_price: 1000,
            exit_price: 1200,
            stoploss: "900",
            pictureUrl:"images/svg/decrease-down-loss-icon.svg",
            trend:"img-trend-down"
        },
        {
            id: 6,
            stockname: "ESCORTS",
            entry_price: 1000,
            exit_price: 1200,
            stoploss: "900",
            pictureUrl:"images/svg/decrease-down-loss-icon.svg",
            trend:"img-trend-down"
        },
        {
            id: 7,
            stockname: "AMBUJA",
            entry_price: 1000,
            exit_price: 1200,
            stoploss: "900",
            pictureUrl:"images/svg/decrease-down-loss-icon.svg",
            trend:"img-trend-down"
        },
        ];

    let htmlCode = ``;
    
    elephantsArray.forEach(function(single_stock) {
        htmlCode =
        htmlCode +
        `
        <div class="column">
            <div class="stockcard">
            <div class="card-name">${single_stock.stockname}</div> 
            <img src="${single_stock.pictureUrl}" alt="#" class="${single_stock.trend}">
            <div class="entry-price">ENTRY@${single_stock.entry_price}₹</div>
            <div class="exit-price">EXIT@${single_stock.exit_price}₹</div>
            <div class="stoploss">SL@${single_stock.stoploss}₹</div>
            </div>
            </div>
        `;
    });
    const stock_cards = document.querySelector(".row");
    stock_cards.innerHTML = htmlCode;
}

function on_load(){
    show_today_pick()
}



