from django.urls import path
from . import views



urlpatterns = [
    path('', views.apiOverview, name= "apioverview"),
    path('stock-list/', views.getall, name = "allstocks"),
    path('stock-details/<str:name>/', views.get_details_by_name, name = "stock_details"),
    path('stock-create/', views.create_stock, name = "Add stocks"),
    path('stock-update/<str:name>/', views.update_stock, name = "Update stocks"),
    path('stock-delete/<str:name>/', views.delete_stock, name = "Delete Stock")
]