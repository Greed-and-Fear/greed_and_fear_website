import requests

import pandas as pd

telegram_chat_id = "@tempratureee"

telegram_bot_id = "bot5326832976:AAGBiKuCwYo2_9oMF6-50_WKlhDD_nIoI2A"

def send_msg(message):
    try:

        message = message

        teleurl = "https://api.telegram.org/"+telegram_bot_id+"/sendMessage"
        data = {
            "chat_id": telegram_chat_id,
            "text": message
        }
        requests.post(teleurl, params=data)
        return True
        
    except Exception as e:
        print(e)
        return False

df = pd.read_csv("stocks.csv")

for index,row in df.iterrows():
    stock_name = row['name']
    stop_loss = row['s1']
    target_1 = row['t1']
    target_2 = row['t2']
    target_3 = row['t3']
    type = row['type']
    ltp = row['ltp']
    support = row['support']
    resistance = row['resistance']
    breakprice = row['breakprice']

    message = f"""
    Stock Name :{stock_name}
    stop_loss = {stop_loss}
    target_1 ={target_1}
    target_2 = {target_2}
    target_3 = {target_3}
    type = {type}"""

    message2 = f"\
    {type}  {stock_name} at {ltp},\n\
Enter only after Conformation candle at {breakprice}\n\
Keep ⛔️stoploss at {stop_loss}\n\
Market is volatile today.\n\
Target 1 : {target_1}, book profit if momentum good try {target_2}\n\
If going for higher risk try for {target_3}\n\
Support level for {stock_name} is at {support} and resistance at {resistance}\n\n\
Youtube link : https://www.youtube.com/@sharebazaar7173 \
    "

    send_msg(message=message2)

#send_msg("hello bro ")
