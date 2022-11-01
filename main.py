from operator import index
from fulldf import full_df
import pandas as pd
from methods import find_trend,get_five_day_trend
from stockname import names

Outdf = pd.DataFrame(columns=["Stock","Day1","Day2","Day3","Day4","Day5","Day6","Day7","weekly","15 day","Monthly"])
symbols = [
    "TTFl.BSE",
    "JPPOWER.BSE",
    "ASHSI.BSE",
    "TATAPOWER.BSE"
         ]

# symbols = ['test']

# symbols = names


main_df = full_df(symbols)
i = j = k = 0 

for symbol in symbols:
    i = j + 30
    stock_df = main_df.iloc[j:i,:]
    j = i
    
    close_price = stock_df['Close'].to_list()
    
    five_data_trend = get_five_day_trend(close_price)

    present_price = float(close_price[0])

    last_week_price = float(close_price[7])

    last_15_price = float(close_price[15])

    last_month_price = float(close_price[29])

    week_diff,month_diff,fort_diff = find_trend(present_price,last_week_price,last_15_price,last_month_price)

    Outdf.loc[len(Outdf.index)] = [symbol,five_data_trend[0],five_data_trend[1],five_data_trend[2],five_data_trend[3],five_data_trend[4],five_data_trend[5],five_data_trend[6],week_diff,fort_diff,month_diff]


print(Outdf.to_string())
