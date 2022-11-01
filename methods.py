def find_trend(present,week,fortnight,month):
    week_diff = find_percent_trend(present,week)
    month_diff = find_percent_trend(present,month)
    fort_diff = find_percent_trend(present,fortnight)
    return week_diff,fort_diff,month_diff

def find_percent_trend(present,old):
    present,old = float(present),float(old)
    diff = (present-old)/old * 100
    return round(diff,3)

