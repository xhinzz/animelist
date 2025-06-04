import requests
import time

BASE_URL_V4 = "https://api.jikan.moe/v4"
REQUEST_DELAY = 0.5  # delay das chamadas do jikan 

def _make_request(url, params=None):
    full_url_for_log = url
    if params:
        param_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        full_url_for_log = f"{url}?{param_string}"
    try:
        time.sleep(REQUEST_DELAY)
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err} - URL: {full_url_for_log}")
        return None
    except requests.exceptions.RequestException as req_err:
        print(f"Request error occurred: {req_err} - URL: {full_url_for_log}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e} - URL: {full_url_for_log}")
        return None

def get_genres(item_type="anime"): 
    jikan_api_type = item_type 
    if item_type == "animes":  
        jikan_api_type = "anime"
    elif item_type == "mangas": 
        jikan_api_type = "manga"
    
    data = _make_request(f"{BASE_URL_V4}/genres/{jikan_api_type}")
    return data.get('data', []) if data else None

def get_items_by_genre(item_type="anime", genre_id=None, page=1, limit=14, 
                       order_by_criteria="score", sort_order="desc"):
    
    jikan_api_type = item_type 
    if item_type == "character" or item_type == "characters":
        jikan_api_type = "characters" 
    elif item_type == "animes":
        jikan_api_type = "anime"
    elif item_type == "mangas":
        jikan_api_type = "manga"

    endpoint = f"{BASE_URL_V4}/{jikan_api_type}"
    params = {
        'page': page,
        'limit': limit,
        'sfw': 'true',
        'order_by': order_by_criteria,
        'sort': sort_order
    }
    if genre_id and (jikan_api_type == "anime" or jikan_api_type == "manga"):
        params['genres'] = str(genre_id)
    
    print(f"[JIKAN_CLIENT get_items_by_genre] Chamando Jikan com endpoint: {endpoint}, params: {params}")
    data = _make_request(endpoint, params=params)
    if not data: return None, None
    item_list_data = data.get('data', [])
    pagination_info = data.get('pagination', {})
    formatted_list = []
    for item in item_list_data:
        formatted_list.append({
            'mal_id': item.get('mal_id'),
            'title': item.get('title_english') or item.get('title'),
            'cover_url': item.get('images', {}).get('jpg', {}).get('large_image_url'),
            'score': item.get('score'),
            'synopsis': item.get('synopsis', 'Sinopse não disponível.')[:200] + '...' if item.get('synopsis') else 'Sinopse não disponível.'
        })
    return formatted_list, pagination_info


def search_items(item_type="anime", query="", page=1, limit=12,
                 order_by_criteria="score", sort_order="desc"):
    
    jikan_api_type = item_type
    if item_type == "character" or item_type == "characters":
        jikan_api_type = "characters"
    elif item_type == "animes":
        jikan_api_type = "anime"
    elif item_type == "mangas":
        jikan_api_type = "manga"

    if not query and jikan_api_type != "characters": 
        return None, None

    endpoint = f"{BASE_URL_V4}/{jikan_api_type}" 
    params = {
        'page': page,
        'limit': limit,
        'sfw': 'true',
    }
    if query:
        params['q'] = query
    
    if jikan_api_type == 'characters':
        if order_by_criteria not in ['mal_id', 'name', 'favorites']:
            pass 
        else:
            params['order_by'] = order_by_criteria
            params['sort'] = sort_order
    else: 
        params['order_by'] = order_by_criteria
        params['sort'] = sort_order
        
    print(f"[JIKAN_CLIENT search_items] Chamando Jikan com endpoint: {endpoint}, params: {params}") # Log para debug
    data = _make_request(endpoint, params=params)
    if not data: return None, None
    item_list_data = data.get('data', [])
    pagination_info = data.get('pagination', {})
    formatted_list = []
    for item in item_list_data:
        item_title = item.get('title_english') or item.get('title')
        if jikan_api_type == 'characters':
            item_title = item.get('name')
        
        cover_image = item.get('images', {}).get('jpg', {}).get('image_url')
        if jikan_api_type != 'characters':
            cover_image = item.get('images', {}).get('jpg', {}).get('large_image_url', cover_image)

        favorites_or_score_info = item.get('score')
        if jikan_api_type == 'characters':
            favorites_or_score_info = item.get('favorites')

        formatted_list.append({
            'mal_id': item.get('mal_id'),
            'title': item_title,
            'cover_url': cover_image,
            'score': favorites_or_score_info,
            'synopsis': item.get('about', 'Detalhes não disponíveis.')[:200] + '...' if jikan_api_type == 'characters' and item.get('about') else \
                        (item.get('synopsis', 'Sinopse não disponível.')[:200] + '...' if item.get('synopsis') else 'Sinopse não disponível.'),
            'type': item.get('type')
        })
    return formatted_list, pagination_info


def get_item_details(item_type="anime", item_id=None):
    if not item_id: return None
    
    jikan_endpoint_type_for_detail = item_type
    if item_type == "characters" or item_type == "character": 
        jikan_endpoint_type_for_detail = "character" 
    elif item_type == "animes":
        jikan_endpoint_type_for_detail = "anime"
    elif item_type == "mangas":
        jikan_endpoint_type_for_detail = "manga"

    print(f"[JIKAN_CLIENT get_item_details] Chamando Jikan com endpoint: {BASE_URL_V4}/{jikan_endpoint_type_for_detail}/{item_id}/full") # Log
    data_full = _make_request(f"{BASE_URL_V4}/{jikan_endpoint_type_for_detail}/{item_id}/full")
    if not data_full: return None
    data = data_full.get('data', {})
    if not data: return None

    is_character_type = (item_type == "character" or item_type == "characters")
    is_anime_type = (item_type == "anime" or item_type == "animes")
    is_manga_type = (item_type == "manga" or item_type == "mangas")

    trailer_url = None
    if is_anime_type:
        trailer_data = data.get('trailer', {})
        if trailer_data and trailer_data.get('youtube_id'):
            trailer_url = f"https://www.youtube.com/embed/{trailer_data.get('youtube_id')}"
        elif trailer_data and trailer_data.get('url'):
            trailer_url = trailer_data.get('url')
    
    details = {
        'mal_id': data.get('mal_id'),
        'title': data.get('name') if is_character_type else (data.get('title_english') or data.get('title')),
        'title_japanese': data.get('name_kanji') if is_character_type else data.get('title_japanese'),
        'cover_url': data.get('images', {}).get('jpg', {}).get('image_url') if is_character_type else data.get('images', {}).get('jpg', {}).get('large_image_url'),
        'score': data.get('favorites') if is_character_type else data.get('score'),
        'scored_by': None if is_character_type else data.get('scored_by'),
        'rank': data.get('rank'),
        'popularity': data.get('popularity'),
        'synopsis': data.get('about', 'Sobre não disponível.') if is_character_type else data.get('synopsis', 'Sinopse não disponível.'),
        'type': None if is_character_type else data.get('type'),
        'source': None if is_character_type else data.get('source'),
        'status': None if is_character_type else data.get('status'),
        'aired_string': data.get('aired', {}).get('string') if is_anime_type else \
                        (data.get('published', {}).get('string') if is_manga_type else None),
        'duration_or_volumes': data.get('duration') if is_anime_type else \
                               (data.get('volumes') if is_manga_type else None),
        'episodes_or_chapters': data.get('episodes') if is_anime_type else \
                                (data.get('chapters') if is_manga_type else None),
        'rating': data.get('rating') if is_anime_type else None,
        'year': data.get('year') if is_anime_type else \
                (data.get('published', {}).get('prop', {}).get('from', {}).get('year') if is_manga_type else None),
        'season': data.get('season') if is_anime_type else None,
        'studios_or_authors': ([s.get('name') for s in data.get('studios', [])] if is_anime_type else \
                              ([{'name': a.get('name'), 'role': a.get('type')} for a in data.get('authors', [])] if is_manga_type else None)),
        'genres': None if is_character_type else [g.get('name') for g in data.get('genres', [])],
        'themes': None if is_character_type or is_manga_type else [t.get('name') for t in data.get('themes', [])],
        'demographics': None if is_character_type else [d.get('name') for d in data.get('demographics', [])]
    }
    if is_anime_type:
        details['trailer_url'] = trailer_url
        
    return details

def get_anime_recommendations(anime_id):
    if not anime_id: return None
    endpoint = f"{BASE_URL_V4}/anime/{anime_id}/recommendations"
    print(f"[JIKAN_CLIENT get_anime_recommendations] Chamando Jikan: {endpoint}")
    data = _make_request(endpoint)

    if not data or 'data' not in data:
        print(f"[JIKAN_CLIENT get_anime_recommendations] Jikan não retornou dados ou 'data' ausente para ID {anime_id}")
        return [] 
    recommendations_data = data.get('data', [])
    formatted_recommendations = []
    for rec_entry in recommendations_data:
        entry = rec_entry.get('entry')
        if entry:
            formatted_recommendations.append({
                'mal_id': entry.get('mal_id'),
                'title': entry.get('title'),
                'cover_url': entry.get('images', {}).get('jpg', {}).get('large_image_url') or \
                             entry.get('images', {}).get('jpg', {}).get('image_url'),
            })
    return formatted_recommendations   

def get_top_items(item_type="anime", page=1, limit=14, filter_type=None):
    jikan_api_type = item_type
    if item_type == "character" or item_type == "characters":
        jikan_api_type = "characters"
    elif item_type == "animes":
        jikan_api_type = "anime"
    elif item_type == "mangas":
        jikan_api_type = "manga"

    endpoint = f"{BASE_URL_V4}/top/{jikan_api_type}"
    params = { 'page': page, 'limit': limit }
    if filter_type:
        params['filter'] = filter_type
        
    print(f"[JIKAN_CLIENT get_top_items] Chamando Jikan com endpoint: {endpoint}, params: {params}") # Log
    data = _make_request(endpoint, params=params)
    if not data: return None, None
    item_list_data = data.get('data', [])
    pagination_info = data.get('pagination', {})
    formatted_list = []
    for item in item_list_data:
        item_title = item.get('title_english') or item.get('title')
        is_character_type_from_top = (jikan_api_type == 'characters')
        if is_character_type_from_top:
            item_title = item.get('name')
        
        cover_image = item.get('images', {}).get('jpg', {}).get('image_url')
        if not is_character_type_from_top:
            cover_image = item.get('images', {}).get('jpg', {}).get('large_image_url', cover_image)

        formatted_list.append({
            'mal_id': item.get('mal_id'),
            'title': item_title,
            'cover_url': cover_image,
            'score': item.get('score'), 
            'favorites': item.get('favorites'), 
            'synopsis': item.get('about', 'Detalhes não disponíveis.')[:200] + '...' if is_character_type_from_top and item.get('about') else \
                        (item.get('synopsis', 'Sinopse não disponível.')[:200] + '...' if item.get('synopsis') else 'Sinopse não disponível.'),
            'type': item.get('type')
        })
    return formatted_list, pagination_info

def get_anime_main_characters(anime_id):
    """Busca os personagens principais de um anime específico."""
    if not anime_id:
        return [] # Retorna lista vazia se não houver ID
    
    endpoint = f"{BASE_URL_V4}/anime/{anime_id}/characters"
    print(f"[JIKAN_CLIENT get_anime_main_characters] Chamando Jikan: {endpoint}")
    data = _make_request(endpoint)

    if not data or 'data' not in data:
        print(f"[JIKAN_CLIENT get_anime_main_characters] Jikan não retornou dados ou 'data' ausente para personagens do anime ID {anime_id}")
        return []

    main_characters = []
    for char_entry in data.get('data', []):
        if char_entry.get('role') == "Main":
            character_info = char_entry.get('character', {})
            if character_info.get('mal_id'):
                main_characters.append({
                    'mal_id': character_info.get('mal_id'),
                    'name': character_info.get('name'),
                    'image_url': character_info.get('images', {}).get('jpg', {}).get('image_url'), # Personagens geralmente usam 'image_url'
                    'role': char_entry.get('role'),      
                })  
    return main_characters    