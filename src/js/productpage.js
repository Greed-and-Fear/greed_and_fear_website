function change_price()
{
    const switch_button = document.getElementById('switcher');

    const basic = document.getElementById('basic');
    const prime = document.getElementById('premium');
    const elite = document.getElementById('elite');
    const baisclink = document.getElementById('baisclink');
    const premiumlink = document.getElementById('premiumlink');
    const elitelink = document.getElementById('elitelink');
    
    if (switch_button.checked == false){
        basic.innerHTML = "₹299/week";
        prime.innerHTML = "₹399/week";
        elite.innerHTML = "₹599/week";
        baisclink.innerHTML = '<a href="orderpages/basicweek.html"><button class="features-btn">Buy Now</button></a>';
        premiumlink.innerHTML = '<a href="orderpages/premiumweek.html"><button class="features-btn">Buy Now</button></a>';
        elitelink.innerHTML = '<a href="orderpages/eliteweek.html"><button class="features-btn">Buy Now</button></a>';
        
    } else 
    {
          basic.innerHTML = "₹897/Monthly";
          prime.innerHTML = "₹1197/Montly";
          elite.innerHTML = "₹1797/Montly";
          baisclink.innerHTML = '<a href="orderpages/basicmonth.html"><button class="features-btn">Buy Now</button></a>';
          premiumlink.innerHTML = '<a href="orderpages/premiummonth.html"><button class="features-btn">Buy Now</button></a>';
          elitelink.innerHTML = '<a href="orderpages/elitewonthlu.html"><button class="features-btn">Buy Now</button></a>';
      }

}

function change_price_book()
{
    const switch_button = document.getElementById('switcher');

    const basic = document.getElementById('basic');
    const prime = document.getElementById('premium');
    const elite = document.getElementById('elite');
    
    if (switch_button.checked == false){
        basic.innerHTML = "₹299/week";
        prime.innerHTML = "₹399/week";
        elite.innerHTML = "₹599/week";
        
    } else 
    {
          basic.innerHTML = "₹897/Monthly";
          prime.innerHTML = "₹1297/Montly";
          elite.innerHTML = "₹1797/Montly";
      }

}