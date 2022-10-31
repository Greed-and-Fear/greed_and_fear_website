import requests
import pandas as pd
from methods import compare

url = 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=RELIANCE.BSE&outputsize=full&apikey=8SP5CFNLUHXR9F34&outputsize=compact'

Outdf = pd.DataFrame(columns=['Date','Open', 'Close', 'High', 'Low','Type'])
data = requests.get(url).json()

required_data = data['Time Series (Daily)']

date_list =  []
final_list =  []

for each_item in required_data:
    if len(date_list) < 5:
        date_list.append(each_item)
    else:
        break

for each_date in date_list:
    open,close = required_data[each_date]['1. open'],required_data[each_date]['4. close']
    Outdf.loc[len(Outdf.index)] = each_date,open,close,required_data[each_date]['3. low'],required_data[each_date]['2. high'],compare(open,close)
    

print(Outdf)
