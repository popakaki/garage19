# Локальная база данных PostgreSQL

Для разработки используется PostgreSQL 16. Есть два варианта запуска.

## Вариант 1 (используется сейчас): системная служба Windows

PostgreSQL 16 установлен как служба `postgresql-x64-16` (запускается автоматически).

```powershell
Get-Service postgresql-x64-16          # проверить статус
Start-Service postgresql-x64-16        # запустить (нужны права администратора)
Stop-Service postgresql-x64-16         # остановить
```

Реквизиты подключения:

| Параметр | Значение |
| --- | --- |
| Хост / порт | `127.0.0.1:5432` |
| База | `garage19` |
| Роль | `garage19` / пароль `garage19` (SUPERUSER) |
| Суперпользователь | `postgres` / пароль `postgres` |
| Строка подключения | `postgresql://garage19:garage19@127.0.0.1:5432/garage19?schema=public` |

Утилиты: `C:\Program Files\PostgreSQL\16\bin` (`psql`, `pg_dump`, `createdb`).

## Вариант 2: переносимый кластер внутри проекта

Если системная служба недоступна, можно поднять отдельный кластер в `.pgdata`
(папка исключена из git):

```powershell
$PG = 'C:\Program Files\PostgreSQL\16\bin'
& "$PG\initdb.exe" -D .\.pgdata -U postgres -E UTF8 --auth=trust --locale=C
& "$PG\pg_ctl.exe" -D .\.pgdata -l .\.pgdata\server.log -o "-p 5433 -c listen_addresses=127.0.0.1" start
```

При использовании второго варианта укажите в `.env` порт `5433`.

## Полезные команды проекта

```bash
npm run db:push      # применить схему prisma/schema.prisma к БД
npm run db:seed      # залить демо-данные
npm run db:studio    # визуальный просмотр БД
npm run db:reset     # пересоздать схему и залить демо-данные заново
```

## Резервная копия

```powershell
$env:PGPASSWORD='garage19'
& 'C:\Program Files\PostgreSQL\16\bin\pg_dump.exe' -U garage19 -h 127.0.0.1 -d garage19 -Fc -f "backup-garage19-$(Get-Date -f yyyyMMdd-HHmm).dump"
```
