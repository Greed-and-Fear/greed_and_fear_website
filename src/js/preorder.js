function send_response2()
{
    // const switch_button = document.getElementById('switcher');

    const basic = document.getElementById('basic').checked;
    const prime = document.getElementById('premium').checked;
    const elite = document.getElementById('elite').checked;

    var settings = {
        "async": true,
        "crossDomain": true,
        "url": "https://api.greedandfear.fun/api/preorder/",
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
            "cache-control": "no-cache",
            "Sec-Fetch-Mode":"no-cors",
            'X-Requested-With':'XMLHttpRequest',
            'Access-Control-Allow-Origin':'*'

        },
        "data": JSON.stringify({ 
            "user_name":"johnson",
            "phone":12345678,
            "email":"dummy@gma",
            "basic":"true",
            "premium":"false",
            "elite":"true",
            "ew":"true",
            "fib":"true",
        }
        )
    }

    $.ajax(settings).done(function (response) {
        console.log(response);
    })

}

function send_response()
{

    const basic = document.getElementById('basic').checked;
    const prime = document.getElementById('premium').checked;
    const elite = document.getElementById('elite').checked;
    const ew = document.getElementById('ew').checked;
    const fib = document.getElementById('fib').checked;
    const name = document.getElementById('fname').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;

fetch('https://api.greedandfear.fun/api/preorder/', {
    method: 'POST',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Sec-Fetch-Site':'cross-site'
    },
    body: JSON.stringify(
        { 
            "user_name":name,
            "phone":phone,
            "email":email,
            "basic":basic,
            "premium":prime,
            "elite":elite,
            "ew":ew,
            "fib":fib,
        }
        )
})
   .then(response => response.json())
   .then(response => console.log(JSON.stringify(response)))

   out = `
   <div class="thank-you">Thank you for Registering.
   <br> Our Team will reach out to you very soon.
   </div>
   `

   document.getElementById('reg-container').innerHTML = out;

}