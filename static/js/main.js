document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://127.0.0.1:5000/api';

    // Elemntos UI
    const categoryButton = document.getElementById('category-button');
    const selectedCategoryNameElement = document.getElementById('selected-category-name');
    const genreListDropdownElement = document.getElementById('genre-list-dropdown');
    const itemListElement = document.getElementById('item-list');
    const sectionTitleElement = document.getElementById('section-title');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageElement = document.getElementById('error-message');
    const paginationElement = document.getElementById('pagination');
    const sortBySelect = document.getElementById('sort-by-select');

    // Sidebar
    const profileUsernameElement = document.getElementById('profile-username');
    const profileWatchedCountElement = document.getElementById('profile-watched-count');
    const mainNavigationLinksUl = document.getElementById('main-navigation-links');
    const sidebarProfilePicElement = document.getElementById('sidebar-profile-pic');

    // Nav
    const navAnimes = document.getElementById('nav-animes');
    const navMangas = document.getElementById('nav-mangas');
    // const navCharacters = document.getElementById('nav-characters'); 

    // Busca
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    // DarkTheme
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const themeIcon = themeToggleButton ? themeToggleButton.querySelector('.material-icons') : null;
    const THEME_KEY = 'user-theme-preference';

    // Funções da UI
    function showLoading(isLoading) {
        if (loadingIndicator) loadingIndicator.style.display = isLoading ? 'block' : 'none';
        if (isLoading) {
            if (errorMessageElement) errorMessageElement.style.display = 'none';
            if (itemListElement) itemListElement.innerHTML = '';
            if (paginationElement) paginationElement.innerHTML = '';
        }
    }

    function displayError(message) {
        if (errorMessageElement) {
            errorMessageElement.textContent = message;
            errorMessageElement.style.display = 'block';
        }
        if (itemListElement) itemListElement.innerHTML = '';
        if (paginationElement) paginationElement.innerHTML = '';
    }

    function setActiveNav(activeLinkElement) {
        if (!mainNavigationLinksUl) return;
        mainNavigationLinksUl.querySelectorAll('li a.active').forEach(link => link.classList.remove('active'));
        // limpa 'active-li'
        mainNavigationLinksUl.querySelectorAll('li.active-li').forEach(li => li.classList.remove('active-li'));

        if (activeLinkElement && activeLinkElement.tagName === 'A') {
            activeLinkElement.classList.add('active');
            if (activeLinkElement.parentElement && activeLinkElement.parentElement.tagName === 'LI') {
                activeLinkElement.parentElement.classList.add('active-li');
            }
        }
    }
    
    // lógica do dakmode
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            if (themeIcon) themeIcon.textContent = 'brightness_7';
        } else {
            document.body.classList.remove('dark-mode');
            if (themeIcon) themeIcon.textContent = 'brightness_4';
        }
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) { console.warn("localStorage theme save error.", e); }
    }

    function loadTheme() {
        let preferredTheme = null;
        try { preferredTheme = localStorage.getItem(THEME_KEY); } catch (e) { console.warn("localStorage theme load error.", e); }
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (preferredTheme) applyTheme(preferredTheme);
        else if (systemPrefersDark) applyTheme('dark');
        else applyTheme('light');
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            document.body.classList.contains('dark-mode') ? applyTheme('light') : applyTheme('dark');
        });
    }

    // variáveis globais
    let currentSection = 'animes';
    let currentPage = 1;
    let currentGenreId = null;
    let currentGenreName = 'Categorias Animes';
    let totalPages = 1;
    let currentFetchItemsFunction = fetchAnimesByGenre;
    let currentFetchGenresFunction = fetchAnimeGenres;
    let currentSearchQuery = "";
    let currentSortBy = 'score'; 
    let currentSortOrder = 'desc'; 
    let watchedAnimeIds = new Set();
    let loggedInUser = null; 
    
    // auth e UI 
    async function checkLoginStatusAndUpdateUI() {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/status`);
            if (!response.ok) {
                console.warn("API de status de auth não encontrada, continuando como visitante.");
                loggedInUser = null; watchedAnimeIds.clear(); updateNavForVisitor(); return;
            }
            const data = await response.json();
            
            if (mainNavigationLinksUl) {
                const dynamicLinks = mainNavigationLinksUl.querySelectorAll('.auth-nav-link, .nav-watched-link');
                dynamicLinks.forEach(link => { if (link.parentElement) link.parentElement.remove(); });
            }

            if (data.logged_in && data.user) {
                loggedInUser = data.user;
                if (profileUsernameElement) profileUsernameElement.textContent = data.user.username;
                if (profileWatchedCountElement && data.user.watched_anime_count !== undefined) {
                    profileWatchedCountElement.textContent = `Assistidos: ${data.user.watched_anime_count}`;
                } else if (profileWatchedCountElement) {
                     profileWatchedCountElement.textContent = `Assistidos: 0`;
                }
                if (sidebarProfilePicElement && data.user.profile_image_url) {
                    sidebarProfilePicElement.src = data.user.profile_image_url;
                    sidebarProfilePicElement.alt = `Avatar de ${data.user.username}`;
                } else if (sidebarProfilePicElement) {
                    sidebarProfilePicElement.src = '/static/profile_pics/default.jpg';
                    sidebarProfilePicElement.alt = 'Avatar Padrão';
                }

                if(mainNavigationLinksUl){
                    const watchedLi = document.createElement('li');
                    watchedLi.innerHTML = `<a href="#" id="nav-watched-animes" class="nav-watched-link"><span class="material-icons">playlist_play</span> Animes Assistidos</a>`;
                    mainNavigationLinksUl.appendChild(watchedLi);
                    
                    const navWatchedAnimes = document.getElementById('nav-watched-animes');
                    if (navWatchedAnimes) {
                        navWatchedAnimes.addEventListener('click', (e) => {
                            e.preventDefault();
                            setupWatchedSection('anime');
                        });
                    }

                    const profileLi = document.createElement('li');
                    profileLi.innerHTML = `<a href="/profile" class="auth-nav-link"><span class="material-icons">settings</span> Perfil</a>`;
                    mainNavigationLinksUl.appendChild(profileLi);
                    const logoutLi = document.createElement('li');
                    logoutLi.innerHTML = `<a href="/logout" class="auth-nav-link"><span class="material-icons">logout</span> Logout</a>`;
                    mainNavigationLinksUl.appendChild(logoutLi);
                }
                await fetchUserWatchedItems('anime'); 
            } else {
                loggedInUser = null; watchedAnimeIds.clear(); updateNavForVisitor();
            }
        } catch (error) {
            console.error("Erro em checkLoginStatusAndUpdateUI:", error);
            loggedInUser = null; watchedAnimeIds.clear(); updateNavForVisitor();
            if (sidebarProfilePicElement) {
                 sidebarProfilePicElement.src = '/static/profile_pics/default.jpg';
                 sidebarProfilePicElement.alt = 'Avatar Padrão';
            }
        }
    }

    function updateNavForVisitor() {
        loggedInUser = null; watchedAnimeIds.clear(); 
        if (profileUsernameElement) profileUsernameElement.textContent = 'Visitante';
        if (profileWatchedCountElement) profileWatchedCountElement.textContent = `Assistidos: -`;
        if (sidebarProfilePicElement) {
            sidebarProfilePicElement.src = '/static/profile_pics/default.jpg';
            sidebarProfilePicElement.alt = 'Avatar Visitante';
        }
        if (mainNavigationLinksUl) {
            const existingDynamicLinks = mainNavigationLinksUl.querySelectorAll('.auth-nav-link, .nav-watched-link');
            existingDynamicLinks.forEach(link => { if (link.parentElement) link.parentElement.remove(); });
            
            const loginLi = document.createElement('li');
            loginLi.innerHTML = `<a href="/login" class="auth-nav-link"><span class="material-icons">login</span> Login</a>`;
            mainNavigationLinksUl.appendChild(loginLi);
            const registerLi = document.createElement('li');
            registerLi.innerHTML = `<a href="/register" class="auth-nav-link"><span class="material-icons">person_add</span> Registrar</a>`;
            mainNavigationLinksUl.appendChild(registerLi);
        }
    }

    // Assistidos
    async function fetchUserWatchedItems(itemType) { 
        if (!loggedInUser) { 
            if (itemType === 'anime') watchedAnimeIds.clear();
            if (currentSection === `watched-${itemType}${itemType === 'manga' ? 's' : 's'}`) {
                if(itemListElement) itemListElement.innerHTML = `<li><p>Faça login para ver seus ${itemType === 'anime' ? 'animes' : 'mangás'} assistidos.</p></li>`;
                if(paginationElement) paginationElement.innerHTML = '';
            }
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/user/watched_ids/${itemType}`);
            if (response.ok) {
                const data = await response.json();
                if (itemType === 'anime') {
                    watchedAnimeIds = new Set(data.watched_ids || []);
                    console.log("IDs de animes assistidos carregados:", Array.from(watchedAnimeIds));
                }
                // Colocar Lógica para lidos em mangá depois
            } else { 
                console.error(`Erro ao buscar IDs assistidos de ${itemType}: ${response.status}`); 
                if (itemType === 'anime') watchedAnimeIds.clear(); 
            }
        } catch (error) { 
            console.error(`Falha no fetch de IDs assistidos de ${itemType}:`, error); 
            if (itemType === 'anime') watchedAnimeIds.clear(); 
        }
        
        const onWatchedPage = currentSection === `watched-${itemType}${itemType === 'manga' ? 's' : 's'}`;
        if (currentFetchItemsFunction && (!onWatchedPage || (onWatchedPage && itemListElement && itemListElement.children.length <= 1 && itemListElement.textContent.includes("login")) )) {
             if (currentSearchQuery) {
                currentFetchItemsFunction(currentSearchQuery, currentPage);
            } else {
                currentFetchItemsFunction(currentGenreId, currentPage);
            }
        }
    }
    
    // dropdownlist e categorias
    if (categoryButton && genreListDropdownElement) {
        categoryButton.addEventListener('click', (event) => {
            event.stopPropagation(); 
            const currentDisplay = window.getComputedStyle(genreListDropdownElement).display;
            genreListDropdownElement.style.display = currentDisplay === 'block' ? 'none' : 'block';
        });
    }
    if (document && categoryButton && genreListDropdownElement) {
        document.addEventListener('click', (event) => {
            if (!categoryButton.contains(event.target) && !genreListDropdownElement.contains(event.target)) {
                genreListDropdownElement.style.display = 'none';
            }
        });
    }

    // fetch principal de animes e mangás
    async function fetchAndDisplayItems(itemType, genreId, page = 1, query = null) {
        showLoading(true);
        let baseUrl;
        let fetchParamForPagination = genreId;
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', '12'); 
        params.append('sort_by', currentSortBy);
        params.append('order', currentSortOrder);

        if (query) {
            if(sectionTitleElement) sectionTitleElement.textContent = `Resultados para "${query}" em ${itemType.replace(/^\w/, c => c.toUpperCase())}`;
            baseUrl = `${API_BASE_URL}/${itemType}/search`;
            params.append('q', query);
            fetchParamForPagination = query;
        } else if (genreId) {
            if(sectionTitleElement) sectionTitleElement.textContent = `${itemType.replace(/^\w/, c => c.toUpperCase())} de ${currentGenreName}`;
            baseUrl = `${API_BASE_URL}/${itemType}/by_genre/${genreId}`;
        } else { 
            if(sectionTitleElement) sectionTitleElement.textContent = `${itemType.replace(/^\w/, c => c.toUpperCase())} Populares`;
            baseUrl = `${API_BASE_URL}/${itemType}/popular`;
        }

        const url = `${baseUrl}?${params.toString()}`;
        console.log("[FETCH URL COM ORDENAÇÃO]", url);

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status} ao buscar ${itemType}.`);
            const result = await response.json();
            const items = result.data;
            const paginationData = result.pagination;

            if(itemListElement) itemListElement.innerHTML = '';
            if (items && items.length > 0) {
                items.forEach(item => {
                    const card = document.createElement('li');
                    card.classList.add('anime-card');
                    let itemTitle = item.title || item.name;
                    let itemImage = item.cover_url || 'https://via.placeholder.com/200x280.png?text=Sem+Imagem';
                    let itemScoreInfo = `Nota: ${item.score !== null && item.score !== undefined ? item.score.toFixed(1) : 'N/A'}`;
                    
                    let watchedButtonHTML = '';
                    if (loggedInUser && (itemType === 'anime' || itemType === 'manga')) {
                        // Aqui o watched está para animes, no futuro vou adicionar um para mangá
                        const currentWatchedSet = itemType === 'anime' ? watchedAnimeIds : new Set(); 
                        const isWatched = currentWatchedSet.has(item.mal_id);
                        watchedButtonHTML = `
                            <button class="watched-button ${isWatched ? 'watched' : ''}" data-mal-id="${item.mal_id}" data-item-type="${itemType}" title="${isWatched ? 'Remover dos Assistidos' : 'Marcar como Assistido'}">
                                <span class="material-icons">${isWatched ? 'visibility' : 'visibility_off'}</span>
                                <span>${isWatched ? 'Assistido' : 'Assistir'}</span>
                            </button>
                        `;
                    }
                    
                    card.innerHTML = `
                        <img src="${itemImage}" alt="Capa de ${itemTitle}">
                        <div class="anime-card-content">
                            <h3>${itemTitle}</h3>
                            <p>${itemScoreInfo}</p>
                            <div class="card-actions">
                                <button class="details-button" data-id="${item.mal_id}" data-type="${itemType}">Detalhes</button>
                                ${watchedButtonHTML} 
                            </div>
                        </div>
                    `;
                    if(itemListElement) itemListElement.appendChild(card);
                });
                totalPages = paginationData?.last_visible_page || 1;
                currentPage = paginationData?.current_page || page;
                renderPaginationControls(currentFetchItemsFunction, fetchParamForPagination);
            } else { 
                if(itemListElement) itemListElement.innerHTML = `<li><p>Nenhum ${itemType} encontrado para esta seleção.</p></li>`;
            }
        } catch (error) { 
            console.error(`Erro ao buscar ${itemType}:`, error);
            displayError(`Não foi possível carregar ${itemType}. ${error.message}`);
        } 
        finally { showLoading(false); }
    }
    
    // fetch especificos
    async function fetchAnimeGenres() { await fetchAndPopulateGenres('anime'); }
    async function fetchAnimesByGenre(genreIdOrQuery, page = 1) { 
        const isSearch = (typeof genreIdOrQuery === 'string' && currentSearchQuery === genreIdOrQuery && currentSearchQuery !== "");
        await fetchAndDisplayItems('anime', isSearch ? null : genreIdOrQuery, page, isSearch ? genreIdOrQuery : null);
    }
    async function fetchMangaGenres() { await fetchAndPopulateGenres('manga'); }
    async function fetchMangasByGenre(genreIdOrQuery, page = 1) {
        const isSearch = (typeof genreIdOrQuery === 'string' && currentSearchQuery === genreIdOrQuery && currentSearchQuery !== "");
        await fetchAndDisplayItems('manga', isSearch ? null : genreIdOrQuery, page, isSearch ? genreIdOrQuery : null);
    }
    
    // popula os generos
    async function fetchAndPopulateGenres(itemType) {
        try {
            const response = await fetch(`${API_BASE_URL}/genres/${itemType}`);
            if (!response.ok) throw new Error(`Erro HTTP ao buscar gêneros de ${itemType}: ${response.status}`);
            const result = await response.json();
            const genres = result.data; 

            if (!genreListDropdownElement) { console.error("Elemento genreListDropdownElement não foi encontrado!"); return; }
            genreListDropdownElement.innerHTML = ''; 
            
            const allOpt = document.createElement('li');
            const itemTypeDisplay = itemType.replace(/^\w/, c => c.toUpperCase()); 
            allOpt.textContent = `Todos ${itemTypeDisplay}${itemType === 'manga' ? 's' : 's'}`;

            let fetchFunctionForType;
            if (itemType === 'anime') { fetchFunctionForType = fetchAnimesByGenre; }
            else if (itemType === 'manga') { fetchFunctionForType = fetchMangasByGenre; }
            else { console.error("Tipo de item desconhecido em fetchAndPopulateGenres:", itemType); return; }

            allOpt.addEventListener('click', () => {
                handleGenreSelection(null, `${itemTypeDisplay} Populares`, fetchFunctionForType);
            });
            genreListDropdownElement.appendChild(allOpt);

            if (genres && Array.isArray(genres) && genres.length > 0) {
                genres.forEach(genre => {
                    const listItem = document.createElement('li');
                    listItem.textContent = genre.name;
                    listItem.setAttribute('data-genre-id', genre.mal_id);
                    listItem.addEventListener('click', () => {
                        handleGenreSelection(genre.mal_id, genre.name, fetchFunctionForType); 
                    });
                    genreListDropdownElement.appendChild(listItem);
                });
            } else {
                const noGenreLi = document.createElement('li');
                noGenreLi.textContent = `Nenhum gênero de ${itemTypeDisplay.toLowerCase()} disponível.`;
                genreListDropdownElement.appendChild(noGenreLi);
            }
        } catch (error) {
            console.error(`Erro crítico em fetchAndPopulateGenres para ${itemType}:`, error);
            if (genreListDropdownElement) {
                const errorLi = document.createElement('li');
                const itemTypeDisplay = itemType.replace(/^\w/, c => c.toUpperCase());
                errorLi.textContent = `Erro ao carregar gêneros de ${itemTypeDisplay.toLowerCase()}.`;
                genreListDropdownElement.appendChild(errorLi);
            }
        }
    }

    // handler de seleção de genero
    function handleGenreSelection(genreId, genreName, fetchItemsFunc) {
        currentGenreId = genreId;
        currentGenreName = genreName;
        if (selectedCategoryNameElement) selectedCategoryNameElement.textContent = genreName;
        if (genreListDropdownElement) genreListDropdownElement.style.display = 'none';
        currentPage = 1;
        currentFetchItemsFunction = fetchItemsFunc;
        currentSearchQuery = "";
        fetchItemsFunc(currentGenreId, currentPage);
    }

    // paginação
    function renderPaginationControls(fetchFunctionToCall, fetchParamForFunction) {
        if (!paginationElement) return;
        paginationElement.innerHTML = '';
        if (totalPages <= 1) return;
        const createButton = (text, pageNum, isDisabled = false, isCurrent = false) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.disabled = isDisabled;
            if (isCurrent) button.classList.add('current-page');
            button.addEventListener('click', () => fetchFunctionToCall(fetchParamForFunction, pageNum));
            return button;
        };
        paginationElement.appendChild(createButton('Anterior', currentPage - 1, currentPage === 1));
        let startPage = Math.max(1, currentPage - 2); 
        let endPage = Math.min(totalPages, currentPage + 2);
        if (startPage > 1) {
            paginationElement.appendChild(createButton('1', 1));
            if (startPage > 2) { const ellipsis = document.createElement('span'); ellipsis.textContent = ' ... '; paginationElement.appendChild(ellipsis); }
        }
        for (let i = startPage; i <= endPage; i++) { paginationElement.appendChild(createButton(i, i, false, i === currentPage)); }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) { const ellipsis = document.createElement('span'); ellipsis.textContent = ' ... '; paginationElement.appendChild(ellipsis); }
            paginationElement.appendChild(createButton(totalPages, totalPages));
        }
        paginationElement.appendChild(createButton('Próxima', currentPage + 1, currentPage === totalPages));
    }

    // Navegação entre as seções
    function setupSection(sectionType, popularTitle, categoryTitle, placeholder, fetchItemsFunc, fetchGenresFunc) {
        const navElementToActivate = document.getElementById(`nav-${sectionType}`);
        if(navElementToActivate) setActiveNav(navElementToActivate);
        
        currentSection = sectionType;
        if (sectionTitleElement) sectionTitleElement.textContent = popularTitle;
        if (selectedCategoryNameElement) selectedCategoryNameElement.textContent = categoryTitle;
        if (searchInput) searchInput.placeholder = placeholder;
        currentGenreId = null; 
        currentSearchQuery = ""; 
        currentFetchItemsFunction = fetchItemsFunc;
        currentFetchGenresFunction = fetchGenresFunc;

        if (categoryButton) categoryButton.style.display = 'flex';
        if (sortBySelect) sortBySelect.style.display = 'inline-block';

        if (currentFetchGenresFunction) { currentFetchGenresFunction(); }
        
        handleGenreSelection(null, popularTitle, fetchItemsFunc);
    }

    // Itens assistidos
    function setupWatchedSection(itemType) { 
        const navLinkId = `nav-watched-${itemType}s`; 
        const navLinkElement = document.getElementById(navLinkId);
        if (navLinkElement) setActiveNav(navLinkElement); 
        
        currentSection = `watched-${itemType}s`; 
        const displayType = itemType.replace(/^\w/, c => c.toUpperCase()) + (itemType === 'manga' ? 's' : 's');
        if (sectionTitleElement) sectionTitleElement.textContent = `Meus ${displayType} Assistidos`;
        
        if (categoryButton) categoryButton.style.display = 'none';
        if (genreListDropdownElement) { genreListDropdownElement.style.display = 'none'; genreListDropdownElement.innerHTML = '';}
        if (selectedCategoryNameElement) selectedCategoryNameElement.textContent = "Meus Assistidos";
        if (searchInput) { searchInput.value = ''; searchInput.placeholder = `Buscar em Meus Assistidos...`; }
        if (sortBySelect) sortBySelect.style.display = 'none';

        currentGenreId = null;
        currentSearchQuery = "";
        currentFetchItemsFunction = (typeIgnored, pageNum) => fetchAndDisplayWatchedItems(itemType, pageNum);
        
        fetchAndDisplayWatchedItems(itemType, 1);
    }

    async function fetchAndDisplayWatchedItems(itemType, page = 1) {
        showLoading(true);
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', '12');

        const url = `${API_BASE_URL}/user/watched_details/${itemType}?${params.toString()}`;
        console.log("[FETCH WATCHED ITEMS DETAILS - VIA BACKEND]", url);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({ message: `Erro HTTP: ${response.status}` }));
                throw new Error(errorResult.message || `Erro HTTP: ${response.status}`);
            }
            const result = await response.json();
            if (!result.success) throw new Error(result.message || 'Falha ao buscar itens assistidos.');

            const items = result.data;
            const paginationData = result.pagination;
            if (itemListElement) itemListElement.innerHTML = '';

            if (items && items.length > 0) {
                items.forEach(item => {
                    const card = document.createElement('li');
                    card.classList.add('anime-card');
                    let itemTitle = item.title;
                    let itemImage = item.cover_url || 'https://via.placeholder.com/200x280.png?text=Sem+Imagem';
                    let itemScoreInfo = `Nota: ${item.score !== null && item.score !== undefined ? item.score.toFixed(1) : 'N/A'}`;

                    let watchedButtonHTML = '';
                    if (loggedInUser) {
                        const isWatched = true;
                        watchedButtonHTML = `
                            <button class="watched-button watched" data-mal-id="${item.mal_id}" data-item-type="${itemType}" title="Remover dos Assistidos">
                                <span class="material-icons">visibility</span>
                                <span>Assistido</span>
                            </button>
                        `;
                    }
                    card.innerHTML = `
                        <img src="${itemImage}" alt="Capa de ${itemTitle}">
                        <div class="anime-card-content">
                            <h3>${itemTitle}</h3>
                            <p>${itemScoreInfo}</p>
                            <div class="card-actions">
                                <button class="details-button" data-id="${item.mal_id}" data-type="${itemType}">Detalhes</button>
                                ${watchedButtonHTML} 
                            </div>
                        </div>
                    `;
                    if (itemListElement) itemListElement.appendChild(card);
                });
                totalPages = paginationData?.total_pages || 1;
                currentPage = paginationData?.current_page || page;
                renderPaginationControls(currentFetchItemsFunction, itemType);
            } else {
                if (itemListElement) {
                    let itemDisplayType = itemType === 'anime' ? 'animes' : 'mangás';
                    itemListElement.innerHTML = `<li><p>Você ainda não marcou nenhum ${itemDisplayType} como assistido.</p></li>`;
                }
                if (paginationElement) paginationElement.innerHTML = '';
            }
        } catch (error) {
            console.error(`Erro ao buscar Meus ${itemType} Assistidos:`, error);
            if (itemListElement) itemListElement.innerHTML = '';
            displayError(`Não foi possível carregar seus ${itemType === 'anime' ? 'animes' : 'mangás'} assistidos. ${error.message}`);
        } finally {
            showLoading(false);
        }
    }

    // Listener
    if (navAnimes) {
        navAnimes.addEventListener('click', (e) => {
            e.preventDefault();
            setupSection('animes', 'Animes Populares', 'Categorias Animes', 'Buscar animes...', fetchAnimesByGenre, fetchAnimeGenres);
        });
    }
    if (navMangas) {
        navMangas.addEventListener('click', (e) => {
            e.preventDefault();
            setupSection('mangas', 'Mangás Populares', 'Categorias Mangá', 'Buscar mangás...', fetchMangasByGenre, fetchMangaGenres);
        });
    }

    // Listener para odernação
    if (sortBySelect) {
        sortBySelect.addEventListener('change', (event) => {
            const selectedOption = event.target.selectedOptions[0];
            currentSortBy = selectedOption.value;
            currentSortOrder = selectedOption.dataset.order;
            currentPage = 1;
            console.log(`[JS SORT] Ordenação alterada para: Critério=${currentSortBy}, Ordem=${currentSortOrder}`);
            if (currentSearchQuery && currentSection !== 'watched-animes' && currentSection !== 'watched-mangas') { 
                currentFetchItemsFunction(currentSearchQuery, currentPage);
            } else if (!currentSection.startsWith('watched-')) { 
                currentFetchItemsFunction(currentGenreId, currentPage);
            }
            // Preciso colocar sort na lista de assistidos
        });
    }

    // Listener para botão de busca
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            // Ainda não tem busca na sessão de assistidos
            if (currentSection.startsWith('watched-')) {
                alert("A busca não está habilitada para a lista de assistidos no momento.");
                return;
            }
            if (!query) { alert("Por favor, digite um termo para buscar."); return; }
            currentPage = 1;
            currentSearchQuery = query;
            currentGenreId = null; 
            if (selectedCategoryNameElement) selectedCategoryNameElement.textContent = `Resultados para "${query}"`;
            
            if (currentSection === 'animes') {
                currentFetchItemsFunction = fetchAnimesByGenre;
            } else if (currentSection === 'mangas') {
                currentFetchItemsFunction = fetchMangasByGenre;
            }
            currentFetchItemsFunction(currentSearchQuery, currentPage);
        });
    }
    
    // Listener no botão detalhes em assistidos
    if (itemListElement) {
        itemListElement.addEventListener('click', async (event) => {
            const target = event.target;
            const detailsButton = target.closest('.details-button');
            const watchedButton = target.closest('.watched-button');

            if (detailsButton) {
                const itemId = detailsButton.dataset.id;
                const itemType = detailsButton.dataset.type;
                if (itemId && itemType) {
                    window.open(`/details?id=${itemId}&type=${itemType}`, '_blank');
                }
            } else if (watchedButton && loggedInUser) {
                event.stopPropagation();
                const malId = parseInt(watchedButton.dataset.malId);
                let itemTypeForApi = watchedButton.dataset.itemType; 

                if (itemTypeForApi === 'animes') itemTypeForApi = 'anime';
                if (itemTypeForApi === 'mangas') itemTypeForApi = 'manga';

                const isCurrentlyWatched = watchedButton.classList.contains('watched');
                const method = isCurrentlyWatched ? 'DELETE' : 'POST';
                const url = `${API_BASE_URL}/user/watched/${itemTypeForApi}/${malId}`;

                try {
                    const response = await fetch(url, { method: method });
                    const result = await response.json();
                    if (response.ok && result.success) {
                        const iconSpan = watchedButton.querySelector('.material-icons');
                        const textSpan = watchedButton.querySelector('span:not(.material-icons)');
                        if (isCurrentlyWatched) {
                            watchedButton.classList.remove('watched');
                            watchedButton.title = 'Marcar como Assistido';
                            if (iconSpan) iconSpan.textContent = 'visibility_off';
                            if (textSpan) textSpan.textContent = 'Assistir';
                            if (itemTypeForApi === 'anime') watchedAnimeIds.delete(malId);
                        } else {
                            watchedButton.classList.add('watched');
                            watchedButton.title = 'Remover dos Assistidos';
                            if (iconSpan) iconSpan.textContent = 'visibility';
                            if (textSpan) textSpan.textContent = 'Assistido';
                            if (itemTypeForApi === 'anime') watchedAnimeIds.add(malId);
                        }
                        if (profileWatchedCountElement && result.watched_count !== undefined) {
                            profileWatchedCountElement.textContent = `Assistidos: ${result.watched_count}`;
                        }
                        const profilePageCounter = document.getElementById('profile-page-watched-count');
                        if (profilePageCounter && result.watched_count !== undefined){
                            profilePageCounter.textContent = result.watched_count;
                        }
                        // Recarrega a busca caso remover um item de assistidos
                        if (isCurrentlyWatched && currentSection === `watched-${itemTypeForApi}s`) {
                            fetchAndDisplayWatchedItems(itemTypeForApi, currentPage);
                        }
                    } else { alert(result.message || 'Erro ao atualizar status de assistido.'); }
                } catch (error) { console.error("Erro:", error); alert('Falha na comunicação.'); }
            }
        });
    }

    // Inicialização
    loadTheme();
    checkLoginStatusAndUpdateUI().then(() => {
        if (document.body.classList.contains('page-index-layout')) {
            if (sortBySelect && sortBySelect.options.length > 0) {
                currentSortBy = sortBySelect.options[0].value;
                currentSortOrder = sortBySelect.options[0].dataset.order;
            }
            setupSection('animes', 'Animes Populares', 'Categorias Animes', 'Buscar animes...', fetchAnimesByGenre, fetchAnimeGenres);
        }
    });
});