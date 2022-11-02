import requests
import pandas as pd
from methods import get_candle_details
symbol = "TATAPOWER.BSE"

stock_df = pd.DataFrame(columns=["Stock","Date","Open","Close","High","Low","Volume","color","Shade-Per","Up-per","Down-per"])

#def getdata(symbol):
url = f"""https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&apikey=8SP5CFNLUHXR9F34&outputsize=compact"""
data = requests.get(url).json()
data = data['Time Series (Daily)']

date_list = [each_date for each_date in data]

for each_date in date_list:
    present_stock_data = data[each_date]
    open,close,high,low = float(present_stock_data['1. open']),float(present_stock_data['4. close']),float(present_stock_data['2. high']),float(present_stock_data['3. low'])
    col,shaded_percentage,up_per,down_per = get_candle_details(open,close,high,low)
    stock_df.loc[len(stock_df.index)] = [symbol,each_date,open,close,high,low,float(present_stock_data['5. volume']),col,shaded_percentage,up_per,down_per] #type: ignore

print(stock_df.to_string())