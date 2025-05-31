<p align="center">
  <img src="https://i.imgur.com/oDukAro.png" alt="Logo do Projeto" width="300">
</p>

<p align="center">
  <img src="https://i.imgur.com/9fGul5a.png" alt="Logo do Projeto" width="750">
</p>

# Catálogo de Animes e Mangás (AnimeTest)

Uma aplicação web construída com Flask para navegar, buscar e catalogar animes e mangás, utilizando a API Jikan. O projeto inclui funcionalidades como contas de usuário, upload de fotos de perfil, lista de itens assistidos, modo escuro e opções de ordenação.

## Funcionalidades Implementadas

* Navegação por Animes e Mangás em seções separadas.
* Listagem de itens por gênero.
* Listagem de itens populares com ordenação customizável.
* Busca de animes e mangás com ordenação.
* Página de detalhes para cada item (animes, mangás).
* Sistema de Contas de Usuário:
    * Registro de novos usuários.
    * Login e Logout (com persistência de sessão via cookies).
    * Página de perfil do usuário.
    * Upload de foto de perfil.
* Funcionalidade "Marcar como Assistido" para animes:
    * Botões nos cards para marcar/desmarcar.
    * Atualização da contagem de assistidos na sidebar e perfil.
    * Seção "Meus Animes Assistidos" para listar os itens marcados.
* Opções de Ordenação para listas de itens (por nome, nota, data de lançamento, popularidade).
* Modo Escuro (Dark Mode) com persistência da preferência do usuário via `localStorage`.
* Interface responsiva (básica).
* Configuração para servir arquivos de validação SSL (ex: para Let's Encrypt).
* Preparado para deploy em ambiente de produção com Gunicorn e Nginx (para proxy reverso e SSL).

## Tecnologias Utilizadas

* **Backend:**
    * Linguagem: Python 3
    * Framework: Flask
    * Servidor WSGI: Gunicorn (para produção em Linux), Waitress (sugerido para Windows ou desenvolvimento)
    * Banco de Dados: SQLite
    * ORM: Flask-SQLAlchemy
    * Migrações de Banco de Dados: Flask-Migrate (com Alembic)
    * Autenticação: Flask-Login
    * Manuseio de Senhas: Werkzeug (para hashing)
    * Middleware de Proxy: Werkzeug (`ProxyFix`)
    * Requisições HTTP (para API Jikan): `requests`
    * CORS: Flask-CORS
    * Variáveis de Ambiente: `python-dotenv` (para `.flaskenv`)
* **Frontend:**
    * HTML5 (com templates Jinja2)
    * CSS3 (com variáveis CSS para temas claro/escuro)
    * JavaScript (Vanilla JS, ES6+)
* **API Externa:**
    * [Jikan API v4](https://docs.api.jikan.moe/) (para dados de animes e mangás)
* **Ferramentas de Deploy (Ambiente Linux):**
    * Nginx (como proxy reverso, terminação SSL)
    * Certbot (para certificados SSL gratuitos Let's Encrypt)
    * `systemd` (para gerenciar o serviço Gunicorn)

## Estrutura do Projeto (Principais Pastas)
```bash
anime_test/
├── migrations/                 # Scripts de migração do Flask-Migrate/Alembic
├── static/                     # Arquivos estáticos (CSS, JS, imagens)
│   ├── css/
│   ├── js/
│   └── profile_pics/           # Fotos de perfil dos usuários
├── templates/                  # Templates HTML do Flask/Jinja2
├── venv/                       # Ambiente virtual Python (não versionar no Git)
├── .flaskenv                   # Variáveis de ambiente para o comando flask
├── .gitignore                  # Especifica arquivos e pastas a serem ignorados pelo Git
├── app.db                      # Banco de dados SQLite
├── app.py                      # Lógica principal da aplicação Flask (rotas, etc.)
├── config.py                   # Configurações da aplicação
├── jikan_client.py             # Módulo para interagir com a API Jikan
├── models.py                   # Modelos de dados SQLAlchemy (User, WatchedItem)
└── requirements.txt            # Dependências Python do projeto
```

## Configuração e Execução Local (Desenvolvimento)

Siga os passos abaixo para configurar e rodar o projeto localmente.

### Pré-requisitos

* Python 3 (testado com 3.11+)
* `pip` (gerenciador de pacotes Python)
* `git` (para clonar o repositório)

### 1. Clonar o Repositório
```bash
git clone <URL_DO_SEU_REPOSITORIO_NO_GITHUB>
cd nome-da-pasta-do-projeto # Ex: cd anime_test
```
### 2. Configurar o Ambiente Virtual
```bash
python3 -m venv venv
```
Ative o ambiente virtual:

* **Linux/macos:**
```bash
source venv/bin/activate
```

* **Windows(Powershell):**
```bash
.\venv\Scripts\Activate.ps1
```

* **Windows(CMD):**
```bash
venv\Scripts\activate
```
### 3. Instalar Dependências

Com o ambiente virtual ativo:
```bash
pip install -r requirements.txt
```

### 4. Configurar o Banco de Dados
Este projeto usa Flask-Migrate para gerenciar o esquema do banco de dados SQLite.
Crie um arquivo .flaskenv na raiz do projeto com o seguinte conteúdo:
```bash
FLASK_APP=app.py
FLASK_DEBUG=True
```
Execute os seguintes comandos de migração:

```bash
flask db init    # Execute apenas UMA VEZ se a pasta 'migrations' não existir
flask db migrate -m "Mensagem descritiva da migracao" # Gera o script de migração
flask db upgrade # Aplica a migração ao banco (cria/atualiza app.db)
```
Isso criará o arquivo app.db com as tabelas necessárias.

### 5. Configurações Adicionais
* **Pasta de Uploads:** Crie a pasta para fotos de perfil, se ainda não existir:  
```bash
mkdir -p static/profile_pics
```

Coloque uma imagem `default.jpg` (ou `.png`) nesta pasta.

* **Chave Secreta (`SECRET_KEY`):** A aplicação usa uma chave secreta definida em `config.py`. Para desenvolvimento, o valor fallback é usado. Para produção, defina `SECRET_KEY` como uma variável de ambiente.

### 6. Rodando o Servidor de Desenvolvimento
```bash
flask run
```
ou
```bash
python app.py
```
A aplicação estará acessível em http://127.0.0.1:5000/.

## Deploy em VM Ubuntu com Gunicorn, Nginx e SSL (HTTPS)

Estas são instruções resumidas para um deploy em produção:

### 1. Prepare a VM Ubuntu
   * **Atualize o sistema:** `sudo apt update && sudo apt upgrade -y`
   * **Instale Python, Pip, Venv:** `sudo apt install python3-pip python3-venv nginx -y`
   * **Instale Certbot:** `sudo apt install certbot python3-certbot-nginx -y`

### 2. Implante a Aplicação:
   * **Copie os arquivos do projeto para um diretório na VM (ex: `/var/www/anime_test`).**
   * **Configure o ambiente virtual, instale `requirements.txt` e `gunicorn`.**
   * **Execute as migrações do banco de dados: `export FLASK_APP=app.py; flask db upgrade`.**
   * **Crie a pasta `static/profile_pics` e defina permissões.**

### 3. Configure Gunicorn como Serviço `systemd`:
   * **Crie `/etc/systemd/system/anime_test.service` (ajuste `User`, `Group`, `WorkingDirectory`, `ExecStart`):**
```bash
[Unit]
Description=Gunicorn instance to serve anime_test
After=network.target

[Service]
User=ubuntu
Group=ubuntu 
WorkingDirectory=/var/www/anime_test
Environment="PATH=/var/www/anime_test/venv/bin"
ExecStart=/var/www/anime_test/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:5000 app:app
Restart=always
StandardOutput=journal
StandardError=journal
SyslogIdentifier=anime-test

[Install]
WantedBy=multi-user.target
```
* **Rode: `sudo systemctl daemon-reload`, `sudo systemctl start anime_test`, `sudo systemctl enable anime_test`.**

### 4. Configure Nginx como Proxy Reverso:

   * **Crie `/etc/nginx/sites-available/anime_test` (ajuste `server_name`, caminhos para `static` e `acme-challenge`):**
     
```bash
server {
    listen 80;
    listen [::]:80;
    server_name seu_dominio.com; # Ex: testeml.no-ip.net

    location /.well-known/acme-challenge/ {
        root /var/www/html; # Diretório para validação do Certbot
    }

    location / {
        return 301 https://$host$request_uri; # Redireciona HTTP para HTTPS
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name seu_dominio.com; # Ex: testeml.no-ip.net

    # Caminhos para os certificados SSL (serão configurados pelo Certbot)
    # ssl_certificate /etc/letsencrypt/live/seu_[dominio.com/fullchain.pem](https://dominio.com/fullchain.pem);
    # ssl_certificate_key /etc/letsencrypt/live/seu_[dominio.com/privkey.pem](https://dominio.com/privkey.pem);
    # include /etc/letsencrypt/options-ssl-nginx.conf;
    # ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # Gerado pelo Certbot

    location /static {
        alias /var/www/anime_test/static;
        expires 7d;
    }

    location / {
        proxy_pass [http://127.0.0.1:5000](http://127.0.0.1:5000);
        include proxy_params;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
} 
```

* **Crie o link simbólico: `sudo ln -s /etc/nginx/sites-available/anime_test /etc/nginx/sites-enabled/`**
* **Crie a pasta para o acme-challenge: `sudo mkdir -p /var/www/html` e `sudo chown www-data:www-data /var/www/html`**
* **Teste e recarregue o Nginx: `sudo nginx -t && sudo systemctl reload nginx`.**

### 5. Obtenha o Certificado SSL com Certbot:

   * **Certifique-se de que seu domínio aponta para o IP público da VM e que as portas 80 e 443 estão abertas no Security Group da AWS e no firewall da VM (`ufw`).**
   * **Rode: `sudo certbot --nginx -d seu_dominio.com` (substitua seu_dominio.com por seu dominio).**
   * **Siga as instruções do Certbot (ele deve modificar sua configuração do Nginx para habilitar SSL).**
    
* **Acesse sua aplicação em `https://seu_dominio.com`.**
