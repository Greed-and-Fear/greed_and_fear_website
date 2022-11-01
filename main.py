from fulldf import full_df
import pandas as pd
from methods import find_trend,get_five_day_trend
from stockname import names
# symbols = ["RELIANCE.BSE",
# "TTFl.BSE",
# "JPPOWER.BSE",
# "ASHSI.BSE",
# "TATAPOWER.BSE",]

symbols = ['test']

# symbols = names


main_df = full_df(symbols)
i = j = 0 

while i < main_df.shape[0]:
    i = j + 30
    stock_df = main_df.iloc[j:i,:]
    j = i
    
    close_price = stock_df['Close'].to_list()
    
    five_data_trend = get_five_day_trend(close_price)

    #print(five_data_trend)

    present_price = float(close_price[0])

    last_week_price = float(close_price[7])

    last_15_price = float(close_price[15])

    last_month_price = float(close_price[29])

    week_diff,month_diff,fort_diff = find_trend(present_price,last_week_price,last_15_price,last_month_price)

