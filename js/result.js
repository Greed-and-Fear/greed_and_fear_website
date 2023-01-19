function send_message() {
  var name = document.getElementById("call-fname").value;
  var phone = document.getElementById("call-phone").value;
  var mail = document.getElementById("call-mail").value;
  var desc = document.getElementById("call-desc-box").value;
  var text = "Name:"+name+"\n"+"Phone:"+phone+"\n"+"Email:"+mail+"\n"+"Desc:"+desc+"\n"

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
  
  document.getElementById("call-fname").value = ''
  document.getElementById("call-phone").value = ''
  document.getElementById("call-mail").value = ''
  document.getElementById("call-desc-box").value = ''

  document.getElementById("contact-div").innerHTML = '<div class="thankyou-msg">Thank you for Enquiring.<br><br>One of our executive will get back to you shortly</div>'
}