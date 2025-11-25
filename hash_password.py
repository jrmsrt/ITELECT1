import hashlib

# The plaintext password you want to hash
plaintext = 'adminpass'

# Create the SHA-256 hash
hashed_password = hashlib.sha256(plaintext.encode()).hexdigest()

print('Hashed password:', hashed_password)
