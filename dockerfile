FROM ubuntu
RUN apt-get update
RUN apt-get install nginx -y
COPY . /var/www/html/
COPY shared_folder shared_folder
EXPOSE 80
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]