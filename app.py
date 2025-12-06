from flask import (
    Flask, render_template, request, redirect,
    url_for, session, flash
)
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from flask_mail import Mail, Message
from werkzeug.security import generate_password_hash
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename
import mysql.connector
from flask_mysqldb import MySQL
from flask import jsonify
import mysql.connector
import re
import string
import secrets
import os
import json
import random
import string
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = 'JRM0218@'

# =========================
# UPLOAD FOLDER
# =========================
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# =========================
# MAIL CONFIG
# =========================
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'thebookhaven.online@gmail.com'
app.config['MAIL_PASSWORD'] = 'omhqtujoigtbrhji'
app.config['MAIL_DEFAULT_SENDER'] = 'thebookhaven.online@gmail.com'

mail = Mail(app)

# =========================
# DB CONNECTION
# =========================
def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="VA2L8RDQ!",
        database="bhbookstore_db"
    )

# =========================
# HELPERS
# =========================
def generate_verification_code(length: int = 6) -> str:
    digits = string.digits
    return ''.join(secrets.choice(digits) for _ in range(length))

def get_serializer():
    return URLSafeTimedSerializer(app.config['SECRET_KEY'])

# =========================
# HOME
# =========================
@app.route('/')
def home():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM books ORDER BY created_at DESC LIMIT 6")
    featured_books = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template('user/index.html', featured_books=featured_books)

# =========================
#  USER LOGIN (USER + ADMIN)
# =========================
@app.route('/user-login', methods=['GET', 'POST'])
def user_login():
    if request.method == 'POST':
        # -------- ADMIN LOGIN ----------
        if 'admin_username' in request.form:
            admin_username = request.form.get('admin_username', '').strip()
            admin_password = request.form.get('admin_password', '')

            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("""
                    SELECT * FROM admin
                    WHERE username = %s
                    LIMIT 1
                """, (admin_username,))
                admin = cursor.fetchone()
            finally:
                cursor.close()
                conn.close()

            if not admin or not check_password_hash(admin.get('password', ''), admin_password):
                session['login_msg'] = "Invalid admin credentials."
                session['msg_type'] = "error"
                return redirect(url_for('user_login'))
            else:
                session['admin'] = admin['username']
                session['admin_id'] = admin['id']
                session['redirect_url'] = 'admin-dashboard'
                session['msg_type'] = "success"
                return redirect(url_for('user_login'))
        else:
            # -------- USER LOGIN ----------
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '')

            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("""
                    SELECT * FROM users
                    WHERE username = %s OR email = %s
                    LIMIT 1
                """, (username, username))
                user = cursor.fetchone()
            finally:
                cursor.close()
                conn.close()

            if not user:
                session['login_msg'] = "User not found. Please register an account to sign-in."
                session['msg_type'] = "warning"
                return redirect(url_for('user_login'))

            stored_pw = user.get('password') or ''

            password_ok = False
            try:
                if stored_pw and check_password_hash(stored_pw, password):
                    password_ok = True
            except Exception:
                password_ok = False

            if not password_ok:
                if stored_pw == password:
                    password_ok = True

            if password_ok:
                session['user'] = user['username']
                session['user_id'] = user['id']
                session['redirect_url'] = '/'
                session['msg_type'] = "success"
                return redirect(url_for('user_login'))
            else:
                session['login_msg'] = "Incorrect password."
                session['msg_type'] = "error"
                return redirect(url_for('user_login'))

    msg = session.pop('login_msg', '')
    msg_type = session.pop('msg_type', '')
    redirect_url = session.pop('redirect_url', '/')
    login_required_flag = session.pop('login_required', False)
    login_required_page = session.pop('login_required_page', '')


    return render_template('user/sign_in.html',
                           msg=msg, msg_type=msg_type,
                           redirect_url=redirect_url, 
                           login_required=login_required_flag,
                           login_required_page=login_required_page)


# =========================
#  USER EDIT PROFILE ROUTE
# =========================
@app.route('/edit-profile')
def edit_profile():
    if not session.get('user_id'):
        session['login_required'] = True
        return redirect(url_for('user_login'))
    
    return render_template('user/edit_profile.html')

# =========================
#  USER REGISTRATION ROUTE
# =========================
@app.route('/registration', methods=['GET', 'POST'])
def registration():
    msg = ''
    msg_type = 'error'

    if request.method == 'POST':
        firstName = request.form.get('firstName', '').strip()
        lastName = request.form.get('lastName', '').strip()
        email = request.form.get('email', '').strip()
        username = request.form.get('username', '').strip()
        raw_password = request.form.get('password', '')

        name = f"{firstName} {lastName}".strip()

        password = generate_password_hash(raw_password)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        try:
            # ----- EMAIL uniqueness -----
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            existing_email = cursor.fetchone()
            if existing_email:
                return render_template(
                    'user/registration.html',
                    msg=msg,
                    msg_type=msg_type,
                    firstName=firstName,
                    lastName=lastName,
                    email=email,
                    username=username
                )

            # ----- USERNAME uniqueness -----
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            existing_username = cursor.fetchone()
            if existing_username:
                return render_template(
                    'user/registration.html',
                    msg=msg,
                    msg_type=msg_type,
                    firstName=firstName,
                    lastName=lastName,
                    email=email,
                    username=username
                )

            verification_code = generate_verification_code()
            expires_at = datetime.utcnow() + timedelta(minutes=15)

            cursor.execute(
                """
                INSERT INTO users
                    (name, email, password, username, is_verified)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (name, email, password, username, 0)
            )
            conn.commit()

            session['pending_email'] = email
            session['verification_code'] = verification_code
            session['verification_expires_at'] = expires_at.isoformat()

            verify_url = url_for('verify_account', _external=True)

            subject = "Verify your BookHaven account"

            html_body = render_template(
                'user/emails/verify_email_temp.html',
                first_name=firstName,
                verification_code=verification_code,
                verify_url=verify_url
            )

            msg_mail = Message(subject=subject, recipients=[email])
            msg_mail.html = html_body
            mail.send(msg_mail)

            return redirect(url_for('verify_account'))

        except mysql.connector.Error as err:
            if err.errno == 1062:
                err_msg = str(err.msg).lower()
                if "email" in err_msg:
                    msg = "This email is already registered. Please use a different email or login."
                elif "username" in err_msg:
                    msg = "This username is already taken."
                else:
                    msg = "Duplicate entry for email/username. Please use different credentials."
            else:
                msg = f"Database error: {err}"

            return render_template(
                'user/registration.html',
                msg=msg,
                msg_type=msg_type,
                firstName=firstName,
                lastName=lastName,
                email=email,
                username=username
            )

        finally:
            cursor.close()
            conn.close()

    return render_template('user/registration.html', msg=msg, msg_type=msg_type)

@app.route("/check_email")
def check_email():
    email = request.args.get("email", "").strip()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    exists = cursor.fetchone() is not None
    cursor.close()
    conn.close()
    return {"available": not exists}

@app.route("/check_username")
def check_username():
    username = request.args.get("username", "").strip()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
    exists = cursor.fetchone() is not None
    cursor.close()
    conn.close()
    return {"available": not exists}

# =========================
#  VERIFY ACCOUNT ROUTE
# =========================
@app.route('/verify', methods=['GET', 'POST'])
def verify_account():
    msg = session.pop('verify_msg', '')
    msg_type = session.pop('verify_msg_type', '')

    if msg and msg_type not in ("error", "success"):
        msg_type = "error"

    email = session.get('pending_email')
    code_in_session = session.get('verification_code')
    expires_at_str = session.get('verification_expires_at')

    if not email or not code_in_session or not expires_at_str:
        flash("No pending verification or your session has expired. Please register again.", "error")
        return redirect(url_for('registration'))

    try:
        expires_at = datetime.fromisoformat(expires_at_str)
    except Exception:
        expires_at = None

    if request.method == 'POST':
        code = request.form.get('code', '').strip()
        if not code:
            code = ''.join([
                request.form.get('code1', '').strip(),
                request.form.get('code2', '').strip(),
                request.form.get('code3', '').strip(),
                request.form.get('code4', '').strip(),
                request.form.get('code5', '').strip(),
                request.form.get('code6', '').strip(),
            ])

        if not code:
            session['verify_msg'] = "Please enter the verification code."
            session['verify_msg_type'] = "error"
            return redirect(url_for('verify_account'))

        if not expires_at or datetime.utcnow() > expires_at:
            session.clear()
            session['verify_msg'] = "Verification code has expired. Please register again."
            session['verify_msg_type'] = "error"
            return redirect(url_for('verify_account'))

        if code != str(code_in_session):
            session['verify_msg'] = "Invalid verification code. Please try again."
            session['verify_msg_type'] = "error"
            return redirect(url_for('verify_account'))

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("UPDATE users SET is_verified = 1 WHERE email = %s", (email,))
            conn.commit()
        finally:
            cursor.close()
            conn.close()

        session.pop('pending_email', None)
        session.pop('verification_code', None)
        session.pop('verification_expires_at', None)

        session['verify_success'] = True
        return redirect(url_for('verify_account'))

    verified_success = session.pop('verify_success', False)

    return render_template(
        'user/emails/email_verification.html',
        msg=msg,
        msg_type=msg_type,
        email=email,
        verified_success=verified_success
    )

# =========================
#  RESEND CODE ROUTE
# =========================
@app.route('/resend-code', methods=['POST'])
def resend_code():
    email = session.get('pending_email')

    if not email:
        flash("Your session has expired. Please register again.", "error")
        return redirect(url_for('registration'))

    new_code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    session['verification_code'] = new_code
    session['verification_expires_at'] = expires_at.isoformat()

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT name FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    first_name = (user["name"].split(" ")[0]) if user and user.get("name") else "Booklover"

    verify_url = url_for('verify_account', _external=True)
    subject = "Your New BookHaven Verification Code"
    html_body = render_template(
        'user/emails/verify_email_temp.html',
        first_name=first_name,
        verification_code=new_code,
        verify_url=verify_url
    )

    msg_mail = Message(subject=subject, recipients=[email])
    msg_mail.html = html_body
    mail.send(msg_mail)

    session['verify_msg'] = "A new verification code has been sent to your email."
    session['verify_msg_type'] = "success"

    return redirect(url_for('verify_account'))

# =========================
#  FORGOT PASSWORD ROUTE
# =========================
@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    msg = ''
    msg_type = 'error'

    if request.method == 'POST':
        email = request.form.get('email', '').strip()

        gmail_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@gmail\.com$')
        if not gmail_pattern.fullmatch(email):
            msg = "Email must be a valid @gmail.com address."
            msg_type = 'error'
            return render_template('user/forgot_password.html', msg=msg, msg_type=msg_type)

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        try:
            cursor.execute("SELECT id, name FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()

            if not user:
                msg = "No account found with that email."
                msg_type = 'error'
                return render_template('user/forgot_password.html', msg=msg, msg_type=msg_type)

            s = get_serializer()
            token = s.dumps(email, salt='password-reset-salt')
            reset_url = url_for('reset_password', token=token, _external=True)

            full_name = user.get('name') or ''
            first_name = full_name.split(' ')[0] if full_name else 'Booklover'

            subject = "Reset your BookHaven password"
            html_body = render_template(
                'user/emails/reset_pass_email.html',
                first_name=first_name,
                reset_url=reset_url
            )

            msg_mail = Message(subject=subject, recipients=[email])
            msg_mail.html = html_body
            mail.send(msg_mail)

            msg = "A password reset link has been sent on your email."
            msg_type = 'success'
            return render_template('user/forgot_password.html', msg=msg, msg_type=msg_type)

        finally:
            cursor.close()
            conn.close()

    return render_template('user/forgot_password.html', msg=msg, msg_type=msg_type)

@app.route('/forgot-password/check-email', methods=['POST'])
def forgot_password_check_email():
    email = request.form.get('email', '').strip()

    gmail_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@gmail\.com$')
    if not gmail_pattern.fullmatch(email):
        return {"valid": False, "reason": "invalid_format"}

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    exists = cursor.fetchone() is not None
    cursor.close()
    conn.close()

    if not exists:
        return {"valid": False, "reason": "not_found"}

    return {"valid": True}

# =========================
#  RESET PASSWORD ROUTE
# =========================
@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    msg = ''
    msg_type = 'error'

    s = get_serializer()

    try:
        email = s.loads(token, salt='password-reset-salt', max_age=3600)
    except SignatureExpired:
        msg = "This password reset link has expired. Please request a new one."
        return render_template('user/reset_password.html', msg=msg, msg_type=msg_type, token=None)
    except BadSignature:
        msg = "Invalid or corrupted password reset link."
        return render_template('user/reset_password.html', msg=msg, msg_type=msg_type, token=None)

    if request.method == 'POST':
        new_password = request.form.get('password', '')
        confirm_password = request.form.get('confirmPassword', '')

        pass_len_ok      = len(new_password) >= 8
        pass_has_lower   = re.search(r'[a-z]', new_password)
        pass_has_upper   = re.search(r'[A-Z]', new_password)
        pass_has_special = re.search(r'[^A-Za-z0-9]', new_password)

        if not new_password or not confirm_password:
            msg = "Please enter and confirm your new password."
        elif new_password != confirm_password:
            msg = "Passwords do not match."
        elif not (pass_len_ok and pass_has_lower and pass_has_upper and pass_has_special):
            msg = "Password must be at least 8 characters and include a lowercase letter, uppercase letter, and special character."
        else:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)

            try:
                hashed = generate_password_hash(new_password)
                cursor.execute(
                    "UPDATE users SET password = %s WHERE email = %s",
                    (hashed, email)
                )
                conn.commit()
            finally:
                cursor.close()
                conn.close()

            msg = "Your password has been successfully reset. You can now sign in with your new password."
            msg_type = 'success'
            return render_template('user/reset_password.html', msg=msg, msg_type=msg_type, token=None)

    return render_template('user/reset_password.html', msg=msg, msg_type=msg_type, token=token)


# =========================
#  STATIC PAGES
# =========================
@app.route('/about')
def about():
    return render_template('user/about.html')

@app.route('/contact')
def contact():
    return render_template('user/contact.html')

# =========================
#  SHOP BOOKS ROUTE
# =========================
@app.route('/shop-books')
def shop_books():
    user_id = session.get('user_id')

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM books ORDER BY id")
    books = cursor.fetchall()

    # ---- Build UNIQUE genre list (splitting comma-separated strings) ----
    genre_set = set()
    for b in books:
        if b["genre"]:
            parts = [g.strip() for g in b["genre"].split(",")]
            genre_set.update(parts)

    genres = sorted(genre_set)

    if user_id:
        cursor.execute("SELECT book_id FROM favorites WHERE user_id=%s", (user_id,))
        favorite_rows = cursor.fetchall()
        favorite_ids = {row['book_id'] for row in favorite_rows}
    else:
        favorite_ids = set()

    cursor.close()
    conn.close()

    return render_template(
        'user/shop_books.html',
        books=books,
        genres=genres,
        favorite_ids=favorite_ids
    )





# =========================
#  FAVORITES ROUTE
# =========================
@app.route('/favorites')
def favorites():
    if 'user_id' not in session:
        session['login_required'] = True
        session['login_required_page'] = "favorites"
        return redirect('/user-login')

    user_id = session['user_id']

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT b.*
        FROM favorites f
        JOIN books b ON f.book_id = b.id
        WHERE f.user_id = %s
        ORDER BY f.id DESC
    """, (user_id,))

    books = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template('user/favorites.html', books=books, active_page='favorites')

@app.route('/toggle_favorite/<int:book_id>', methods=['POST'])
def toggle_favorite(book_id):
    if 'user_id' not in session:
        return jsonify({"status": "not_logged_in"})

    user_id = session['user_id']
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Check if favorite exists
    cursor.execute("SELECT * FROM favorites WHERE user_id=%s AND book_id=%s", (user_id, book_id))
    existing = cursor.fetchone()

    if existing:
        # Remove favorite
        cursor.execute("DELETE FROM favorites WHERE user_id=%s AND book_id=%s", (user_id, book_id))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "removed"})
    else:
        # Add favorite
        cursor.execute("INSERT INTO favorites (user_id, book_id) VALUES (%s, %s)", (user_id, book_id))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "added"})

@app.route('/remove_favorite/<int:book_id>')
def remove_favorite(book_id):
    if 'user_id' not in session:
        return redirect('/login')

    user_id = session['user_id']

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM favorites WHERE user_id=%s AND book_id=%s", (user_id, book_id))
    conn.commit()
    cursor.close()
    conn.close()

    return redirect('/favorites')

@app.context_processor
def inject_favorite_count():
    user_id = session.get("user_id")

    if not user_id:
        return {"favorite_count": 0}

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT COUNT(*) AS count 
        FROM favorites 
        WHERE user_id = %s
    """, (user_id,))

    result = cursor.fetchone()
    cursor.close()
    conn.close()

    return {"favorite_count": result["count"]}

@app.route('/favorites/count')
def get_favorite_count():
    user_id = session.get("user_id")
    if not user_id:
        return {"count": 0}

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT COUNT(*) AS count FROM favorites WHERE user_id = %s", (user_id,))
    count = cursor.fetchone()["count"]
    cursor.close()
    conn.close()

    return {"count": count}

# =========================
#  CART SYSTEM ROUTES
# =========================
@app.route('/cart')
def cart():
    if 'user_id' not in session:
        session['login_required'] = True
        session['login_required_page'] = "cart"
        return redirect(url_for('user_login'))

    user_id = session['user_id']

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            c.id AS cart_id,
            c.quantity,
            b.id AS book_id,
            b.title,
            b.author,
            b.genre,
            b.price,
            b.cover,
            b.stock_quantity
        FROM cart c
        JOIN books b ON c.book_id = b.id
        WHERE c.user_id = %s
        ORDER BY c.added_at DESC
    """, (user_id,))
    items = cursor.fetchall()

    cursor.close()
    conn.close()

    total_items = sum(item['quantity'] for item in items)
    subtotal = sum(float(item['price']) * item['quantity'] for item in items)

    return render_template(
        'user/cart.html',
        items=items,
        total_items=total_items,
        subtotal=subtotal
    )

# Adding to cart
@app.route('/cart/add', methods=['POST'])
def add_to_cart():
    if 'user_id' not in session:
        return jsonify({"status": "not_logged_in"})

    user_id = session['user_id']
    username = session.get('user', '')

    data = request.get_json(silent=True) or {}
    book_id = data.get('book_id')
    quantity = data.get('quantity', 1)

    try:
        book_id = int(book_id)
        quantity = int(quantity)
        if quantity <= 0:
            quantity = 1
    except (TypeError, ValueError):
        return jsonify({"status": "invalid_data"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check book & stock
        cursor.execute("SELECT stock_quantity FROM books WHERE id = %s", (book_id,))
        book = cursor.fetchone()

        if not book:
            return jsonify({"status": "book_not_found"}), 404

        if book['stock_quantity'] <= 0:
            return jsonify({"status": "out_of_stock"})

        # Existing cart row?
        cursor.execute("""
            SELECT id, quantity
            FROM cart
            WHERE user_id = %s AND book_id = %s
        """, (user_id, book_id))
        existing = cursor.fetchone()

        if existing:
            if existing['quantity'] >= book['stock_quantity']:
                return jsonify({
                    "status": "max_reached",
                    "message": "Cannot add more. Only limited stock available.",
                    "quantity": existing['quantity']
                })

            new_qty = existing['quantity'] + quantity

            if new_qty > book['stock_quantity']:
                new_qty = book['stock_quantity']

            cursor.execute("""
                UPDATE cart
                SET quantity = %s
                WHERE id = %s
            """, (new_qty, existing['id']))

            conn.commit()

            return jsonify({
                "status": "updated",
                "quantity": new_qty
            })

        else:
            cursor.execute("""
                INSERT INTO cart (user_id, username, book_id, quantity)
                VALUES (%s, %s, %s, %s)
            """, (user_id, username, book_id, quantity))
            action = "added"
            final_qty = quantity

        conn.commit()
        return jsonify({
            "status": "ok",
            "action": action,
            "quantity": final_qty
        })

    except Exception as e:
        conn.rollback()
        print("Error adding to cart:", e)
        return jsonify({"status": "error"}), 500
    finally:
        cursor.close()
        conn.close()

# Deleting book from cart
@app.route('/cart/remove/<int:cart_id>', methods=['POST'])
def remove_from_cart(cart_id):
    if 'user_id' not in session:
        session['login_required'] = True
        return redirect(url_for('user_login'))

    user_id = session['user_id']

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cart WHERE id = %s AND user_id = %s",
                   (cart_id, user_id))
    conn.commit()
    cursor.close()
    conn.close()

    return redirect(url_for('cart'))

# Cart count for header
@app.context_processor
def inject_cart_count():
    user_id = session.get("user_id")

    if not user_id:
        return {"cart_count": 0}

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT COUNT(*) AS count
        FROM cart
        WHERE user_id = %s
    """, (user_id,))

    result = cursor.fetchone()
    cursor.close()
    conn.close()

    return {"cart_count": result["count"]}


@app.route('/cart/count')
def get_cart_count():
    """Total quantity of items for a badge."""
    user_id = session.get("user_id")
    if not user_id:
        return {"count": 0}

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT COUNT(*) AS count
        FROM cart
        WHERE user_id = %s
    """, (user_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()

    return {"count": result["count"] if result else 0}


# Quantity update saving
@app.route('/cart/update-qty', methods=['POST'])
def update_cart_qty():
    if 'user_id' not in session:
        return jsonify({"status": "not_logged_in"})

    data = request.get_json()
    cart_id = data.get("cart_id")
    new_qty = data.get("quantity")

    try:
        new_qty = int(new_qty)
        if new_qty < 1:
            new_qty = 1
    except:
        return jsonify({"status": "invalid_quantity"})

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        UPDATE cart 
        SET quantity = %s
        WHERE id = %s AND user_id = %s
    """, (new_qty, cart_id, session["user_id"]))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"status": "updated", "quantity": new_qty})



# =========================
#  DELIVERY CHECKOUT BOOK ROUTE
# =========================
@app.route('/checkout', methods=['GET', 'POST'])
def checkout():
    if 'user_id' not in session:
        session['login_required'] = True
        return redirect(url_for('user_login'))

    user_id = session['user_id']

    # -------------- POST: user clicked "Proceed to Checkout" --------------
    if request.method == 'POST':
        selected_items_raw = request.form.get("selected_items", "[]")

        try:
            selected_items = json.loads(selected_items_raw)
        except:
            selected_items = []

        if not selected_items:
            return redirect(url_for('cart'))

        session['checkout_selected'] = selected_items

        return redirect(url_for('checkout'))

    selected_items = session.get('checkout_selected')

    if not selected_items:
        return redirect(url_for('cart'))

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # FETCH USER INFORMATION TO AUTO-FILL CHECKOUT FORM
    cursor.execute("SELECT name, email FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    user_name = user["name"] if user else ""
    user_email = user["email"] if user else ""

    # FETCH CHECKOUT ITEMS
    placeholders = ",".join(["%s"] * len(selected_items))
    query = f"""
        SELECT 
            c.id AS cart_id,
            c.quantity,
            b.id AS book_id,
            b.title,
            b.author,
            b.genre,
            b.price,
            b.cover,
            b.stock_quantity
        FROM cart c
        JOIN books b ON c.book_id = b.id
        WHERE c.user_id = %s AND c.id IN ({placeholders})
    """

    cursor.execute(query, [user_id] + selected_items)
    items = cursor.fetchall()

    cursor.close()
    conn.close()

    # Compute totals
    subtotal = sum(float(item["price"]) * item["quantity"] for item in items)
    total_books = len(items)

    return render_template(
        'user/delivery_checkout.html',
        items=items,
        subtotal=subtotal,
        total_books=total_books,
        user_name=user_name,
        user_email=user_email
    )


# =========================
#  PLACE ORDER ROUTE
# =========================
def generate_order_code():
    prefix = "BH"
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"{prefix}-{random_part}"


@app.route('/place-order', methods=['POST'])
def place_order():
    if 'user_id' not in session:
        return redirect(url_for('user_login'))

    user_id = session['user_id']
    selected_items = session.get('checkout_selected')

    if not selected_items:
        return redirect(url_for('cart'))

    payment_method = request.form.get("payment_method")
    address = request.form.get("address")

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Fetch selected cart items
    placeholders = ",".join(["%s"] * len(selected_items))
    query = f"""
        SELECT 
            c.id AS cart_id,
            c.quantity,
            b.id AS book_id,
            b.title,
            b.author,
            b.genre,
            b.price,
            b.cover
        FROM cart c
        JOIN books b ON c.book_id = b.id
        WHERE c.user_id = %s AND c.id IN ({placeholders})
    """

    cursor.execute(query, [user_id] + selected_items)
    items = cursor.fetchall()

    # Compute total
    total = sum(float(item["price"]) * item["quantity"] for item in items)

    # Generate unique public order code
    order_code = generate_order_code()

    cursor.execute("""
        INSERT INTO orders (user_id, address, payment_method, total, status, order_code)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (user_id, address, payment_method, total, "Order Placed", order_code))

    conn.commit()
    order_id = cursor.lastrowid

    # Insert order items
    for item in items:
        line_total = float(item["price"]) * item["quantity"]

        cursor.execute("""
            INSERT INTO order_items (order_id, book_id, quantity, price, 
                                     line_total, title, cover, author, genre)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            order_id, item["book_id"], item["quantity"], item["price"],
            line_total, item["title"], item["cover"], item["author"], item["genre"]
        ))

        # Deduct stock
        cursor.execute("""
            UPDATE books SET stock_quantity = stock_quantity - %s
            WHERE id = %s
        """, (item["quantity"], item["book_id"]))

        # Remove from cart
        cursor.execute("DELETE FROM cart WHERE id = %s", (item["cart_id"],))

    conn.commit()

    cursor.close()
    conn.close()

    session.pop("checkout_selected", None)

    return redirect(url_for("orders"))



# =========================
#  ORDERS ROUTE
# =========================
STATUS_ICONS = {
    "Order Placed": "fa-solid fa-receipt",
    "Order Paid": "fa-solid fa-circle-dollar-to-slot",
    "Order Shipped Out": "fa-regular fa-truck",
    "Order Received": "fa-solid fa-box-open",
    "Order Canceled": "fa-solid fa-ban"
}

@app.route('/orders-page')
def orders():
    if 'user_id' not in session:
        return redirect(url_for('user_login'))

    user_id = session['user_id']

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            id AS order_id,
            order_code,
            user_id,
            address,
            payment_method,
            status,
            total,
            created_at
        FROM orders 
        WHERE user_id = %s
        ORDER BY created_at DESC
    """, (user_id,))

    orders = cursor.fetchall()

    # Fetch each order’s items
    for order in orders:
        cursor.execute("""
            SELECT 
                book_id,
                title,
                author,
                genre,
                cover,
                quantity,
                price,
                line_total
            FROM order_items
            WHERE order_id = %s
        """, (order["order_id"],))
        
        order["order_items"] = cursor.fetchall()
        order["status_icon"] = STATUS_ICONS.get(order["status"], "fa-solid fa-circle-info")

    cursor.close()
    conn.close()

    return render_template("user/orders_page.html", orders=orders)


@app.route('/order/<int:order_id>')
def order_details(order_id):
    if 'user_id' not in session:
        return redirect(url_for('user_login'))

    user_id = session['user_id']

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Fetch order
    cursor.execute("""
        SELECT *
        FROM orders
        WHERE id = %s AND user_id = %s
    """, (order_id, user_id))

    order = cursor.fetchone()

    if not order:
        return "Order not found", 404

    # Fetch order items
    cursor.execute("""
        SELECT *
        FROM order_items
        WHERE order_id = %s
    """, (order_id,))
    
    order_items = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template("user/order_details.html", order=order, items=order_items)

# =========================
#  ADMIN PANEL
# =========================
@app.route('/admin-dashboard')
def admin_dashboard():
    return render_template('admin/sidebar.html')

# =========================
#  MANAGE BOOKS ROUTE
# =========================
@app.route('/admin/manage-books')
def manage_books():
    if 'admin' not in session:
        return redirect('/user-login')

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM books ORDER BY id")
    books = cursor.fetchall()

    # ---- Build UNIQUE GENRE LIST for Admin Filters ----
    genre_set = set()
    for b in books:
        if b["genre"]:
            parts = [g.strip() for g in b["genre"].split(",")]
            genre_set.update(parts)

    genres = sorted(genre_set)

    cursor.close()
    conn.close()

    return render_template(
        'admin/manage_books.html',
        books=books,
        genres=genres,
        active_page='manage_books'
    )


# =========================
#  EDIT BOOK ROUTE
# =========================
@app.route('/admin/edit-book/<int:book_id>')
def edit_book(book_id):
    if 'admin' not in session:
        return redirect('/admin-login')

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM books WHERE id = %s", (book_id,))
    book = cursor.fetchone()
    cursor.close()
    conn.close()

    if not book:
        return "Book not found", 404

    return render_template('admin/edit_book.html', book=book)

# EDITED DETAILS UPDATE IN DATBASE
@app.route('/update_book', methods=['POST'])
def update_book():
    if 'admin' not in session:
        return redirect('/admin-login')

    book_id = request.form['id']
    title = request.form['title']
    author = request.form['author']
    isbn = request.form['isbn']
    raw_genres = request.form.get("genre", "[]")
    genres_list = [g["value"] for g in json.loads(raw_genres)]
    genre = ", ".join(genres_list)
    description = request.form['description']
    price = float(request.form['price'])
    stock_quantity = int(request.form['stock_quantity'])
    cover_file = request.files.get('cover')

    status = "Available" if stock_quantity > 0 else "Not Available"

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Get old cover
    cursor.execute("SELECT cover FROM books WHERE id = %s", (book_id,))
    old_cover = cursor.fetchone()['cover']

    # Debug → verify file is detected
    print("FILE RECEIVED:", cover_file.filename if cover_file else "NO FILE")

    # New cover uploaded
    if cover_file and cover_file.filename:
        filename = secure_filename(cover_file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        cover_file.save(save_path)

        # OPTIONAL: delete old file
        if old_cover:
            old_path = os.path.join(app.config['UPLOAD_FOLDER'], old_cover)
            if os.path.exists(old_path):
                os.remove(old_path)

        cursor.execute("""
            UPDATE books 
            SET title=%s, author=%s, isbn=%s, genre=%s, description=%s, price=%s,
                stock_quantity=%s, cover=%s, status=%s
            WHERE id=%s
        """, (title, author, isbn, genre, description, price,
              stock_quantity, filename, status, book_id))

    # No new cover
    else:
        cursor.execute("""
            UPDATE books 
            SET title=%s, author=%s, isbn=%s, genre=%s, description=%s, price=%s,
                stock_quantity=%s, status=%s
            WHERE id=%s
        """, (title, author, isbn, genre, description, price,
              stock_quantity, status, book_id))

    conn.commit()
    cursor.close()
    conn.close()

    return redirect('/admin/manage-books')

# =========================
#  DELETE BOOK ROUTE
# =========================
@app.route('/admin/delete-book/<int:book_id>')
def delete_book(book_id):
    if 'admin' not in session:
        return redirect('/admin-login')

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Fetch the book to delete (needed to remove image file)
    cursor.execute("SELECT cover FROM books WHERE id = %s", (book_id,))
    book = cursor.fetchone()

    if not book:
        cursor.close()
        conn.close()
        return "Book not found", 404

    # Delete book from database
    cursor.execute("DELETE FROM books WHERE id = %s", (book_id,))
    conn.commit()

    # Remove image file if exists
    if book['cover']:
        cover_path = os.path.join(app.config['UPLOAD_FOLDER'], book['cover'])
        if os.path.exists(cover_path):
            os.remove(cover_path)

    cursor.close()
    conn.close()

    return redirect(url_for('manage_books'))


# =========================
#  ADD BOOK ROUTE
# =========================
@app.route('/admin/add-book', methods=['GET', 'POST'])
def add_book():
    if 'admin' not in session:
        return redirect('/admin-login')

    # Show form
    if request.method == 'GET':
        return render_template('admin/add_book.html', active_page='add_books')

    # Handle form submission
    title = request.form['title']
    author = request.form['author']
    isbn = request.form['isbn']
    raw_genres = request.form.get("genre", "[]")
    genres_list = [g["value"] for g in json.loads(raw_genres)]
    genre = ", ".join(genres_list)
    description = request.form['description']
    price = float(request.form['price'])
    stock_quantity = int(request.form['stock_quantity'])
    cover_file = request.files.get('cover')

    status = "Available" if stock_quantity > 0 else "Not Available"

    # Save uploaded cover
    cover_filename = None
    if cover_file and cover_file.filename:
        cover_filename = secure_filename(cover_file.filename)
        cover_path = os.path.join(app.config['UPLOAD_FOLDER'], cover_filename)
        cover_file.save(cover_path)

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO books (title, author, isbn, genre, description, price,
                        stock_quantity, cover, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (title, author, isbn, genre, description, price,
        stock_quantity, cover_filename, status))

    conn.commit()
    cursor.close()
    conn.close()

    return redirect(url_for('manage_books'))


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('home'))


if __name__ == '__main__':
    app.run(debug=True)