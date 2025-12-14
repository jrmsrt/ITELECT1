from flask import (
    Flask, render_template, request, redirect,
    url_for, session, flash
)
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from flask_mail import Mail, Message
from werkzeug.security import generate_password_hash, check_password_hash
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
from datetime import date, datetime, timedelta

app = Flask(__name__)
app.secret_key = 'JRM0218@'

# =========================
# UPLOAD FOLDER
# =========================
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

app.config['ANNOUNCEMENT_FOLDER'] = os.path.join(app.root_path, 'static/uploads/announcements')
app.config['ANNOUNCEMENT_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads', 'announcements')
os.makedirs(app.config['ANNOUNCEMENT_FOLDER'], exist_ok=True)

app.config['BOOKS_FOLDER'] = os.path.join(app.root_path, 'static/uploads/books')
app.config['BOOKS_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads', 'books')
os.makedirs(app.config['BOOKS_FOLDER'], exist_ok=True)

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

    cursor.execute("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 10")
    announcements = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template('user/index.html', featured_books=featured_books, announcements=announcements)

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
                session['admin_login_success'] = True
                return redirect(url_for('admin_dashboard'))
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
                session['login_success'] = True
                session['login_success_message'] = f"Welcome back, {user['username']}!"
                return redirect('/')

            else:
                session['login_msg'] = "Incorrect password."
                session['msg_type'] = "error"
                return redirect(url_for('user_login'))

    msg = session.pop('login_msg', '')
    msg_type = session.pop('msg_type', '')
    redirect_url = session.pop('redirect_url', '/')
    login_required_flag = session.pop('login_required', False)
    login_required_page = session.pop('login_required_page', '')
    login_toast = session.pop('login_toast', None)

    return render_template('user/sign_in.html',
                           msg=msg, msg_type=msg_type,
                           redirect_url=redirect_url, 
                           login_required=login_required_flag,
                           login_required_page=login_required_page,
                           login_toast=login_toast)


# =========================
#  USER EDIT PROFILE ROUTE
# =========================
@app.route('/edit-profile', methods=['GET', 'POST'])
def edit_profile():
    if not session.get('user_id'):
        session['login_required'] = True
        return redirect(url_for('user_login'))

    user_id = session['user_id']

    if request.method == 'POST':
        # -------------------------
        # GET & SANITIZE INPUTS
        # -------------------------
        username   = request.form.get('username', '').strip()
        name       = request.form.get('name', '').strip()
        email      = request.form.get('email', '').strip()
        phone      = request.form.get('phone', '').strip()
        gender     = request.form.get('gender')
        dob_month  = request.form.get('dob_month')
        dob_day    = request.form.get('dob_day')
        dob_year   = request.form.get('dob_year')

        # -------------------------
        # REQUIRED FIELD CHECKS
        # -------------------------
        if not all([username, name, email, phone, gender, dob_month, dob_day, dob_year]):
            return jsonify({
                "ok": False,
                "error": "All fields are required."
            }), 400

        # -------------------------
        # FORMAT VALIDATION
        # -------------------------
        if not (6 <= len(username) <= 15):
            return jsonify({
                "ok": False,
                "error": "Username must be 6–15 characters long."
            }), 400

        name_pattern = r'^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)(?:[ -][A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*$'
        if not re.match(name_pattern, name):
            return jsonify({
                "ok": False,
                "error": "Invalid name format."
            }), 400

        if not re.match(r'^[a-zA-Z0-9._%+-]+@gmail\.com$', email):
            return jsonify({
                "ok": False,
                "error": "Email must be a valid @gmail.com address."
            }), 400

        if not re.match(r'^09\d{2} \d{3} \d{4}$', phone):
            return jsonify({
                "ok": False,
                "error": "Phone number must be in the format 09XX XXX XXXX."
            }), 400

        if gender not in ('male', 'female', 'other'):
            return jsonify({
                "ok": False,
                "error": "Invalid gender selection."
            }), 400

        # -------------------------
        # DOB VALIDATION
        # -------------------------
        try:
            dob = date(int(dob_year), int(dob_month), int(dob_day))
        except ValueError:
            return jsonify({
                "ok": False,
                "error": "Invalid date of birth."
            }), 400

        # age restriction (16+)
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if age < 16:
            return jsonify({
                "ok": False,
                "error": "You must be at least 16 years old."
            }), 400

        # -------------------------
        # DATABASE VALIDATION
        # -------------------------
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        try:
            # Email uniqueness (exclude current user)
            cursor.execute(
                "SELECT id FROM users WHERE email=%s AND id<>%s",
                (email, user_id)
            )
            if cursor.fetchone():
                return jsonify({
                    "ok": False,
                    "error": "Email is already used."
                }), 400

            # Username uniqueness (exclude current user)
            cursor.execute(
                "SELECT id FROM users WHERE username=%s AND id<>%s",
                (username, user_id)
            )
            if cursor.fetchone():
                return jsonify({
                    "ok": False,
                    "error": "Username is already taken."
                }), 400

            # -------------------------
            # UPDATE USER
            # -------------------------
            cursor.execute("""
                UPDATE users
                SET
                    username = %s,
                    name     = %s,
                    email    = %s,
                    phone    = %s,
                    gender   = %s,
                    dob      = %s
                WHERE id = %s
            """, (username, name, email, phone, gender, dob, user_id))

            conn.commit()

            return jsonify({"ok": True})

        finally:
            cursor.close()
            conn.close()

    # -------------------------
    # GET REQUEST
    # -------------------------
    return render_template('user/edit_profile.html')


# edit-specific check routes
@app.route('/check_username_edit')
def check_username_edit():
    if not session.get('user_id'):
        return jsonify({"available": False})

    username = request.args.get('username', '').strip()
    user_id = session['user_id']

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT id FROM users WHERE username=%s AND id<>%s",
        (username, user_id)
    )
    exists = cursor.fetchone()

    cursor.close()
    conn.close()

    return jsonify({"available": not bool(exists)})


@app.route('/check_email_edit')
def check_email_edit():
    if not session.get('user_id'):
        return jsonify({"available": False})

    email = request.args.get('email', '').strip()
    user_id = session['user_id']

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT id FROM users WHERE email=%s AND id<>%s",
        (email, user_id)
    )
    exists = cursor.fetchone()

    cursor.close()
    conn.close()

    return jsonify({"available": not bool(exists)})


# Autofill User Data
@app.route('/api/user/profile', methods=['GET'])
def api_user_profile():
    if not session.get('user_id'):
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    user_id = session['user_id']
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id, username, name, email, phone, gender, dob, profile_image
            FROM users
            WHERE id=%s
        """, (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"ok": False, "error": "User not found"}), 404

        # Convert dob to ISO string if exists
        if user.get("dob"):
            user["dob"] = user["dob"].isoformat()

        return jsonify({"ok": True, "user": user})
    finally:
        cursor.close()
        conn.close()


# Uploading profile picture
@app.route('/api/user/profile-picture', methods=['POST'])
def api_upload_profile_picture():
    if not session.get('user_id'):
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    # --- Profile image only rules ---
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
    MAX_FILE_SIZE = 1 * 1024 * 1024  # 1 MB

    def allowed_file(filename: str) -> bool:
        return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

    if 'image' not in request.files:
        return jsonify({"ok": False, "error": "No file provided"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"ok": False, "error": "No selected file"}), 400

    # ---- size check ----
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        return jsonify({"ok": False, "error": "Max file size is 1 MB"}), 400

    # ---- extension check ----
    if not allowed_file(file.filename):
        return jsonify({"ok": False, "error": "Only JPG and PNG allowed"}), 400

    user_id = session['user_id']

    # Where avatars live on disk
    avatar_dir = os.path.join(app.static_folder, "uploads", "avatars")
    os.makedirs(avatar_dir, exist_ok=True)

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # 1) Get current avatar path from DB
        cursor.execute("SELECT profile_image FROM users WHERE id=%s", (user_id,))
        row = cursor.fetchone()
        old_rel = (row.get("profile_image") if row else None)  # e.g. "uploads/avatars/user_1.jpg"

        # 2) Save new file with deterministic name (can change ext)
        original = secure_filename(file.filename)
        ext = original.rsplit(".", 1)[1].lower()
        new_filename = f"user_{user_id}.{ext}"
        new_abs = os.path.join(avatar_dir, new_filename)

        file.save(new_abs)

        new_rel = f"uploads/avatars/{new_filename}"

        # 3) Update DB first (so user always ends with a valid image)
        cursor.execute("UPDATE users SET profile_image=%s WHERE id=%s", (new_rel, user_id))
        conn.commit()

        # 4) Delete old file (only if it exists and is in avatars folder and is not the same file)
        if old_rel and old_rel.startswith("uploads/avatars/"):
            old_abs = os.path.join(app.static_folder, old_rel)

            # Safety: ensure path is inside avatar_dir
            old_abs_real = os.path.realpath(old_abs)
            avatar_dir_real = os.path.realpath(avatar_dir)

            if old_abs_real.startswith(avatar_dir_real + os.sep):
                # Don't delete the newly saved file (overwrite case or same ext)
                if os.path.realpath(new_abs) != old_abs_real and os.path.isfile(old_abs_real):
                    try:
                        os.remove(old_abs_real)
                    except OSError:
                        # If delete fails, don't break the upload
                        pass

        return jsonify({
            "ok": True,
            "image_url": url_for('static', filename=new_rel)
        })

    finally:
        cursor.close()
        conn.close()


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

        session['login_toast'] = "verified"
        return redirect(url_for('user_login'))

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

    total_items = len(items)
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
                # Prevent more than 10 in cart
            if existing['quantity'] >= 10:
                return jsonify({
                    "status": "max_reached",
                    "message": "Maximum of 10 per item allowed.",
                    "quantity": existing['quantity']
                })  


            if existing['quantity'] >= book['stock_quantity']:
                return jsonify({
                    "status": "max_reached",
                    "message": "Cannot add more. Only limited stock available.",
                    "quantity": existing['quantity']
                })

            new_qty = existing['quantity'] + quantity
            if new_qty > 10:
                new_qty = 10


            if new_qty > book['stock_quantity']:
                new_qty = book['stock_quantity']

            cursor.execute("""
                UPDATE cart
                SET quantity = %s
                WHERE id = %s
            """, (new_qty, existing['id']))

            conn.commit()

            return jsonify({
                "status": "ok",
                "action": "updated",
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
#  CHECKOUT DECISION ROUTE
# =========================
@app.route('/checkout', methods=['POST'])
def checkout():
    if 'user_id' not in session:
        return redirect(url_for('user_login'))

    selected_items_raw = request.form.get("selected_items", "[]")
    raw_fulfillment = request.form.get("fulfillment_method")

    try:
        selected_items = json.loads(selected_items_raw)
    except:
        selected_items = []

    if not selected_items:
        return redirect(url_for('cart'))
    
    FULFILLMENT_MAP = {
        "delivery": "Delivery",
        "pickup": "Pick-up",
        "Delivery": "Delivery",
        "Pick-up": "Pick-up"
    }

    fulfillment = FULFILLMENT_MAP.get(raw_fulfillment)

    if not fulfillment:
        return "Invalid fulfillment method", 400

    session['checkout_selected'] = selected_items
    session['fulfillment_method'] = fulfillment

    if fulfillment == "Delivery":
        return redirect(url_for('checkout_delivery'))
    else:
        return redirect(url_for('checkout_pickup'))


def load_checkout_data(user_id, selected_items):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # USER INFO
    cursor.execute(
        "SELECT name, email, phone FROM users WHERE id = %s",
        (user_id,)
    )
    user = cursor.fetchone()

    # SAVED ADDRESSES
    cursor.execute("""
        SELECT id, full_name, phone, address, is_default
        FROM user_addresses
        WHERE user_id = %s
        ORDER BY is_default DESC, id DESC
    """, (user_id,))
    saved_addresses = cursor.fetchall()

    # CART ITEMS
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

    subtotal = sum(float(item["price"]) * item["quantity"] for item in items)

    return {
        "items": items,
        "subtotal": subtotal,
        "total_books": len(items),
        "user_name": user["name"] if user else "",
        "user_email": user["email"] if user else "",
        "user_phone": user["phone"] if user else "",
        "saved_addresses": saved_addresses
    }


# =========================
#  DELIVERY CHECKOUT ROUTE
# =========================
@app.route('/checkout/delivery', methods=['GET'])
def checkout_delivery():
    if 'user_id' not in session:
        return redirect(url_for('user_login'))

    selected_items = session.get('checkout_selected')
    if not selected_items:
        return redirect(url_for('cart'))

    data = load_checkout_data(session['user_id'], selected_items)

    return render_template(
        'user/checkout_delivery.html',
        **data
    )


# =========================
#  PICKUP CHECKOUT ROUTE
# =========================
@app.route('/checkout/pickup', methods=['GET'])
def checkout_pickup():
    if 'user_id' not in session:
        return redirect(url_for('user_login'))

    selected_items = session.get('checkout_selected')
    if not selected_items:
        return redirect(url_for('cart'))

    data = load_checkout_data(session['user_id'], selected_items)

    return render_template(
        'user/checkout_pickup.html',
        **data
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

    # ==========================================================
    # [ADDED] Get fulfillment_method chosen from cart checkout flow
    # ==========================================================
    raw_fulfillment = session.get("fulfillment_method") or request.form.get("fulfillment_method")

    # Normalize old + new values
    FULFILLMENT_MAP = {
        "delivery": "Delivery",
        "pickup": "Pick-up",
        "Delivery": "Delivery",
        "Pick-up": "Pick-up"
    }

    fulfillment_method = FULFILLMENT_MAP.get(raw_fulfillment)

    if not fulfillment_method:
        return "Invalid fulfillment method", 400

    # Capture full name + phone for storing in orders table
    full_name = request.form.get("fullName")
    raw_phone = request.form.get("phone", "").strip()
    phone = raw_phone[1:] if raw_phone.startswith("0") else raw_phone

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    final_address = None

    if fulfillment_method == "Delivery":
        cursor.execute("SELECT COUNT(*) AS cnt FROM user_addresses WHERE user_id = %s", (user_id,))
        addr_count = cursor.fetchone()["cnt"]

        if addr_count > 0:
            selected_address_id = request.form.get("selected_address")

            cursor.execute("""
                SELECT full_name, phone, address
                FROM user_addresses
                WHERE id = %s AND user_id = %s
            """, (selected_address_id, user_id))

            row = cursor.fetchone()
            if not row:
                return "Invalid address selected.", 400

            full_name = row["full_name"]
            phone = row["phone"]
            final_address = row["address"]

        else:
            # First delivery order → save address
            street = request.form.get("street")

            barangay = request.form.get("barangay-text") or request.form.get("barangay")
            city = request.form.get("city-text") or request.form.get("city")
            province = request.form.get("province-text") or request.form.get("province")
            region = request.form.get("region-text") or request.form.get("region")
            zip_code = request.form.get("zip")

            final_address = f"{street}, {barangay}, {city}, {province}, {region}, {zip_code}"

            cursor.execute("""
                INSERT INTO user_addresses (user_id, full_name, phone, address, is_default)
                VALUES (%s, %s, %s, %s, 1)
            """, (user_id, full_name, phone, final_address))

            conn.commit()

    else:
        final_address = "PICKUP"

    # ================================
    # FETCH SELECTED CART ITEMS
    # ================================
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

    # COMPUTE TOTAL
    total = sum(float(item["price"]) * item["quantity"] for item in items)

    # GENERATE PUBLIC ORDER CODE
    order_code = generate_order_code()

    cursor.execute("""
        INSERT INTO orders (
            user_id,
            address,
            payment_method,
            fulfillment_method,
            total,
            status,
            order_code,
            full_name,
            phone
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        user_id,
        final_address,
        payment_method,
        fulfillment_method,
        total,
        "Order Placed",
        order_code,
        full_name,
        phone
    ))

    conn.commit()
    order_id = cursor.lastrowid

    # ------------------------------------------------
    # [ADDED] Insert initial order status history
    # ------------------------------------------------
    cursor.execute("""
        INSERT INTO order_status_history (order_id, status, message)
        VALUES (%s, %s, %s)
    """, (
        order_id,
        "Order Placed",
        STATUS_MESSAGES["Order Placed"][fulfillment_method]
    ))

    conn.commit()

    # INSERT ORDER ITEMS + STOCK + CLEAR CART
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

        cursor.execute("""
            UPDATE books SET stock_quantity = stock_quantity - %s
            WHERE id = %s
        """, (item["quantity"], item["book_id"]))

        cursor.execute("DELETE FROM cart WHERE id = %s", (item["cart_id"],))

    conn.commit()

    cursor.close()
    conn.close()

    session.pop("checkout_selected", None)
    session.pop("fulfillment_method", None)
    session["order_success"] = True

    return redirect(url_for("orders"))


# =========================
#  ADDING AND SAVING A NEW ADDRESS
# =========================
@app.route("/add-address", methods=["POST"])
def add_address():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 403

    user_id = session["user_id"]

    full_name = request.form.get("fullName")
    phone_raw = request.form.get("phone", "").strip()
    phone = phone_raw[1:] if phone_raw.startswith("0") else phone_raw

    street = request.form.get("street")
    barangay = request.form.get("barangay-text") or request.form.get("barangay")
    city = request.form.get("city-text") or request.form.get("city")
    province = request.form.get("province-text") or request.form.get("province")
    region = request.form.get("region-text") or request.form.get("region")
    zip_code = request.form.get("zip")

    final_address = f"{street}, {barangay}, {city}, {province}, {region}, {zip_code}"

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # 1. Clear all existing defaults for this user
    cursor.execute("""
        UPDATE user_addresses 
        SET is_default = 0 
        WHERE user_id = %s
    """, (user_id,))

    # 2. Insert NEW address as default
    cursor.execute("""
        INSERT INTO user_addresses (user_id, full_name, phone, address, is_default)
        VALUES (%s, %s, %s, %s, 1)
    """, (user_id, full_name, phone, final_address))

    new_id = cursor.lastrowid

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({ "success": True, "new_address_id": new_id})


# =========================
#  ORDERS ROUTE
# =========================
STATUS_ICONS = {
    "Order Placed": "fa-regular fa-clock",
    "Order Being Prepared": "fa-solid fa-boxes-packing",
    "Order Shipped Out": "fa-regular fa-truck",
    "Order Delivered": "fa-solid fa-box-open"
}

STATUS_MESSAGES = {
    "Order Placed": {
        "Delivery": "Your order has been placed and is awaiting processing.",
        "Pick-up": "Your order has been received and is awaiting preparation."
    },
    "Order Being Prepared": {
        "Delivery": "Your items are being prepared for shipment.",
        "Pick-up": "Your order is being prepared and will be ready for pickup."
    },
    "Order Shipped Out": {
        "Delivery": "Your order is out for delivery.",
        "Pick-up": None
    },
    "Order Delivered": {
        "Delivery": "Your order has been successfully delivered.",
        "Pick-up": "Your order has been picked up from the store."
    },
    "Order Cancelled": {
        "Delivery": "This order has been cancelled.",
        "Pick-up": "This order has been cancelled."
    }
}

@app.route('/orders-page')
def orders():
    if 'user_id' not in session:
        session['login_required'] = True
        session['login_required_page'] = "orders"
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
            fulfillment_method,
            payment_method,
            status,
            total,
            created_at,
            updated_at
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
        order["status_icon"] = STATUS_ICONS.get(order["status"])

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
        SELECT
            o.*,

            -- Fallback full name (pickup-safe)
            COALESCE(NULLIF(o.full_name, ''), u.name) AS full_name,

            -- Fallback phone + remove leading 0
            CASE
                WHEN COALESCE(NULLIF(o.phone, ''), u.phone) LIKE '0%'
                THEN SUBSTRING(COALESCE(NULLIF(o.phone, ''), u.phone), 2)
                ELSE COALESCE(NULLIF(o.phone, ''), u.phone)
            END AS phone

        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = %s AND o.user_id = %s
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

    # ------------------------------------------------
    # [ADDED] Fetch status history for timeline
    # ------------------------------------------------
    cursor.execute("""
        SELECT status, message, created_at
        FROM order_status_history
        WHERE order_id = %s
        ORDER BY created_at DESC
    """, (order_id,))

    status_history = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template(
    "user/order_details.html",
    order=order,
    items=order_items,
    status_history=status_history
)


# =========================
#  CANCEL ORDER
# =========================
@app.route('/cancel-order/<int:order_id>', methods=['POST'])
def cancel_order(order_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 403

    user_id = session['user_id']

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Fetch order
    cursor.execute("""
        SELECT status
        FROM orders
        WHERE id = %s AND user_id = %s
    """, (order_id, user_id))

    order = cursor.fetchone()

    if not order:
        cursor.close()
        conn.close()
        return jsonify({"error": "Order not found"}), 404

    # ❌ Block invalid cancellations
    if order["status"] in ["Order Shipped Out", "Order Delivered"]:
        cursor.close()
        conn.close()
        return jsonify({"error": "Order cannot be cancelled"}), 400

    # Update status
    cursor.execute("""
        UPDATE orders
        SET status = 'Order Cancelled',
            updated_at = NOW()
        WHERE id = %s
    """, (order_id,))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"success": True})


# =========================
#  BUY AGAIN
# =========================
@app.route('/buy-again/<int:order_id>', methods=['POST'])
def buy_again(order_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 403

    user_id = session['user_id']

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Get items from past order
    cursor.execute("""
        SELECT book_id, quantity
        FROM order_items
        WHERE order_id = %s
    """, (order_id,))
    items = cursor.fetchall()

    if not items:
        cursor.close()
        conn.close()
        return jsonify({"error": "No items found"}), 404

    for item in items:
        # Check if already in cart
        cursor.execute("""
            SELECT id, quantity
            FROM cart
            WHERE user_id = %s AND book_id = %s
        """, (user_id, item["book_id"]))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
                UPDATE cart
                SET quantity = quantity + %s
                WHERE id = %s
            """, (item["quantity"], existing["id"]))
        else:
            cursor.execute("""
                INSERT INTO cart (user_id, book_id, quantity)
                VALUES (%s, %s, %s)
            """, (user_id, item["book_id"], item["quantity"]))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"success": True})


# =========================
#  ADMIN PANEL
# =========================
@app.route('/admin/dashboard')
def admin_dashboard():
    if 'admin' not in session:
        return redirect('/user-login')
    return render_template('admin/sidebar.html')


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
        cover_path = os.path.join(app.config['BOOKS_FOLDER'], cover_filename)
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

    session["book_add_success"] = True

    return redirect(url_for('manage_books'))


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

    return render_template('admin/edit_book.html', book=book, active_page='manage_books')

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
        save_path = os.path.join(app.config['BOOKS_FOLDER'], filename)
        cover_file.save(save_path)

        # OPTIONAL: delete old file
        if old_cover:
            old_path = os.path.join(app.config['BOOKS_FOLDER'], old_cover)
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

    session["book_edit_success"] = True

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
        cover_path = os.path.join(app.config['BOOKS_FOLDER'], book['cover'])
        if os.path.exists(cover_path):
            os.remove(cover_path)

    cursor.close()
    conn.close()

    return redirect(url_for('manage_books'))


# =========================
#  BOOKS LIST PAGE
# =========================
@app.route('/admin/books-list')
def books_list():
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
    
    return render_template('admin/books_list.html',
                            books=books,
                            genres=genres,
                            active_page='books_list')


# =========================
#  ADMIN MANAGE ORDERS
# =========================
@app.route('/admin/manage-orders')
def manage_orders():
    if 'admin' not in session:
        return redirect('/admin-login')

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # FETCH ALL ORDERS FROM ALL USERS
    cursor.execute("""
        SELECT 
            o.id AS order_id,
            o.order_code,
            o.status,
            o.payment_method,
            o.fulfillment_method,
            o.total,
            o.created_at,
            o.address,

            COALESCE(NULLIF(o.full_name, ''), u.name) AS full_name,

            CASE
                WHEN COALESCE(NULLIF(o.phone, ''), u.phone) LIKE '0%'
                THEN SUBSTRING(COALESCE(NULLIF(o.phone, ''), u.phone), 2)
                ELSE COALESCE(NULLIF(o.phone, ''), u.phone)
            END AS phone

        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
    """)
    orders = cursor.fetchall()

    # FETCH ITEMS FOR EACH ORDER
    for order in orders:
        cursor.execute("""
            SELECT 
                oi.book_id,
                oi.quantity,
                b.title,
                b.author,
                b.genre,
                b.price,
                b.cover
            FROM order_items oi
            JOIN books b ON oi.book_id = b.id
            WHERE oi.order_id = %s
        """, (order['order_id'],))
        
        order['order_items'] = cursor.fetchall()
        order["status_icon"] = STATUS_ICONS.get(order["status"], "")

    cursor.close()
    conn.close()

    return render_template(
        'admin/manage_orders.html',
        orders=orders,
        active_page='manage_orders'
    )


@app.route('/admin/update-order-status', methods=['POST'])
def update_order_status():
    if 'admin' not in session:
        return redirect('/admin-login')

    order_id = request.form.get('order_id')
    new_status = request.form.get('status')

    if not order_id or not new_status:
        flash("Invalid data submitted.", "error")
        return redirect(url_for('manage_orders'))

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # ------------------------------------------------
    # FETCH order fulfillment type (CRITICAL)
    # ------------------------------------------------
    cursor.execute("""
        SELECT fulfillment_method, status
        FROM orders
        WHERE id = %s
    """, (order_id,))
    order = cursor.fetchone()

    if not order:
        cursor.close()
        conn.close()
        flash("Order not found.", "error")
        return redirect(url_for('manage_orders'))

    fulfillment = order["fulfillment_method"]

    # ------------------------------------------------
    # BLOCK INVALID STATUS FOR PICKUP
    # ------------------------------------------------
    if fulfillment == "Pick-up" and new_status == "Order Shipped Out":
        cursor.close()
        conn.close()
        flash("Pick-up orders cannot be marked as 'Shipped Out'.", "error")
        return redirect(url_for('manage_orders'))

    STEP = {
        "Order Placed": 1,
        "Order Being Prepared": 2,
        "Order Shipped Out": 3,
        "Order Delivered": 4
    }

    current_step = STEP.get(order["status"], 1)
    new_step = STEP.get(new_status)

    if not new_step:
        flash("Invalid status.", "error")
        return redirect(url_for("manage_orders"))

    # prevent going backward or re-submitting same status
    if new_step <= current_step:
        flash("That status is already set (or already passed).", "error")
        return redirect(url_for("manage_orders"))

    # ------------------------------------------------
    # UPDATE STATUS
    # ------------------------------------------------
    cursor.execute("""
        UPDATE orders
        SET status = %s,
            updated_at = NOW()
        WHERE id = %s
    """, (new_status, order_id))

    # ------------------------------------------------
    # [ADDED] Insert status change into history table
    # ------------------------------------------------
    message = STATUS_MESSAGES.get(new_status, {}).get(fulfillment)

    if not message:
        message = f"Order status updated to {new_status}"

    cursor.execute("""
        INSERT INTO order_status_history (order_id, status, message)
        VALUES (%s, %s, %s)
    """, (order_id, new_status, message))


    conn.commit()
    cursor.close()
    conn.close()

    session['order_update_success'] = True
    return redirect(url_for('manage_orders'))


# =========================
#  ADMIN ANNOUNCEMENTs POSTING
# =========================
@app.route('/admin/announcements', methods=['GET', 'POST'])
def admin_announcements():
    if 'admin' not in session:
        return redirect('/admin-login')

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    if request.method == 'POST':
        title = request.form['title']
        content = request.form['content']
        photo_file = request.files.get('photo')

        photo_filename = None

        # Save photo into ANNOUNCEMENT_FOLDER
        if photo_file and photo_file.filename:
            photo_filename = secure_filename(photo_file.filename)
            save_path = os.path.join(app.config['ANNOUNCEMENT_FOLDER'], photo_filename)
            photo_file.save(save_path)

        cursor.execute(
            "INSERT INTO announcements (title, content, photo) VALUES (%s, %s, %s)",
            (title, content, photo_filename)
        )
        conn.commit()

        session["announcement_post_success"] = True

        cursor.close()
        conn.close()
        return redirect(url_for('admin_announcements'))

    cursor.execute("SELECT * FROM announcements ORDER BY id DESC")
    announcements = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template(
        'admin/announcements.html',
        announcements=announcements,
        active_page='announcements'
    )

# --- Edit Announcement
@app.route('/admin/announcements/edit/<int:id>', methods=['POST'])
def admin_announcement_edit(id):
    if 'admin' not in session:
        return redirect('/admin-login')

    title = request.form['title']
    content = request.form['content']
    photo_file = request.files.get('photo')

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Fetch existing photo
    cursor.execute("SELECT photo FROM announcements WHERE id = %s", (id,))
    existing = cursor.fetchone()

    if photo_file and photo_file.filename:
        new_filename = secure_filename(photo_file.filename)
        new_path = os.path.join(app.config['ANNOUNCEMENT_FOLDER'], new_filename)
        photo_file.save(new_path)

        # Delete old image if exists
        if existing and existing["photo"]:
            old_path = os.path.join(app.config['ANNOUNCEMENT_FOLDER'], existing["photo"])
            if os.path.exists(old_path):
                os.remove(old_path)

        cursor.execute("""
            UPDATE announcements
            SET title = %s, content = %s, photo = %s
            WHERE id = %s
        """, (title, content, new_filename, id))

    else:
        cursor.execute("""
            UPDATE announcements
            SET title = %s, content = %s
            WHERE id = %s
        """, (title, content, id))

    conn.commit()
    cursor.close()
    conn.close()

    session["announcement_edit_success"] = True

    return redirect(url_for('admin_announcements'))


# --- Delete Announcement
@app.route('/admin/announcements/delete/<int:id>')
def admin_announcement_delete(id):
    if 'admin' not in session:
        return redirect('/admin-login')

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Fetch stored filename
    cursor.execute("SELECT photo FROM announcements WHERE id = %s", (id,))
    announcement = cursor.fetchone()

    if not announcement:
        cursor.close()
        conn.close()
        return "Announcement not found", 404

    # Delete DB record
    cursor.execute("DELETE FROM announcements WHERE id = %s", (id,))
    conn.commit()

    # Delete actual photo file
    if announcement["photo"]:
        photo_path = os.path.join(app.config['ANNOUNCEMENT_FOLDER'], announcement["photo"])
        if os.path.exists(photo_path):
            os.remove(photo_path)

    cursor.close()
    conn.close()

    session["announcement_delete_success"] = True

    return redirect(url_for('admin_announcements'))


# =========================
#  LOGOUT ROUTE
# =========================
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('home'))


if __name__ == '__main__':
    app.run(debug=True)