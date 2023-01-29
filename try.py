import pandas as pd
import json

intra_df = pd.read_csv("csv_file/intraday.csv")

intra_df.to_json('jsondata/intraday_first.json', orient='records',force_ascii=False)


positional_df = pd.read_csv("csv_file/positional.csv")

positional_df.to_json('jsondata/positional.json', orient='records',force_ascii=True)