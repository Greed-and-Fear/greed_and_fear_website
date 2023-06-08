FROM ubuntu
RUN apt-get update
RUN apt-get install nginx -y
# COPY index.html /var/www/html/
COPY . /var/www/html/
EXPOSE 8443
CMD ["nginx","-g","daemon off;"]