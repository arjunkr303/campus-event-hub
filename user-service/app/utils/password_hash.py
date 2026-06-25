import bcrypt


def hash_password(password: str):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hash_password: str):
    return bcrypt.checkpw(password.encode("utf-8"), hash_password.encode("utf-8"))
