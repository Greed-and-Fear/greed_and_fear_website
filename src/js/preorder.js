function change_price()
{
    const switch_button = document.getElementById('switcher');

    const basic = document.getElementById('basic');
    const prime = document.getElementById('premium');
    const elite = document.getElementById('elite');
    
    if (switch_button.checked == false){
        basic.innerHTML = "₹299/week";
        prime.innerHTML = "₹349/week";
        elite.innerHTML = "₹399/week";
        
    } else 
    {
          basic.innerHTML = "₹799/Monthly";
          prime.innerHTML = "₹999/Montly";
          elite.innerHTML = "₹1099/Montly";
      }

}