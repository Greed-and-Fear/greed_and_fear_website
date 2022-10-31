from fulldf import full_df
import pandas as pd
from methods import find_trend
symbols = ["RELIANCE.BSE","TTFL.BSE"]

main_df = full_df(symbols)
i=j = 0 

while i < main_df.shape[0]:
    i = j + 30
    stock_df = main_df.iloc[j:i,:]
    j = i
    
    close_price = stock_df['Close'].to_list()
    present_price = float(close_price[0])

    last_week_price = float(close_price[7])

    last_15_price = float(close_price[15])

    last_month_price = float(close_price[29])

    wk_com,week_diff,mon_com,month_diff,fort_com,fort_diff = find_trend(present_price,last_week_price,last_15_price,last_month_price)

    

    print(week_diff,fort_diff,month_diff)