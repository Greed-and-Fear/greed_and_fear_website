import pandas as pd
from getdata import Getdata

get_data = Getdata()
df = pd.read_csv("nse.csv")

print(df)
