import requests 

nifty_url = "https://www.nseindia.com/get-quotes/equity?symbol=HINDALCO"

data = requests.get(nifty_url).json()

print(data)