# Smoke-тест Garage19: поднимает собранное приложение и проверяет ключевые страницы.
# Использование: pwsh -File scripts/smoke.ps1 [-Port 3100] [-NoBuild]
param(
  [int]$Port = 3100,
  [switch]$NoBuild
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $NoBuild) {
  Write-Host "==> Сборка приложения" -ForegroundColor Cyan
  cmd /c "npm run build 2>&1" | Select-Object -Last 12
  if ($LASTEXITCODE -ne 0) { Write-Host "СБОРКА УПАЛА" -ForegroundColor Red; exit 1 }
}

$env:PORT = $Port
Write-Host "==> Запуск сервера на порту $Port" -ForegroundColor Cyan
$server = Start-Process -FilePath "cmd" -ArgumentList "/c", "npx next start -p $Port" -PassThru -WindowStyle Hidden

try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 2
    try {
      $probe = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/robots.txt" -UseBasicParsing -TimeoutSec 5
      if ($probe.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
  }
  if (-not $ready) { Write-Host "СЕРВЕР НЕ ПОДНЯЛСЯ" -ForegroundColor Red; exit 1 }

  $pages = @(
    @{ url = "/";                       name = "Главная";                 expect = "Подбор по автомобилю" },
    @{ url = "/catalog";                name = "Каталог";                 expect = "Каталог" },
    @{ url = "/catalog/bagazhniki";     name = "Категория (багажники)";   expect = "Багажники" },
    @{ url = "/podbor";                 name = "Подбор по авто";          expect = "Подбор" },
    @{ url = "/podbor/toyota";          name = "Посадочная: марка";       expect = "Toyota" },
    @{ url = "/podbor/toyota/camry";    name = "Посадочная: модель";      expect = "Camry" },
    @{ url = "/brands";                 name = "Бренды";                  expect = "Бренд" },
    @{ url = "/search?q=%D0%B1%D0%B0%D0%B3%D0%B0%D0%B6%D0%BD%D0%B8%D0%BA"; name = "Поиск"; expect = "Поиск" },
    @{ url = "/cart";                   name = "Корзина";                 expect = "Корзин" },
    @{ url = "/checkout";               name = "Оформление";              expect = "Оформлен" },
    @{ url = "/account/login";          name = "Вход в ЛК";               expect = "Вход" },
    @{ url = "/account/garage";         name = "Гараж";                   expect = "Гараж" },
    @{ url = "/install";                name = "Запись на установку";     expect = "установк" },
    @{ url = "/compare";                name = "Сравнение";               expect = "Сравнен" },
    @{ url = "/admin/login";            name = "Вход в админку";          expect = "админ" },
    @{ url = "/sitemap.xml";            name = "Sitemap";                 expect = "urlset" },
    @{ url = "/robots.txt";             name = "Robots";                  expect = "Sitemap" },
    @{ url = "/dostavka";               name = "Доставка";                expect = "Доставка" },
    @{ url = "/oplata";                 name = "Оплата";                  expect = "Оплат" }
  )

  $failed = 0
  foreach ($page in $pages) {
    $result = "OK"
    $code = 0
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port$($page.url)" -UseBasicParsing -TimeoutSec 25
      $code = $response.StatusCode
      if ($response.Content -notmatch [regex]::Escape($page.expect)) { $result = "НЕТ ОЖИДАЕМОГО ТЕКСТА"; $failed++ }
    } catch {
      $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
      $result = "ОШИБКА: $($_.Exception.Message)"
      $failed++
    }
    $color = if ($result -eq "OK") { "Green" } else { "Red" }
    Write-Host ("{0,-6} {1,-28} {2,-24} {3}" -f $code, $page.name, $page.url, $result) -ForegroundColor $color
  }

  # Проверка админки (закрыта авторизацией → редирект на /admin/login)
  try {
    $admin = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/admin" -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 15
    Write-Host ("{0,-6} {1,-28} {2}" -f $admin.StatusCode, "Админка (должна редиректить)", "/admin → /admin/login") -ForegroundColor Yellow
  } catch {
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    $location = if ($_.Exception.Response) { $_.Exception.Response.Headers["Location"] } else { "" }
    if ($status -eq 307 -or $status -eq 302 -or $status -eq 303) {
      Write-Host ("{0,-6} {1,-28} → {2}" -f $status, "Защита админки работает", $location) -ForegroundColor Green
    } else {
      Write-Host ("{0,-6} {1,-28} {2}" -f $status, "Админка", "неожиданный ответ") -ForegroundColor Red
      $failed++
    }
  }

  Write-Host ""
  if ($failed -eq 0) { Write-Host "ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ" -ForegroundColor Green } else { Write-Host "ПРОБЛЕМ: $failed" -ForegroundColor Red }
  exit $failed
} finally {
  Write-Host "==> Остановка сервера" -ForegroundColor Cyan
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
  # Процесс Next.js запускается дочерним: добиваем владельца порта
  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}
