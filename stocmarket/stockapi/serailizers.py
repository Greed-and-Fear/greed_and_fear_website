from rest_framework import serializers

from .models import Stockdata

class Stocksearlizer(serializers.ModelSerializer):
    class Meta:
        model = Stockdata
        fields = '__all__'