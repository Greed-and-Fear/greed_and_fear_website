from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .serailizers import Stocksearlizer
from .models import Stockdata


# Create your views here.
@api_view(['GET'])
def apiOverview(request):
    api_urls = {
        'list' : '/stock-list/',
        'details' : '/stock-details/<str:name>',
        'create' : '/stock-create/',
        'update' : '/stock-update/<int:id>',
        'delete' : '/stock-delete/<int:id>'
    }

    return Response(api_urls)

@api_view(['GET'])
def getall(request):
    stocks = Stockdata.objects.all()
    serializer = Stocksearlizer(stocks, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def get_details_by_name(request, name):
    stock = Stockdata.objects.get(stock_name=name)
    serializer = Stocksearlizer(stock, many=False)
    return Response(serializer.data)

@api_view(['POST'])
def create_stock(request):
    serializer = Stocksearlizer(data=request.data)
    if serializer.is_valid():
        serializer.save()
    return Response(serializer.data)

@api_view(['GET','POST'])
def update_stock(request, name):
    stock = Stockdata.objects.get(stock_name=name)
    serializer = Stocksearlizer(instance=stock, data=request.data)
    if serializer.is_valid():
        serializer.save()
    return Response(serializer.data)

@api_view(['GET'])
def delete_stock(request, name):
    stock = Stockdata.objects.get(stock_name=name)
    stock.delete()
    return Response("Successfully deleted")

    