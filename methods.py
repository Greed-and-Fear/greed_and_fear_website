def compare(open,close):
    if open <= close:
        return "Green"
    else:
        return "Red"
    
def find_trend(present,week,fortnight,month):
    wk_com,week_diff = find_percent_trend(present,week)

    mon_com,month_diff = find_percent_trend(present,month)

    fort_com,fort_diff = find_percent_trend(present,fortnight)

    return wk_com,week_diff,mon_com,month_diff,fort_com,fort_diff

def find_percent_trend(present,old):
    diff = (present-old)/old * 100
    if diff > 10:
        comment = "Heavy Up trend"
    elif diff < -10:
        comment = "Heavy Down trend"
    elif diff < 10 and diff >4:
        comment = "Up trend"
    elif diff > -10 and diff <-4:
        comment = "Down trend"
    else:
        comment = "Flat"
    return comment,round(diff,3)



