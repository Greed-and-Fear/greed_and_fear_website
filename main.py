from fileinput import close
import time
from fulldf import full_df
import pandas as pd
from methods import find_trend,get_five_day_trend
from stockname import sub_stock

Outdf = pd.DataFrame(columns=["Stock","Day1","Day2","Day3","Day4","Day5","Day6","Day7","weekly","15 day","Monthly","Ltp","D1","D2","D3","D4","D5","D6","D7","D10","D15","D20","D25","D30","D45","D60","D90"])
symbols = sub_stock

for each_sub_stock in symbols:
    try:
        main_df = full_df(each_sub_stock)
        i = j = k = 0 

        for symbol in each_sub_stock:
            i = j + 90
            stock_df = main_df.iloc[j:i,:]
            j = i
            
            close_price = stock_df['Close'].to_list()

            cp = close_price

            wk_trrend = get_five_day_trend(close_price)

            present_price = float(close_price[0])

            last_week_price = float(close_price[7])

            last_15_price = float(close_price[15])

            last_month_price = float(close_price[29])

            week_diff,month_diff,fort_diff = find_trend(present_price,last_week_price,last_15_price,last_month_price)

            Outdf.loc[len(Outdf.index)] = [symbol,wk_trrend[0],wk_trrend[1],wk_trrend[2],wk_trrend[3],wk_trrend[4],wk_trrend[5],wk_trrend[6],week_diff,fort_diff,month_diff,close_price[0],cp[1],cp[2],cp[3],cp[4],cp[5],cp[6],cp[7],cp[9],cp[14],cp[19],cp[24],cp[29],cp[44],cp[59],cp[89]] # type: ignore
            
            print(f"{symbol} Done", end="|")

            Outdf.to_csv("data.csv")

            time.sleep(12)
        
        print("")
    except:
        print("skipping")
        time.sleep(12)
    

print(Outdf.to_string())


