from flask import Flask, jsonify, request, render_template, redirect, url_for, flash
from flask_cors import CORS
from flask_migrate import Migrate
from flask_login import LoginManager, current_user, login_user, logout_user, login_required
import os # Adicionado
from werkzeug.utils import secure_filename # Adicionado

import jikan_client
from config import Config
from models import db, User, WatchedItem # <--- ADICIONE WatchedItem AQUI SE ESTIVER FALTANDO


app = Flask(__name__)
app.config.from_object(Config)

CORS(app, resources={r"/api/*": {"origins": "*"}})
db.init_app(app)
migrate = Migrate(app, db)
login_manager = LoginManager(app)
login_manager.login_view = 'login_page'
login_manager.login_message = "Por favor, faça login para acessar esta página."
login_manager.login_message_category = "info"

# Garante que a pasta de upload exista
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def map_frontend_item_type_to_jikan(frontend_item_type):
    if frontend_item_type == "animes": return "anime"
    if frontend_item_type == "mangas": return "manga"
    if frontend_item_type == "character" or frontend_item_type == "characters": # - characters removido para ajuste 
         return "characters" 
    return frontend_item_type

# função para ajudar no upload
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# rotas para o html
@app.route('/')
def index_page(): return render_template('index.html')
# rotas para login/register/profile
@app.route('/login', methods=['GET'])
def login_page():
    if current_user.is_authenticated: return redirect(url_for('index_page'))
    return render_template('login.html')

@app.route('/register', methods=['GET'])
def register_page():
    if current_user.is_authenticated: return redirect(url_for('index_page'))
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout_page():
    logout_user()
    flash('Você foi desconectado com sucesso.', 'success')
    return redirect(url_for('index_page'))


@app.route('/profile', methods=['GET'])
@login_required
def profile_page():
    watched_anime_count = WatchedItem.query.filter_by(user_id=current_user.id, item_type='anime').count()
    # watched_manga_count = WatchedItem.query.filter_by(user_id=current_user.id, item_type='manga').count() - Pendente adição 
    return render_template('profile.html', user=current_user, watched_anime_count=watched_anime_count)

# Nova rota mais eficiente para o upload de fotos a outra tava bugando tudo
@app.route('/profile/upload_picture', methods=['POST'])
@login_required
def upload_profile_picture():
    if 'profile_pic' not in request.files:
        flash('Nenhum arquivo selecionado.', 'warning')
        return redirect(url_for('profile_page'))
    
    file = request.files['profile_pic']
    if file.filename == '':
        flash('Nenhum arquivo selecionado.', 'warning')
        return redirect(url_for('profile_page'))

    if file and allowed_file(file.filename):
        # Aqui o app gera um id unico para a foto, mas preciso alterar e deixer mais eficiente
        _, f_ext = os.path.splitext(file.filename) # Ele pega a extensão atual e originalo da imagem
        filename = secure_filename(f"user_{current_user.id}{f_ext.lower()}")
        
        # Se a foto antiga não for default ele já delete aqui
        if current_user.profile_image_file and current_user.profile_image_file != 'default.jpg':
            old_file_path = os.path.join(app.config['UPLOAD_FOLDER'], current_user.profile_image_file)
            if os.path.exists(old_file_path):
                try:
                    os.remove(old_file_path)
                except Exception as e:
                    print(f"Erro ao deletar foto antiga: {e}") 
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        try:
            file.save(file_path)
            current_user.profile_image_file = filename
            db.session.commit()
            flash('Foto de perfil atualizada com sucesso!', 'success')
        except Exception as e:
            db.session.rollback()
            flash('Ocorreu um erro ao salvar a foto. Tente novamente.', 'danger')
            print(f"Erro ao salvar foto de perfil: {e}")
    else:
        flash('Tipo de arquivo não permitido. Use png, jpg, jpeg ou gif.', 'danger')
    
    return redirect(url_for('profile_page'))


@app.route('/details')
def details_page_render(): return render_template('details.html')

# Rotas para auth
@app.route('/api/auth/register', methods=['POST'])
def api_register():
    data = request.get_json()
    if not data: return jsonify({'success': False, 'message': 'Nenhum dado JSON enviado ou formato inválido.'}), 400
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    if not username or not email or not password: return jsonify({'success': False, 'message': 'Campos obrigatórios ausentes.'}), 400
    if User.query.filter_by(username=username).first(): return jsonify({'success': False, 'message': 'Nome de usuário já existe.'}), 400
    if User.query.filter_by(email=email).first(): return jsonify({'success': False, 'message': 'Email já cadastrado.'}), 400
    try:
        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        login_user(user, remember=True)
        return jsonify({'success': True, 'message': 'Registro bem-sucedido! Redirecionando...', 'redirect': url_for('index_page')})
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao registrar usuário: {e}")
        return jsonify({'success': False, 'message': 'Erro interno ao tentar registrar.'}), 500

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json()
    if not data: return jsonify({'success': False, 'message': 'Nenhum dado enviado.'}), 400
    email = data.get('email')
    password = data.get('password')
    if not email or not password: return jsonify({'success': False, 'message': 'Email e senha são obrigatórios.'}), 400
    user = User.query.filter_by(email=email).first()
    if user is None or not user.check_password(password): return jsonify({'success': False, 'message': 'Email ou senha inválidos.'}), 401
    login_user(user, remember=True)
    return jsonify({'success': True, 'redirect': url_for('index_page')})


@app.route('/api/auth/status')
def auth_status():
    if current_user.is_authenticated:
        profile_image_filename = current_user.profile_image_file or 'default.jpg'
        profile_image_url = url_for('static', filename=f'profile_pics/{profile_image_filename}')
        
        # Contagem para animes assistidos
        watched_anime_count = WatchedItem.query.filter_by(user_id=current_user.id, item_type='anime').count()
        # Preciso adicionar para mangás futuramente

        return jsonify({
            'logged_in': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email,
                'profile_image_url': profile_image_url,
                'watched_anime_count': watched_anime_count 
                # 'watched_manga_count': watched_manga_count # Futuramente
            }
        })
    return jsonify({'logged_in': False})

@app.route('/api/user/watched/<item_type>/<int:mal_id>', methods=['POST'])
@login_required
def add_watched_item(item_type, mal_id):
    normalized_item_type = map_frontend_item_type_to_jikan(item_type) 
    if normalized_item_type not in ['anime', 'manga']:
        return jsonify({'success': False, 'message': 'Tipo de item inválido.'}), 400

    if current_user.has_watched(mal_id, normalized_item_type):
        return jsonify({'success': False, 'message': 'Item já marcado como assistido.'}), 409 

    try:
        watched_item = WatchedItem(user_id=current_user.id, item_mal_id=mal_id, item_type=normalized_item_type)
        db.session.add(watched_item)
        db.session.commit()
        new_count = WatchedItem.query.filter_by(user_id=current_user.id, item_type=normalized_item_type).count()
        return jsonify({'success': True, 'message': 'Item marcado como assistido!', 'watched_count': new_count})
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao adicionar item assistido: {e}")
        return jsonify({'success': False, 'message': 'Erro ao marcar item como assistido.'}), 500

@app.route('/api/user/watched/<item_type>/<int:mal_id>', methods=['DELETE'])
@login_required
def remove_watched_item(item_type, mal_id):
    normalized_item_type = map_frontend_item_type_to_jikan(item_type)
    if normalized_item_type not in ['anime', 'manga']:
        return jsonify({'success': False, 'message': 'Tipo de item inválido.'}), 400

    watched_item = WatchedItem.query.filter_by(
        user_id=current_user.id,
        item_mal_id=mal_id,
        item_type=normalized_item_type
    ).first()

    if watched_item:
        try:
            db.session.delete(watched_item)
            db.session.commit()
            new_count = WatchedItem.query.filter_by(user_id=current_user.id, item_type=normalized_item_type).count()
            return jsonify({'success': True, 'message': 'Item removido dos assistidos!', 'watched_count': new_count})
        except Exception as e:
            db.session.rollback()
            print(f"Erro ao remover item assistido: {e}")
            return jsonify({'success': False, 'message': 'Erro ao remover item dos assistidos.'}), 500
    return jsonify({'success': False, 'message': 'Item não encontrado nos assistidos.'}), 404

@app.route('/api/user/watched_details/<frontend_item_type>', methods=['GET'])
@login_required
def api_get_watched_item_details(frontend_item_type):
    jikan_item_type = map_frontend_item_type_to_jikan(frontend_item_type)
    if jikan_item_type not in ['anime', 'manga']:
        return jsonify({'success': False, 'message': 'Tipo de item inválido.'}), 400

    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 12, type=int)

    # Serch em todos itens assistidos pelo user
    watched_items_query = WatchedItem.query.filter_by(
        user_id=current_user.id,
        item_type=jikan_item_type
    ).order_by(WatchedItem.watched_at.desc()) # Ordena pelo mais recente

    # Pagin dos id
    paginated_watched_items = watched_items_query.paginate(page=page, per_page=limit, error_out=False)
    watched_mal_ids = [item.item_mal_id for item in paginated_watched_items.items]
    
    total_watched_items = paginated_watched_items.total
    total_pages = paginated_watched_items.pages

    item_details_list = []
    if not watched_mal_ids:
        return jsonify({
            'success': True, 
            'data': [], 
            'pagination': {
                'current_page': page,
                'has_next': False,
                'has_prev': False,
                'total_pages': 0,
                'total_items': 0
            }
        })

    for mal_id in watched_mal_ids:
        details = jikan_client.get_item_details(item_type=jikan_item_type, item_id=mal_id)
        if details and details.get('mal_id'):
            item_details_list.append(details)
        else:
            print(f"Não foi possível obter detalhes para {jikan_item_type} MAL ID {mal_id}")

    return jsonify({
        'success': True, 
        'data': item_details_list,
        'pagination': {
            'current_page': page,
            'has_next': paginated_watched_items.has_next,
            'has_prev': paginated_watched_items.has_prev,
            'next_page_num': paginated_watched_items.next_num if paginated_watched_items.has_next else None,
            'prev_page_num': paginated_watched_items.prev_num if paginated_watched_items.has_prev else None,
            'total_pages': total_pages,
            'total_items': total_watched_items
        }
    })

@app.route('/api/user/watched_ids/<item_type>', methods=['GET'])
@login_required
def get_watched_item_ids(item_type):
    normalized_item_type = map_frontend_item_type_to_jikan(item_type)
    if normalized_item_type not in ['anime', 'manga']:
        return jsonify({'error': 'Tipo de item inválido.'}), 400
        
    watched = WatchedItem.query.filter_by(user_id=current_user.id, item_type=normalized_item_type).all()
    watched_ids = [item.item_mal_id for item in watched]
    return jsonify({'watched_ids': watched_ids})

@app.route('/api/genres/<frontend_item_type>', methods=['GET'])
def api_get_genres(frontend_item_type):
    jikan_type = map_frontend_item_type_to_jikan(frontend_item_type)
    genres = jikan_client.get_genres(item_type=jikan_type)
    if genres is not None: return jsonify({"data": genres})
    return jsonify({"error": f"Não foi possível buscar os gêneros para {jikan_type}."}), 500

def map_frontend_sort_to_jikan_orderby(frontend_sort_by):
    if frontend_sort_by == 'name':
        return 'title'
    elif frontend_sort_by == 'rating':
        return 'score'
    elif frontend_sort_by == 'release_date':
        return 'start_date'
    elif frontend_sort_by == 'popularity':
        return 'members'
    return frontend_sort_by


@app.route('/api/<frontend_item_type>/by_genre/<int:genre_id>', methods=['GET'])
def api_get_items_by_genre(frontend_item_type, genre_id): 
    jikan_type = map_frontend_item_type_to_jikan(frontend_item_type)
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 12, type=int)
    sort_by_frontend = request.args.get('sort_by', 'score')
    sort_order_frontend = request.args.get('order', 'desc')

    print(f"[APP.PY /by_genre] Recebido: type={frontend_item_type}, genre={genre_id}, sort_by='{sort_by_frontend}', order='{sort_order_frontend}'")

    jikan_order_by = map_frontend_sort_to_jikan_orderby(sort_by_frontend)
    
    print(f"[APP.PY /by_genre] Para Jikan: type={jikan_type}, order_by='{jikan_order_by}', sort='{sort_order_frontend}'")

    items, pagination_info = jikan_client.get_items_by_genre(
        item_type=jikan_type,
        genre_id=genre_id,
        page=page,
        limit=limit,
        order_by_criteria=jikan_order_by,
        sort_order=sort_order_frontend
    )
    if items is not None:
        return jsonify({"data": items, "pagination": pagination_info})
    return jsonify({"error": f"Não foi possível buscar {jikan_type}s para o gênero ID {genre_id}."}), 500


@app.route('/api/<frontend_item_type>/popular', methods=['GET'])
def api_get_popular_items(frontend_item_type):
    jikan_type = map_frontend_item_type_to_jikan(frontend_item_type)
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 12, type=int)
    default_sort_for_popular = 'members' 
    sort_by_frontend = request.args.get('sort_by', default_sort_for_popular)
    sort_order = request.args.get('order', 'desc')

    jikan_order_by = map_frontend_sort_to_jikan_orderby(sort_by_frontend)
    
    items, pagination_info = jikan_client.get_items_by_genre(
        item_type=jikan_type,
        genre_id=None, 
        page=page,
        limit=limit,
        order_by_criteria=jikan_order_by,
        sort_order=sort_order
    )
    if items is not None:
        return jsonify({"data": items, "pagination": pagination_info})
    return jsonify({"error": f"Não foi possível buscar {jikan_type}s populares."}), 500

@app.route('/api/<frontend_item_type>/details/<int:item_id>', methods=['GET'])
def api_get_item_details(frontend_item_type, item_id):
    jikan_type = map_frontend_item_type_to_jikan(frontend_item_type)
    details = jikan_client.get_item_details(item_type=jikan_type, item_id=item_id)
    if details is not None and details.get('mal_id'): return jsonify({"data": details})
    return jsonify({"error": f"Não foi possível buscar detalhes para {jikan_type} ID {item_id}."}), 404

@app.route('/api/<frontend_item_type>/search', methods=['GET'])
def api_search_items(frontend_item_type):
    jikan_type = map_frontend_item_type_to_jikan(frontend_item_type)
    query = request.args.get('q', '', type=str)
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    if not query and jikan_type != "character":
        return jsonify({"error": "Termo de busca não fornecido."}), 400
    items, pagination_info = jikan_client.search_items(item_type=jikan_type, query=query, page=page, limit=limit)
    if items is not None: return jsonify({"data": items, "pagination": pagination_info})
    return jsonify({"error": f"Não foi possível buscar {jikan_type}s para '{query}'. Verifique o console do servidor para detalhes."}), 500

if __name__ == '__main__':
    app.run(port=5000)