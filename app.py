from flask import (
    Flask, render_template, request, redirect,
    url_for, session, flash
)
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from flask_mail import Mail, Message
from werkzeug.security import generate_password_hash
from werkzeug.security import check_password_hash
import mysql.connector
from flask_mysqldb import MySQL
from flask import jsonify
import mysql.connector
import re
import string
import secrets
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = 'JRM0218@'

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'thebookhaven.online@gmail.com'      # your email
app.config['MAIL_PASSWORD'] = 'omhqtujoigtbrhji'   # app password
app.config['MAIL_DEFAULT_SENDER'] = 'thebookhaven.online@gmail.com'

mail = Mail(app)

def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="VA2L8RDQ!",
        database="bhbookstore_db"
    )

def generate_verification_code(length: int = 6) -> str:
    digits = string.digits
    return ''.join(secrets.choice(digits) for _ in range(length))

def get_serializer():
    return URLSafeTimedSerializer(app.config['SECRET_KEY'])

@app.route('/')
def home():
    return render_template('landing_page.html')

@app.route('/user-index')
def user_index():
    return render_template('user/index.html')


# =========================
#  USER LOGIN ROUTE
# =========================
@app.route('/user-login', methods=['GET', 'POST'])
def user_login():
    # use session to pass message across redirect
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            # fetch by username OR email (only fetch user record, no password check in SQL)
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

        # Try hashed password first (recommended). If check_password_hash returns False,
        # fall back to plain-text compare (useful for legacy DBs).
        password_ok = False
        try:
            if stored_pw and check_password_hash(stored_pw, password):
                password_ok = True
        except Exception:
            # if stored_pw isn't a valid hash format, check_password_hash may raise; ignore and fallback
            password_ok = False

        if not password_ok:
            # fallback: direct compare (avoid if you have hashed passwords)
            if stored_pw == password:
                password_ok = True

        if password_ok:
            # login success: set session and redirect to home
            session['user'] = user['username']
            session['user_id'] = user['id']
            session['msg_type'] = "success"
            # redirect back to the login page so we can show the SweetAlert and then JS will redirect to '/'
            return redirect(url_for('user_login'))
        else:
            session['login_msg'] = "Incorrect password."
            session['msg_type'] = "error"
            return redirect(url_for('user_login'))

    # GET: pop the message (POST->redirect->GET pattern)
    msg = session.pop('login_msg', '')
    msg_type = session.pop('msg_type', '')
    return render_template('user/sign_in.html', msg=msg, msg_type=msg_type)


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

            # ====== create verification code (stored in session, not DB) ======
            verification_code = generate_verification_code()
            expires_at = datetime.utcnow() + timedelta(minutes=15)

            # Insert user as NOT verified yet
            cursor.execute(
                """
                INSERT INTO users
                    (name, email, password, username, is_verified)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (name, email, password, username, 0)
            )
            conn.commit()

            # Store code & expiry in session
            session['pending_email'] = email
            session['verification_code'] = verification_code
            session['verification_expires_at'] = expires_at.isoformat()

            # Build verification URL (if you want a clickable link)
            verify_url = url_for('verify_account', _external=True)

            # ----- send BookHaven-styled HTML verification email -----
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
            # 1062 = duplicate entry (from UNIQUE index)
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

    # GET request → show empty form
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
    # Pull any messages left in session by prior POSTs (PRG)
    # Pull messages from session
    msg = session.pop('verify_msg', '')
    msg_type = session.pop('verify_msg_type', '')

    # Enforce valid message type
    if msg and msg_type not in ("error", "success"):
        msg_type = "error"

    email = session.get('pending_email')
    code_in_session = session.get('verification_code')
    expires_at_str = session.get('verification_expires_at')

    if not email or not code_in_session or not expires_at_str:
        # No pending verification — force re-register (or show flash)
        flash("No pending verification or your session has expired. Please register again.", "error")
        return redirect(url_for('registration'))

    try:
        expires_at = datetime.fromisoformat(expires_at_str)
    except Exception:
        expires_at = None

    if request.method == 'POST':
        # Build code from six inputs (or single)
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

        # Validation
        if not code:
            # set session message and redirect (PRG) so refresh won't resubmit
            session['verify_msg'] = "Please enter the verification code."
            session['verify_msg_type'] = "error"
            return redirect(url_for('verify_account'))

        if not expires_at or datetime.utcnow() > expires_at:
            # expired: clear pending and ask to register again
            session.clear()
            session['verify_msg'] = "Verification code has expired. Please register again."
            session['verify_msg_type'] = "error"
            return redirect(url_for('verify_account'))

        if code != str(code_in_session):
            # wrong code -> show error via session and redirect back to GET
            session['verify_msg'] = "Invalid verification code. Please try again."
            session['verify_msg_type'] = "error"
            return redirect(url_for('verify_account'))

        # Success -> update DB
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("UPDATE users SET is_verified = 1 WHERE email = %s", (email,))
            conn.commit()
        finally:
            cursor.close()
            conn.close()

        # Clean up session but keep a success flag for showing the success modal
        session.pop('pending_email', None)
        session.pop('verification_code', None)
        session.pop('verification_expires_at', None)

        session['verify_success'] = True
        return redirect(url_for('verify_account'))

    # --- GET request: check for success flag or session message and render ---
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
        # session expired or no pending registration
        # use flash and redirect to registration page
        flash("Your session has expired. Please register again.", "error")
        return redirect(url_for('registration'))

    # Generate new code and update session expiry
    new_code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    session['verification_code'] = new_code
    session['verification_expires_at'] = expires_at.isoformat()

    # Get user's first name from DB (if available)
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT name FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

    first_name = (user["name"].split(" ")[0]) if user and user.get("name") else "Booklover"

    # Send verification email
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

    # Use session to pass message to the GET page, then redirect (PRG)
    session['verify_msg'] = "A new verification code has been sent to your email."
    session['verify_msg_type'] = "success"

    return redirect(url_for('verify_account'))


# =========================
#  RESET PASSWORD ROUTE
# =========================
@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    msg = ''
    msg_type = 'error'

    s = get_serializer()

    try:
        # max_age in seconds → e.g. 3600 = 1 hour
        email = s.loads(token, salt='password-reset-salt', max_age=3600)
    except SignatureExpired:
        msg = "This password reset link has expired. Please request a new one."
        return render_template('user/reset_password.html', msg=msg, msg_type=msg_type, token=None)
    except BadSignature:
        msg = "Invalid or corrupted password reset link."
        return render_template('user/reset_password.html', msg=msg, msg_type=msg_type, token=None)

    # Now we have a valid email from the token
    if request.method == 'POST':
        new_password = request.form.get('password', '')
        confirm_password = request.form.get('confirmPassword', '')

        # ----- password validation (same rules as registration) -----
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
            # All good → update password in DB
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

    # GET → show reset form
    return render_template('user/reset_password.html', msg=msg, msg_type=msg_type, token=token)


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

            # ===== USER EXISTS → SEND RESET EMAIL HERE =====
            # Build reset link token etc. (assuming you already have this logic)
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

    # GET
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

@app.route('/about')
def about():
    return render_template('user/about.html')

@app.route('/contact')
def contact():
    return render_template('user/contact.html')

@app.route('/books')
def books():
    return render_template('user/shop_books.html')

@app.route('/favorites')
def favorites():
    return render_template('user/favorites.html')

@app.route('/cart')
def cart():
    return render_template('user/cart.html')

@app.route('/checkout')
def checkout():
    return render_template('user/delivery_checkout.html')

@app.route('/admin-login')
def admin_login():
    return render_template('admin/sidebar.html')

@app.route('/manage-books')
def manage_books():
    return render_template('admin/manage_books.html')

@app.route('/add-books')
def add_books():
    return render_template('admin/add_books.html')

@app.route('/logout')
def logout():
    return redirect(url_for('home'))

if __name__ == '__main__':
    app.run(debug=True)
