def find_trend(present,week,fortnight,month):
    week_diff = find_percent_trend(present,week)

    month_diff = find_percent_trend(present,month)

    fort_diff = find_percent_trend(present,fortnight)

    return week_diff,month_diff,fort_diff

def find_percent_trend(present,old):
    present,old = float(present),float(old)
    diff = (present-old)/old * 100
    return round(diff,3)

def get_five_day_trend(list):
    week_list = list[0:8]
    trend_list = []
    for i in range(len(week_list)-1):
        trend_list.append(find_percent_trend(week_list[i],week_list[i+1]))
        i+=1
    
    return trend_list
