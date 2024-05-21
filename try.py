import pandas as pd
import json
import requests
from bs4 import BeautifulSoup as bs


def get_high_voume():
    URL = 'https://chartink.com/screenerstocks-rising-with-increasing-volumes '
    page = requests.get(URL)
    soup = bs(page.content, 'html.parser')
    data = {
    'scan_clause' : '( {57960} ( latest volume > latest sma( volume,10 ) * 2 and( {cash} ( latest close > 1 day ago close * 1.05 or latest close < 1 day ago close * 0.95 ) ) ) )' 
    }

    with requests.Session() as s:
        r = s.get('https://chartink.com/screener/stocks-rising-with-increasing-volumes')
        soup = bs(r.content, 'lxml')
    s.headers['X-CSRF-TOKEN'] = soup.select_one('[name=csrf-token]'['content']
    r = s.post('https://chartink.com/screener/process', data=data).json()
    with open("jsondata/highvolume.json", "w") as fp:
        json.dump(r['data'],fp) 

get_high_voume()

intra_df = pd.read_csv("csv_file/intraday.csv")

intra_df.to_json('jsondata/intraday_first.json', orient='records',force_ascii=False)

positional_df = pd.read_csv("csv_file/positional.csv")

positional_df.to_json('jsondata/positional.json', orient='records',force_ascii=True)
