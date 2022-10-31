import pandas as pd
from getdata import getdata
from methods import compare

symbols = ["RELIANCE.BSE","TTFL.BSE"]

Outdf = pd.DataFrame(columns=['Symbol','Date','Open', 'Close', 'High', 'Low','Type'])

date_list =  []
final_list =  []

for symbol in symbols:
    
    required_data = getdata(symbol)
    for each_item in required_data:
        if len(date_list) < 5:
            date_list.append(each_item)
        else:
            break
    for each_date in date_list:
        open,close = required_data[each_date]['1. open'],required_data[each_date]['4. close']
        Outdf.loc[len(Outdf.index)] = symbol,each_date,open,close,required_data[each_date]['3. low'],required_data[each_date]['2. high'],compare(open,close)  # type: ignore
        

print(Outdf)