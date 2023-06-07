import razorpay
import json
import conf


client = razorpay.Client(auth=(conf.razor_pay_id, conf.razor_pay_secret))

data = client.payment.all()

# data = client.customer.all()



print(json.dumps(data, indent = 4))