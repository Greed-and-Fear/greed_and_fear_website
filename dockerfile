FROM nginx
COPY . /var/www/html/
EXPOSE 80
EXPOSE 443
CMD ["nginx", "-c", "/data/conf/nginx.conf"]