import pandas as pd
import json

df = pd.read_excel("intraday.xlsx",sheet_name="Sheet1")

df.to_json('file.json', orient='records',force_ascii=True)