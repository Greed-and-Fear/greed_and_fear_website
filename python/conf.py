from dotenv import load_dotenv
import os

load_dotenv()

dropbox_app_key = os.getenv('dropbox_app_key')
dropbox_app_secret = os.getenv('dropbox_app_secret')

razor_pay_id = os.getenv('razor_pay_id')
razor_pay_secret = os.getenv('razor_pay_secret')
