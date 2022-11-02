def find_percent_trend(present,old):
    present,old = float(present),float(old)
    diff = (present-old)/old * 100
    return round(diff,3)

def get_candle_details(open,close,high,low):
    candle_length = 0.0
    candle_color = green_or_red(open,close)
    total_length = high - low
    if candle_color == "Red":
        candle_length = open - close
    elif candle_color == "Green":
        candle_length =  close - open
    
    shaded_percentage = (candle_length/total_length) *100
    return candle_color,shaded_percentage

def green_or_red(open,close):
    if open < close:
        return "Green"
    else:
        return "Red"

