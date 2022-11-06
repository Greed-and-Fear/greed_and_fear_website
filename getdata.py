import requests
import pandas as pd
from methods import get_candle_details
from datetime import datetime
from nsepy import get_history

symbol = "TATAPOWER.BSE"

stock_df = pd.DataFrame(columns=["Stock","Date","Open","Close","High","Low","Volume","color","Shade-Per","Up-per","Down-per"])

class Getdata:
    def __init__(self) -> None:
        url = "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=TATAPOWER.BSE&apikey=8SP5CFNLUHXR9F34&outputsize=compact"
        data = requests.get(url).json()
        data = data['Time Series (Daily)']
        self.date_list = [each_date for each_date in data]
        startdate = self.date_list[-1]
        enddate = self.date_list[0]
        self.startdate = datetime.strptime(startdate,"%Y-%m-%d")
        self.enddate = datetime.strptime(enddate,"%Y-%m-%d")

    def getdata_bse_data(self,symbol,df:pd.DataFrame):
       
        url = f"""https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&apikey=8SP5CFNLUHXR9F34&outputsize=compact"""
        data = requests.get(url).json()
        data = data['Time Series (Daily)']

        for each_date in self.date_list:
            present_stock_data = data[each_date]
            open,close,high,low = float(present_stock_data['1. open']),float(present_stock_data['4. close']),float(present_stock_data['2. high']),float(present_stock_data['3. low'])
            col,shaded_percentage,up_per,down_per = get_candle_details(open,close,high,low)
            df.loc[len(stock_df.index)] = [symbol,each_date,open,close,high,low,float(present_stock_data['5. volume']),col,shaded_percentage,up_per,down_per] #type: ignore
            df.to_csv("bse.csv")
        return df


    def get_nse_details(self,symbol,df:pd.DataFrame):
        data = get_history(symbol,start=self.startdate,end=self.enddate)
        data = data.drop(['Series','Prev Close','VWAP','Turnover','Trades','Deliverable Volume','%Deliverble'],axis=1)
        print(data.to_string())
        data.to_csv("nse.csv")


get_data = Getdata()
get_data.get_nse_details("ABB",stock_df)
