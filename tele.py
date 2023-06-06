import requests

url = "https://api.telegram.org/bot6236663076:AAGct2VT2I3j9rsY9ja-KANqJbbSLhEHWB0/sendPhoto"

data_to_send = {
    "chat_id": "@weather845173",
    # "photo":"https://www.dropbox.com/s/al5j70vqp0u577f/20221001_210356.jpg?dl=0"
    "photo":"https://upload.wikimedia.org/wikipedia/en/thumb/8/80/Wikipedia-logo-v2.svg/1122px-Wikipedia-logo-v2.png"
        }

headers = {
    "Content-type": "image/png",
    "Content-Length": "97"
}


data = requests.post(url=url,json=data_to_send,headers=headers)

print(data.text)