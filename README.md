# pdffit
pdffit compress pdf
# Пошаговая инструкция по установке PDF Конвертера на Ubuntu для pdffit.ru

## Предварительные требования

- Сервер с Ubuntu 20.04 или 22.04 LTS
- Root доступ или пользователь с sudo правами
- Домен pdffit.ru с настроенными DNS записями (A-запись должна указывать на IP вашего сервера)

---

## Шаг 1: Подключение к серверу

```bash
# Подключитесь к серверу по SSH
ssh root@your_server_ip
# или
ssh username@your_server_ip
```

---

## Шаг 2: Обновление системы

```bash
# Обновляем список пакетов
sudo apt update

# Обновляем установленные пакеты
sudo apt upgrade -y

# Устанавливаем необходимые системные пакеты
sudo apt install -y python3 python3-pip python3-venv nginx supervisor curl wget git
```

**Проверка установки:**
```bash
python3 --version  # Должно быть 3.8 или выше
nginx -v           # Проверяем Nginx
```

---

## Шаг 3: Создание пользователя для приложения

```bash
# Создаем нового пользователя без sudo прав
sudo adduser pdfapp --disabled-password --gecos ""

# Проверяем создание
id pdfapp
```

**Ожидаемый результат:**
```
uid=1001(pdfapp) gid=1001(pdfapp) groups=1001(pdfapp)
```

---

## Шаг 4: Переключение на пользователя pdfapp

```bash
# Переключаемся на нового пользователя
sudo su - pdfapp

# Проверяем текущую директорию
pwd
# Должно показать: /home/pdfapp
```

---

## Шаг 5: Создание структуры проекта

```bash
# Создаем директории
mkdir -p ~/pdf-converter/templates
mkdir -p ~/pdf-converter/static
mkdir -p ~/pdf-converter/logs

# Переходим в директорию проекта
cd ~/pdf-converter

# Проверяем структуру
ls -la
```

---

## Шаг 6: Загрузка файлов проекта

**Вариант A: Загрузка через scp (с вашего компьютера)**

Откройте новый терминал на вашем компьютере (не на сервере):

```bash
# Разархивируйте pdf-converter.zip
unzip pdf-converter.zip

# Загрузите файлы на сервер
scp -r pdf-converter/* pdfapp@your_server_ip:/home/pdfapp/pdf-converter/
```

**Вариант B: Загрузка через wget (если архив доступен по URL)**

На сервере под пользователем pdfapp:

```bash
cd ~/pdf-converter
wget https://your-url.com/pdf-converter.zip
unzip pdf-converter.zip
mv pdf-converter/* .
rm -rf pdf-converter pdf-converter.zip
```

**Вариант C: Создание файлов вручную**

```bash
cd ~/pdf-converter

# Создаем app.py
nano app.py
# Скопируйте содержимое из архива и вставьте
# Сохраните: Ctrl+O, Enter, Ctrl+X

# Создаем requirements.txt
nano requirements.txt
# Вставьте:
Flask==3.0.0
PyPDF2==3.0.1
Werkzeug==3.0.1
# Сохраните: Ctrl+O, Enter, Ctrl+X

# Создаем templates/index.html
nano templates/index.html
# Скопируйте содержимое из архива
# Сохраните: Ctrl+O, Enter, Ctrl+X

# Создаем static/style.css
nano static/style.css
# Скопируйте содержимое из архива
# Сохраните: Ctrl+O, Enter, Ctrl+X

# Создаем static/script.js
nano static/script.js
# Скопируйте содержимое из архива
# Сохраните: Ctrl+O, Enter, Ctrl+X
```

**Проверка структуры:**
```bash
cd ~/pdf-converter
tree
# или
ls -R
```

**Ожидаемый результат:**
```
/home/pdfapp/pdf-converter/
├── app.py
├── requirements.txt
├── logs/
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── script.js
```

---

## Шаг 7: Создание виртуального окружения

```bash
cd ~/pdf-converter

# Создаем виртуальное окружение
python3 -m venv venv

# Проверяем создание
ls -la venv/
```

---

## Шаг 8: Активация виртуального окружения и установка зависимостей

```bash
# Активируем виртуальное окружение
source venv/bin/activate

# Проверяем активацию - должен появиться префикс (venv)
# Командная строка должна выглядеть так: (venv) pdfapp@hostname:~/pdf-converter$

# Обновляем pip
pip install --upgrade pip

# Устанавливаем зависимости
pip install -r requirements.txt

# Дополнительно устанавливаем Gunicorn
pip install gunicorn

# Проверяем установку
pip list
```

**Ожидаемый вывод pip list:**
```
Flask           3.0.0
PyPDF2          3.0.1
Werkzeug        3.0.1
gunicorn        21.2.0
...
```

---

## Шаг 9: Тестовый запуск приложения

```bash
# Убедитесь, что виртуальное окружение активно (префикс venv)
cd ~/pdf-converter
source venv/bin/activate

# Запускаем приложение в тестовом режиме
python app.py
```

**Ожидаемый вывод:**
```
 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment.
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5000
 * Running on http://YOUR_SERVER_IP:5000
```

**Тестирование:**
Откройте новый терминал и выполните:
```bash
curl http://localhost:5000
```

Должна вернуться HTML страница.

**Остановка:**
Нажмите `Ctrl+C` для остановки тестового сервера.

```bash
# Деактивируем виртуальное окружение
deactivate

# Выходим из пользователя pdfapp
exit
```

---

## Шаг 10: Создание конфигурации Gunicorn

```bash
# Переключаемся обратно на pdfapp
sudo su - pdfapp
cd ~/pdf-converter

# Создаем файл конфигурации
nano gunicorn_config.py
```

**Вставьте следующее содержимое:**
```python
# Gunicorn configuration file
bind = "127.0.0.1:8000"
workers = 3
worker_class = "sync"
timeout = 120
max_requests = 1000
max_requests_jitter = 100
accesslog = "/home/pdfapp/pdf-converter/logs/gunicorn-access.log"
errorlog = "/home/pdfapp/pdf-converter/logs/gunicorn-error.log"
loglevel = "info"
proc_name = "pdf-converter"
daemon = False
```

**Сохраните:** `Ctrl+O`, `Enter`, `Ctrl+X`

**Тестирование Gunicorn:**
```bash
cd ~/pdf-converter
source venv/bin/activate
gunicorn -c gunicorn_config.py app:app
```

Должно запуститься без ошибок. Нажмите `Ctrl+C` для остановки.

```bash
deactivate
exit
```

---

## Шаг 11: Настройка Supervisor (автозапуск приложения)

```bash
# Выходим из пользователя pdfapp (если еще не вышли)
exit

# Создаем конфигурацию Supervisor
sudo nano /etc/supervisor/conf.d/pdf-converter.conf
```

**Вставьте следующее содержимое:**
```ini
[program:pdf-converter]
command=/home/pdfapp/pdf-converter/venv/bin/gunicorn -c /home/pdfapp/pdf-converter/gunicorn_config.py app:app
directory=/home/pdfapp/pdf-converter
user=pdfapp
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stderr_logfile=/home/pdfapp/pdf-converter/logs/supervisor-error.log
stdout_logfile=/home/pdfapp/pdf-converter/logs/supervisor-access.log
environment=PATH="/home/pdfapp/pdf-converter/venv/bin"
```

**Сохраните:** `Ctrl+O`, `Enter`, `Ctrl+X`

**Применяем конфигурацию:**
```bash
# Перечитываем конфигурацию Supervisor
sudo supervisorctl reread

# Применяем изменения
sudo supervisorctl update

# Запускаем приложение
sudo supervisorctl start pdf-converter

# Проверяем статус
sudo supervisorctl status pdf-converter
```

**Ожидаемый вывод:**
```
pdf-converter                    RUNNING   pid 12345, uptime 0:00:05
```

**Если статус FATAL или BACKOFF:**
```bash
# Смотрим логи ошибок
sudo tail -f /home/pdfapp/pdf-converter/logs/supervisor-error.log
# Нажмите Ctrl+C для выхода
```

---

## Шаг 12: Настройка Nginx для домена pdffit.ru

```bash
# Создаем конфигурацию Nginx
sudo nano /etc/nginx/sites-available/pdffit.ru
```

**Вставьте следующее содержимое:**
```nginx
server {
    listen 80;
    server_name pdffit.ru www.pdffit.ru;

    # Максимальный размер загружаемого файла
    client_max_body_size 50M;

    # Логирование
    access_log /var/log/nginx/pdffit-access.log;
    error_log /var/log/nginx/pdffit-error.log;

    # Статические файлы
    location /static/ {
        alias /home/pdfapp/pdf-converter/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Проксирование на Gunicorn
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Таймауты для обработки файлов
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
```

**Сохраните:** `Ctrl+O`, `Enter`, `Ctrl+X`

**Активируем сайт:**
```bash
# Создаем символическую ссылку
sudo ln -s /etc/nginx/sites-available/pdffit.ru /etc/nginx/sites-enabled/

# Удаляем дефолтную конфигурацию (если есть)
sudo rm -f /etc/nginx/sites-enabled/default

# Проверяем корректность конфигурации
sudo nginx -t
```

**Ожидаемый вывод:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**Перезапускаем Nginx:**
```bash
sudo systemctl restart nginx

# Проверяем статус
sudo systemctl status nginx
```

**Должно быть:** `active (running)`

---

## Шаг 13: Настройка файрволла UFW

```bash
# Проверяем статус UFW
sudo ufw status

# Разрешаем SSH (ВАЖНО! Иначе потеряете доступ)
sudo ufw allow 22/tcp

# Разрешаем HTTP
sudo ufw allow 80/tcp

# Разрешаем HTTPS
sudo ufw allow 443/tcp

# Включаем файрволл
sudo ufw --force enable

# Проверяем правила
sudo ufw status verbose
```

**Ожидаемый вывод:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

---

## Шаг 14: Проверка работоспособности

```bash
# 1. Проверяем статус приложения
sudo supervisorctl status pdf-converter
# Должно быть: RUNNING

# 2. Проверяем статус Nginx
sudo systemctl status nginx
# Должно быть: active (running)

# 3. Проверяем открытые порты
sudo netstat -tulpn | grep -E ':(80|8000)'

# 4. Тестируем локально
curl -I http://localhost
# Должно вернуть: HTTP/1.1 200 OK

# 5. Тестируем через домен (с другого компьютера или в браузере)
curl -I http://pdffit.ru
```

**Откройте браузер и перейдите:**
- http://pdffit.ru
- http://www.pdffit.ru

Должна открыться страница приложения.

---

## Шаг 15: Установка SSL сертификата (HTTPS)

```bash
# Устанавливаем Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получаем SSL сертификат
sudo certbot --nginx -d pdffit.ru -d www.pdffit.ru
```

**Следуйте инструкциям:**
1. Введите email для уведомлений
2. Согласитесь с Terms of Service (Y)
3. Выберите перенаправление HTTP на HTTPS (рекомендуется: 2)

**Ожидаемый результат:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/pdffit.ru/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/pdffit.ru/privkey.pem
```

**Проверка автообновления:**
```bash
sudo certbot renew --dry-run
```

**Тестирование HTTPS:**
```bash
curl -I https://pdffit.ru
```

Откройте в браузере: **https://pdffit.ru**

---

## Шаг 16: Финальная проверка

### Проверка всех компонентов:

```bash
# 1. Python приложение
sudo supervisorctl status pdf-converter

# 2. Nginx
sudo systemctl status nginx

# 3. Логи приложения
sudo tail -20 /home/pdfapp/pdf-converter/logs/gunicorn-error.log

# 4. Логи Nginx
sudo tail -20 /var/log/nginx/pdffit-error.log

# 5. Открытые порты
sudo ss -tulpn | grep -E ':(80|443|8000)'
```

### Тестирование функциональности:

1. Откройте https://pdffit.ru в браузере
2. Выберите PDF файл в секции "Сжать PDF"
3. Настройте ползунок качества
4. Нажмите "Сжать PDF"
5. Проверьте появление прогресс-бара
6. **Проверьте появление кнопки "Скачать результат"**
7. Проверьте появление кнопки "Поддержать проект"
8. Скачайте файл

---

## Устранение проблем

### Проблема 1: Приложение не запускается

```bash
# Проверяем логи Supervisor
sudo supervisorctl tail -f pdf-converter stderr

# Проверяем синтаксис Python
sudo su - pdfapp
cd ~/pdf-converter
source venv/bin/activate
python -m py_compile app.py
```

### Проблема 2: Nginx возвращает 502 Bad Gateway

```bash
# Проверяем, работает ли Gunicorn
ps aux | grep gunicorn

# Проверяем, слушает ли на порту 8000
sudo netstat -tulpn | grep 8000

# Перезапускаем приложение
sudo supervisorctl restart pdf-converter

# Смотрим логи
sudo tail -f /home/pdfapp/pdf-converter/logs/gunicorn-error.log
```

### Проблема 3: Кнопка "Скачать результат" не появляется

**Проверка JavaScript ошибок:**

1. Откройте браузер
2. Нажмите F12 (Developer Tools)
3. Перейдите на вкладку Console
4. Загрузите файл и обработайте
5. Проверьте наличие ошибок

**Проверка путей к статическим файлам:**

```bash
# Проверяем наличие файлов
ls -la /home/pdfapp/pdf-converter/static/

# Проверяем права доступа
sudo chmod -R 755 /home/pdfapp/pdf-converter/static/

# Проверяем владельца
sudo chown -R pdfapp:pdfapp /home/pdfapp/pdf-converter/static/
```

**Проверка конфигурации Nginx для статики:**

```bash
# Тестируем прямой доступ к статическим файлам
curl -I http://pdffit.ru/static/script.js
# Должно вернуть: HTTP/1.1 200 OK

curl -I http://pdffit.ru/static/style.css
# Должно вернуть: HTTP/1.1 200 OK
```

**Если файлы не доступны:**

```bash
# Перезапускаем Nginx
sudo systemctl restart nginx

# Проверяем логи Nginx
sudo tail -f /var/log/nginx/pdffit-error.log
```

### Проблема 4: Ошибка при загрузке файлов

```bash
# Проверяем лимит размера файла в Nginx
grep client_max_body_size /etc/nginx/sites-available/pdffit.ru

# Должно быть: client_max_body_size 50M;

# Если нужно изменить:
sudo nano /etc/nginx/sites-available/pdffit.ru
# Измените значение и сохраните

# Перезапустите Nginx
sudo systemctl restart nginx
```

---

## Полезные команды

### Управление приложением:

```bash
# Остановить
sudo supervisorctl stop pdf-converter

# Запустить
sudo supervisorctl start pdf-converter

# Перезапустить
sudo supervisorctl restart pdf-converter

# Статус
sudo supervisorctl status pdf-converter

# Логи в реальном времени
sudo supervisorctl tail -f pdf-converter stderr
```

### Просмотр логов:

```bash
# Логи приложения (Gunicorn)
sudo tail -f /home/pdfapp/pdf-converter/logs/gunicorn-error.log
sudo tail -f /home/pdfapp/pdf-converter/logs/gunicorn-access.log

# Логи Nginx
sudo tail -f /var/log/nginx/pdffit-error.log
sudo tail -f /var/log/nginx/pdffit-access.log

# Логи Supervisor
sudo tail -f /home/pdfapp/pdf-converter/logs/supervisor-error.log
```

### Обновление приложения:

```bash
# Переключаемся на пользователя
sudo su - pdfapp
cd ~/pdf-converter

# Активируем виртуальное окружение
source venv/bin/activate

# Обновляем код (замените файлы)
# nano app.py
# nano templates/index.html
# и т.д.

# Выходим
deactivate
exit

# Перезапускаем приложение
sudo supervisorctl restart pdf-converter
```

---

## Резервное копирование

### Создание бэкапа:

```bash
# Создаем директорию для бэкапов
sudo mkdir -p /backups

# Создаем архив
sudo tar -czf /backups/pdf-converter-$(date +%Y%m%d_%H%M%S).tar.gz /home/pdfapp/pdf-converter

# Проверяем
ls -lh /backups/
```

### Автоматическое резервное копирование:

```bash
# Создаем скрипт
sudo nano /usr/local/bin/backup-pdf-converter.sh
```

**Содержимое:**
```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf $BACKUP_DIR/pdf-converter-$DATE.tar.gz /home/pdfapp/pdf-converter
find $BACKUP_DIR -name "pdf-converter-*.tar.gz" -mtime +7 -delete
```

```bash
# Делаем исполняемым
sudo chmod +x /usr/local/bin/backup-pdf-converter.sh

# Добавляем в cron (ежедневно в 2 ночи)
sudo crontab -e

# Добавьте строку:
0 2 * * * /usr/local/bin/backup-pdf-converter.sh
```

---

## Итоговая проверка

После выполнения всех шагов:

✅ Приложение запущено и работает  
✅ Nginx проксирует запросы на Gunicorn  
✅ SSL сертификат установлен (HTTPS работает)  
✅ Файрволл настроен  
✅ Автозапуск через Supervisor работает  
✅ Сайт доступен по адресу https://pdffit.ru  
✅ Функции сжатия и удаления страниц работают  
✅ Кнопка "Скачать результат" появляется  
✅ Кнопка "Поддержать проект" отображается  

**Ваш PDF Конвертер полностью готов к использованию!** 🎉

---

## Контакты и поддержка

Если возникли проблемы:

1. Проверьте логи (раздел "Просмотр логов")
2. Убедитесь, что все шаги выполнены
3. Проверьте статус всех сервисов
4. Проверьте доступность статических файлов

Для дальнейшей помощи предоставьте:
- Вывод `sudo supervisorctl status`
- Логи из `/home/pdfapp/pdf-converter/logs/gunicorn-error.log`
- Логи из `/var/log/nginx/pdffit-error.log`
