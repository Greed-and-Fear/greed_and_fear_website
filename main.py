from fulldf import full_df
import pandas as pd
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

    week_diff = (present_price-last_week_price)/last_week_price * 100

    month_diff = (present_price-last_month_price)/last_month_price * 100

    fort_diff = (present_price-last_15_price)/last_15_price * 100

    print(week_diff,fort_diff,month_diff)