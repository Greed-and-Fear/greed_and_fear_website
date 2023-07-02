FROM ubuntu
RUN apt-get update
RUN apt-get install nginx -y
COPY . /var/www/html/
COPY shared_pdf shared_pdf
EXPOSE 80
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]