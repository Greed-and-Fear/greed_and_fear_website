import pandas as pd
import methods

df = pd.read_csv("new.csv")

new_df = pd.DataFrame(columns=["Stock","D1 Candle","D2 Candle","D3 Candle","D4 Candle","D5 Candle","D6 Candle","Weekly","Fort night","Monthly"])
for i in range(1,len(df.index)):
    stock = df.loc[i]
    weekly_trend,fortnight_trend,monthly_trend = methods.find_trend(stock['Ltp'],stock['D+7'],stock['D+15'],stock['D+30'])

    day_1_candle = methods.find_percent_trend(stock["Ltp"],stock["D+1"])
    day_2_candle = methods.find_percent_trend(stock["D+1"],stock["D+2"])
    day_3_candle = methods.find_percent_trend(stock["D+2"],stock["D+3"])
    day_4_candle = methods.find_percent_trend(stock["D+3"],stock["D+4"])
    day_5_candle = methods.find_percent_trend(stock["D+4"],stock["D+5"])
    day_6_candle = methods.find_percent_trend(stock["D+5"],stock["D+6"])

    new_df.loc[len(new_df.index)] = [stock["Stock"],day_1_candle,day_2_candle,day_3_candle,day_4_candle,day_5_candle,day_6_candle,weekly_trend,fortnight_trend,monthly_trend] # type: ignore

print(new_df.to_string())

# "Stock","Ltp","D+1","D+2","D+3","D+4","D+5","D+6","D+7","D+10","D+15","D+20",
# "D+25","D+30","D+45","D+60","D+90","D+0-Vol",
# "D+1-Vol","D+2-Vol","D+3-Vol","D+4-Vol","D+5-Vol","D+6-Vol","D+7-Vol"] new data