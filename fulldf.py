import pandas as pd
from getdata import getdata



Outdf = pd.DataFrame(columns=['Symbol','Date','Open', 'Close', 'High', 'Low'])

date_list =  []
final_list =  []

def full_df(symbols):
    
    for symbol in symbols:
        print(symbol)
        required_data = getdata(symbol)
        for each_item in required_data:
            if len(date_list) < 30:
                date_list.append(each_item)
            else:
                break
        for each_date in date_list:
            open,close = required_data[each_date]['1. open'],required_data[each_date]['4. close']
            Outdf.loc[len(Outdf.index)] = symbol,each_date,open,close,required_data[each_date]['3. low'],required_data[each_date]['2. high']  # type: ignore
        
    return Outdf
