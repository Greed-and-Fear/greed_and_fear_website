import requests

data = requests.get("http://api.greedandfear.fun/api/tc/",headers={'content-type':'*'})

print(data.headers)