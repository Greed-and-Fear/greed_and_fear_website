import requests

url = "https://www.nseindia.com/api/quote-equity?symbol=AARON"

data = requests.get(url).json()

print(data)