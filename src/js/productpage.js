function change_price()
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
          prime.innerHTML = "₹1197/Montly";
          elite.innerHTML = "₹1797/Montly";
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