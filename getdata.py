import requests

def getdata(symbol):
    url = f"""https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&outputsize=full&apikey=8SP5CFNLUHXR9F34&outputsize=compact"""
    data = requests.get(url).json()
    return data['Time Series (Daily)']