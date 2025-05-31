# anime_catalog_backend/models.py
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True, nullable=False)
    email = db.Column(db.String(120), index=True, unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    profile_image_file = db.Column(db.String(100), nullable=False, server_default='default.jpg')

    # Itens assistidos
    watched_items = db.relationship('WatchedItem', backref='watcher', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if self.password_hash is None: return False
        return check_password_hash(self.password_hash, password)

    def has_watched(self, item_mal_id, item_type): # Verifica o que já assistiu
        return WatchedItem.query.filter_by(
            user_id=self.id,
            item_mal_id=item_mal_id,
            item_type=item_type
        ).count() > 0

    def __repr__(self):
        return f'<User {self.username}>'

class WatchedItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    item_mal_id = db.Column(db.Integer, nullable=False)
    item_type = db.Column(db.String(10), nullable=False)
    watched_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('user_id', 'item_mal_id', 'item_type', name='_user_item_uc'),)

    def __repr__(self):
        return f'<WatchedItem user_id={self.user_id} item_id={self.item_mal_id} type={self.item_type}>'