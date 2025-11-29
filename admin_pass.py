from werkzeug.security import generate_password_hash

# Replace 'my_admin_password' with your actual desired password
plain_password = 'Havenwave1!'
hashed_password = generate_password_hash(plain_password)

print(hashed_password)  # This will output something like: 'pbkdf2:sha256:600000$...$...'