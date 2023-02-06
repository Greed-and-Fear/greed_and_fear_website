// function setCookie()  
// {  

//     Cookies.set({SameSite:'strict'});
// }  
// // document.cookie = "path =/;domain www.youtube-nocookie.com; SameSite=Strict;";



let names = ["s1", "s2", "s3", "s4", "s5"];
let count = 0;
let count2 = 1;
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

let background_images = ["homepage1","homepage2","homepage3"]

function change_background() {
    

}

setInterval(change_background,5000)



// change_card()


async function on_load() {
    get_intraday_stock()
    get_positional_stock()
    
    
}

async function get_intraday_stock() {
    fetch('https://johnson845173.github.io/algotrade/jsondata/intraday_first.json')
    .then(function (response) {
        return response.json();
    })
    .then(function (today_pick) {
        let stock_cards = document.getElementById("cards");
        let out = "";
        for (let single_stock of today_pick) {
            out +=
            `
            <div class="card">
            <div class="stockname">${single_stock.stock_name}</div>
            <div class="image"><img loading="lazy" alt =${single_stock.stock_name}-chart class="result-img" src="${single_stock.img_path}"></div>
            <div class="profit per">+${single_stock.percentage}%</div>
            <div class="profit amt">Profit : ${single_stock.profit}₹</div>
            </div>
            `;
        }
        out += `
        <div class="card finalcard">
        <div class="prem-message">
        Checkout our daily, weekly and short term results
        </div>
        <a href="result.html"><button class="button">View More</button></a>
        </div>
        `
            stock_cards.innerHTML = out;
        })
    }
    
    async function get_positional_stock() {
        fetch('https://johnson845173.github.io/algotrade/jsondata/positional.json')
        .then(function (response) {
            return response.json();
        })
        .then(function (positional_pick) {
            let stock_cards = document.getElementById("pos-cards");
            let out_pos = "";
            for (let each_pos_trade of positional_pick) {
                out_pos +=
                `
                <div class="card ">
                <div class="stockname">${each_pos_trade.name_and_tf}</div>
            <div class="image"><img loading="lazy" alt =${each_pos_trade.name_and_tf}-chart class="result-img" src="${each_pos_trade.img_path}"></div>
            </div>
            `;
        }
        out_pos += `
        <div class="card finalcard">
        <div class="prem-message">
        Checkout our daily, weekly and short term results
        </div>
        <a href="result.html"><button class="button">View More</button></a>
        </div>
        `
        stock_cards.innerHTML = out_pos;
    })
}



const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

signUpButton.addEventListener('click', () => {
    container.classList.add("right-panel-active");
});

signInButton.addEventListener('click', () => {
    container.classList.remove("right-panel-active");
});


function hide_reg() {
    document.getElementById('register-window').style.display = "none"
}
function hide_option() {
    document.getElementById('nav-check').checked = false;
}

function show_reg() {
    
    document.getElementById('register-window').style.display = "block";
}

function send_message2() {
    var name = document.getElementById("cont-name").value;
    var phone = document.getElementById("cont-phone").value;
    var mail = document.getElementById("cont-mail").value;
    var sub = document.getElementById("cont-sub").value;
    var desc = document.getElementById("cont-text").value;
    var text = "Name:" + name + "\n" + "Phone:" + phone + "\n" + "Email:" + mail + "\n" + "Subject:" + sub + "\n" + "Desc:" + desc + "\n";
    
    var settings = {
        "async": true,
        "crossDomain": true,
        "url": "https://api.telegram.org/bot5326832976:AAGBiKuCwYo2_9oMF6-50_WKlhDD_nIoI2A/sendMessage",
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
            "cache-control": "no-cache"
        },
        "data": JSON.stringify({
            "chat_id": '@tempratureee',
            "text": text
        })
    }
    
    $.ajax(settings).done(function (response) {
        console.log(response);
    });
    
    document.getElementById("cont-name").value = ''
    document.getElementById("cont-phone").value = ''
    document.getElementById("cont-mail").value = ''
    document.getElementById("cont-sub").value = ''
    document.getElementById("cont-text").value = ''
    
    document.getElementById("form-response").style.display = "none";
    document.getElementById("responseform").style.display = "block";
    // form-response
}


function go_to_element(element) {
    window.scroll(0,findPosition(document.getElementById(element))-100);
}

function findPosition(obj) {
    var currenttop = 0;
    if (obj.offsetParent) {
        do {
            currenttop += obj.offsetTop;
        } while ((obj = obj.offsetParent));
        return [currenttop];
    }
}

async function load_yt(){
    let welcome_yt = document.getElementById("youtube-div");
    let discord_yt = document.getElementById("discord-div");
    let yt_yt = document.getElementById("yt-div");
    
    welcome_yt.innerHTML = `
    <iframe width="100%" height="100%" loading="lazy" 
    src="https://www.youtube.com/embed/3uYMFxCAAHU?autoplay=0&fs=0&iv_load_policy=3&showinfo=1&rel=0&cc_load_policy=1&start=0&end=0&origin=https://youtubeembedcode.com"
    title="Why Choose Us? A Day at GREED & FEAR!" frameborder="0"
    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen></iframe>
    `
    
    discord_yt.innerHTML = `
    <iframe width="100%" height="100%" loading="lazy" src="https://www.youtube.com/embed/3uYMFxCAAHU?autoplay=0&fs=0&iv_load_policy=3&showinfo=1&rel=0&cc_load_policy=1&start=0&end=0&origin=https://youtubeembedcode.com"
    title="Why Choose Us? A Day at GREED & FEAR!" frameborder="0"
    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen></iframe>
    `
    
    yt_yt.innerHTML = `
    <iframe width="100%" height="100%" loading="lazy"
    src="https://www.youtube.com/embed/3uYMFxCAAHU?autoplay=0&fs=0&iv_load_policy=3&showinfo=1&rel=0&cc_load_policy=1&start=0&end=0&origin=https://youtubeembedcode.com"
    title="Why Choose Us? A Day at GREED & FEAR!" frameborder="0"
    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen></iframe>
    `
}


load_yt()