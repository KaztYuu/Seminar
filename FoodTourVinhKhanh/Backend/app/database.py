import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password="",
        database=os.getenv("DB_NAME"),
        port=os.getenv("DB_PORT")
    )