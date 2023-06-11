import requests

data = requests.get("https://api.greedandfear.fun/api/tc/",headers={'content-type':'*'})

print(data.headers)