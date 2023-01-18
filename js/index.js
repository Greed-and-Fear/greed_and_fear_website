function send_message() {
  var text = "Hello\nHow are You"

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

}