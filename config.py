import os

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'uma-chave-secreta-muito-dificil-de-adivinhar'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configurações para Upload de Fotos de Perfil
    UPLOAD_FOLDER = os.path.join(basedir, 'static/profile_pics')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB limite de tamanho do arquivo

    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_SAMESITE = 'Lax'
    # Se você usar "Lembrar-me" com cookies persistentes, adicione também:
    # REMEMBER_COOKIE_SECURE = False 
    # REMEMBER_COOKIE_SAMESITE = 'Lax'