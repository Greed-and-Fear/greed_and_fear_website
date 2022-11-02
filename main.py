import time
import pandas as pd
from stockname import names
from getdata import getdata

Outdf = pd.DataFrame(columns=["Stock","Ltp","D+1","D+2","D+3","D+4","D+5","D+6","D+7","D+10","D+15","D+20","D+25","D+30","D+45","D+60","D+90","D+0-Vol","D+1-Vol","D+2-Vol","D+3-Vol","D+4-Vol","D+5-Vol","D+6-Vol","D+7-Vol"])

symbols = names

data = getdata("TATAPOWER.BSE")

date_list = [each_data for each_data in data]

Outdf.loc[len(Outdf.index)] = ["",date_list[0],date_list[1],date_list[2],date_list[3],date_list[4],date_list[5],date_list[6],date_list[7],date_list[9],date_list[14],date_list[19],date_list[24],date_list[29],date_list[44],date_list[59],date_list[89],date_list[0],date_list[1],date_list[2],date_list[3],date_list[4],date_list[5],date_list[6],date_list[7]]  # type: ignore

for symbol in symbols:

    try:
        data = getdata(symbol)

        date_list = [each_data for each_data in data]


        close_price_list = []
        volume_list = []
        i = 0

        for each_date in date_list:
            close_price_list.append(float(data[each_date]['4. close']))
            volume_list.append(float(data[each_date]['5. volume']))

        Outdf.loc[len(Outdf.index)] = [symbol,close_price_list[0],close_price_list[1],close_price_list[2],close_price_list[3],close_price_list[4],close_price_list[5],close_price_list[6],close_price_list[7],close_price_list[9],close_price_list[14],close_price_list[19],close_price_list[24],close_price_list[29],close_price_list[44],close_price_list[59],close_price_list[89],volume_list[0],volume_list[1],volume_list[2],volume_list[3],volume_list[4],volume_list[5],volume_list[6],volume_list[7]]  # type:ignore

        Outdf.to_csv("new.csv")

        print(f"{symbol} Done")
    except:
        print(f"{symbol} Failed")

    time.sleep(13)