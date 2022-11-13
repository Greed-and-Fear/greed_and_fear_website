from django.db import models

# Create your models here.
class Stockdata(models.Model):
    stock_name = models.CharField(max_length=80)
    stock_price = models.FloatField()
    dividend_percent = models.FloatField()
    announcment_date = models.DateField()
    ex_div_date = models.DateField()
    record_date = models.DateField()
    status = models.IntegerField()

    def __str__(self):
        return self.stock_name
    class Meta:  
        db_table = "stockdata" 

