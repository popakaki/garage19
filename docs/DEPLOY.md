# Деплой Garage19

Домен пока не выбран, поэтому деплой выполняется **по запросу**: код и все заготовки готовы,
нужно только указать сервер и домен.

## Что потребуется от заказчика

| # | Что нужно | Зачем |
| --- | --- | --- |
| 1 | VPS: IP-адрес, root/SSH-доступ (Ubuntu 22.04/24.04, 2 vCPU, 4 ГБ RAM, 40+ ГБ SSD) | Размещение сайта и БД |
| 2 | Доменное имя (например `garage19.ru`) и доступ к DNS-панели | A-запись на IP сервера |
| 3 | Реквизиты ИП/ООО (название, ИНН, ОГРН, адрес, телефон) | Оферта, чеки, счёт для юрлиц |
| 4 | Договор эквайринга (ЮKassa / Тинькофф / Сбербанк) | Онлайн-оплата картой |
| 5 | Договор с СДЭК / Boxberry / Почтой России, ключи API | Расчёт доставки и ПВЗ |
| 6 | SMTP или сервис рассылок (Unisender, SendPulse, Mailgun) | Письма клиентам и уведомления |

До получения пунктов 4–6 сайт работает в режиме «оформление заявки»: заказ создаётся, менеджер
подтверждает его вручную, оплата — при получении или по счёту.

---

## Вариант A (рекомендуемый): Docker Compose на VPS

### 1. Подготовка сервера

```bash
ssh root@<IP>
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin git ufw
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

### 2. Код и переменные окружения

```bash
mkdir -p /opt && cd /opt
git clone https://github.com/popakaki/garage19.git
cd garage19
cp .env.example .env && nano .env
```

Обязательно изменить в `.env`:

```env
DATABASE_URL="postgresql://garage19:<СИЛЬНЫЙ_ПАРОЛЬ>@db:5432/garage19?schema=public"
NEXT_PUBLIC_SITE_URL="https://garage19.ru"
APP_SECRET="<48 случайных байт в hex>"
ADMIN_EMAIL="admin@garage19.ru"
ADMIN_PASSWORD="<сильный пароль вместо дефолтного>"
POSTGRES_USER=garage19
POSTGRES_PASSWORD=<СИЛЬНЫЙ_ПАРОЛЬ>
```

Сгенерировать секрет: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

### 3. Запуск

```bash
docker compose up -d --build

# первичная инициализация схемы и демо-данных (один раз)
docker compose exec app npx prisma db push
docker compose exec app npx tsx prisma/seed.ts   # опционально: демо-каталог
```

Приложение слушает `127.0.0.1:3000`, PostgreSQL — `127.0.0.1:5432` (наружу не открыты).

### 4. Nginx и HTTPS

```bash
apt install -y nginx certbot python3-certbot-nginx
```

`/etc/nginx/sites-available/garage19`:

```nginx
server {
    listen 80;
    server_name garage19.ru www.garage19.ru;

    client_max_body_size 32m;
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/garage19 /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d garage19.ru -d www.garage19.ru --redirect
```

После получения сертификата обновите `NEXT_PUBLIC_SITE_URL` на `https://…` и выполните
`docker compose up -d` (адрес используется в SEO, sitemap и абсолютных ссылках).

### 5. Автозапуск, логи, обновление

```bash
docker compose ps                 # статус
docker compose logs -f app        # логи приложения
docker compose logs -f db         # логи БД
```

Приложение и БД поднимаются автоматически (`restart: unless-stopped`).

Обновление кода:

```bash
cd /opt/garage19
git pull
docker compose up -d --build
docker compose exec app npx prisma db push   # если менялась схема
```

---

## Вариант B: PM2 + Nginx без Docker

```bash
apt install -y nodejs npm nginx postgresql
# Node.js 22 через nodesource, если версия в репозитории старее

cd /opt/garage19
npm ci
cp .env.example .env && nano .env
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run build
npm i -g pm2
pm2 start npm --name garage19 -- start
pm2 startup && pm2 save
```

Nginx — тот же конфиг, но `proxy_pass http://127.0.0.1:3000;`.

---

## Вариант C: Vercel + облачная БД

1. Создать БД в Neon/Supabase, получить `DATABASE_URL` (с `?sslmode=require`).
2. Импортировать репозиторий в Vercel, задать переменные окружения из `.env.example`.
3. `Build Command`: `npm run build`, `Install Command`: `npm install`.
4. Выполнить `npx prisma db push` локально с production-`DATABASE_URL`.
5. Ограничения: загрузка файлов в `public/uploads` на Vercel не работает — потребуется S3-хранилище
   или подключение Vercel Blob. Для российского рынка вариант A предпочтительнее.

---

## Резервные копии

`/opt/garage19/backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M)
DIR=/opt/backups/garage19
mkdir -p "$DIR"
docker compose -f /opt/garage19/docker-compose.yml exec -T db \
  pg_dump -U garage19 -d garage19 -Fc > "$DIR/db-$STAMP.dump"
tar -czf "$DIR/uploads-$STAMP.tar.gz" -C /opt/garage19/public uploads
find "$DIR" -type f -mtime +30 -delete
```

```bash
chmod +x /opt/garage19/backup.sh
crontab -e
# каждый день в 03:30
30 3 * * * /opt/garage19/backup.sh >> /var/log/garage19-backup.log 2>&1
```

Восстановление:

```bash
docker compose exec -T db pg_restore -U garage19 -d garage19 --clean --if-exists < db-<STAMP>.dump
```

---

## Чек-лист после первого деплоя

- [ ] Сменён пароль администратора и `APP_SECRET`.
- [ ] Пароль PostgreSQL отличается от dev-значения, порт БД закрыт файрволом.
- [ ] `NEXT_PUBLIC_SITE_URL` указывает на рабочий домен, sitemap доступен по `/sitemap.xml`.
- [ ] Проверены: главная, конфигуратор подбора, категория каталога, карточка товара,
      корзина → оформление → страница заказа, вход в личный кабинет, вход в админку.
- [ ] В админке заполнены: контакты, реквизиты, города и тарифы доставки, пункты выдачи.
- [ ] Загружен реальный каталог (вручную или импортом прайсов XML/YML/CSV).
- [ ] Подключены ключи доставки (СДЭК, Boxberry, Почта) и оплаты (ЮKassa); после этого
      `DELIVERY_MOCK=false`.
- [ ] Настроены Яндекс.Метрика и/или Google Analytics (код вставляется в `src/app/layout.tsx`).
- [ ] Проверен бэкап: создан дамп и выполнено тестовое восстановление.
