FROM ubuntu
COPY nginx.conf /etc/nginx/nginx.conf
# COPY index.html /var/www/html/
COPY . /var/www/html/
EXPOSE 80
EXPOSE 443
CMD ["nginx", "-c", "/data/conf/nginx.conf"]