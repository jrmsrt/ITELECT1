from flask import Flask, render_template, request, redirect, url_for, session
from flask_mysqldb import MySQL
import mysql.connector

app = Flask(__name__)
app.secret_key = 'JRM0218@'

def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="VA2L8RDQ!",
        database="bhbookstore_db"
    )

@app.route('/')
def home():
    return render_template('user/index.html')

@app.route('/user_login')
def user_login():
    return render_template('user/sign_in.html')

@app.route('/registration')
def registration():
    return render_template('user/registration.html')

@app.route('/forgot_password')
def forgot_password():
    return render_template('user/forgot_password.html')

@app.route('/books')
def books():
    return render_template('user/shop_books.html')

@app.route('/cart')
def cart():
    return render_template('user/cart.html')

@app.route('/checkout')
def checkout():
    return render_template('user/delivery_checkout.html')

if __name__ == '__main__':
    app.run(debug=True)
