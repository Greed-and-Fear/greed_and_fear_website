def find_percent_trend(present,old):
    present,old = float(present),float(old)
    diff = (present-old)/old * 100
    return round(diff,3)

def get_candle_details(open,close,high,low):
    candle_length = 0.0
    up_per,down_per = 0.0,0.0
    up_len = 0
    down_len = 0
    candle_color = green_or_red(open,close)
    total_length = high - low
    if candle_color == "Red":
        up_len = high - open
        down_len = close - low 
        candle_length = open - close
    elif candle_color == "Green":
        up_len = high - close
        down_len = open - low
        candle_length =  close - open
    
    up_per = (up_len/total_length) * 100
    down_per = (down_len/total_length) * 100
    shaded_percentage = (candle_length/total_length) *100
    return candle_color,shaded_percentage,up_per,down_per

def green_or_red(open,close):
    if open < close:
        return "Green"
    else:
        return "Red"

