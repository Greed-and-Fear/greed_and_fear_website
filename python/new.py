import requests

url = "http://178.128.121.47:5678/webhook-test/dca4bd9a-8420-469b-91ed-0ff74afeea2f"


response = requests.get(url=url)

print(response.status_code)