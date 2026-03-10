<?php
/**
 * ============================================================================
 * ISG Akademi — Production Auto Installer
 * ============================================================================
 * 
 * Single-file installer for React + Vite + Supabase application.
 * Upload entire project to /public_html/ and visit domain.com/install.php
 * 
 * Requirements: PHP >= 8.1, Node.js >= 18, npm or bun
 * 
 * @version 2.0.0
 * @author  ISG Akademi DevOps
 */

// ─── Security ────────────────────────────────────────────────────────────────
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
set_time_limit(600); // 10 minutes for build
date_default_timezone_set('Europe/Istanbul');

// Prevent re-installation
if (file_exists(__DIR__ . '/install.lock')) {
    http_response_code(403);
    die('<!DOCTYPE html><html><head><title>Kurulum Kilitli</title></head><body style="font-family:sans-serif;text-align:center;padding:60px"><h1>⛔ Kurulum Zaten Tamamlandı</h1><p>Yeniden kurulum yapmak için <code>install.lock</code> dosyasını silin.</p></body></html>');
}

// CSRF token
session_start();
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// ─── Constants ───────────────────────────────────────────────────────────────
define('BASE_DIR', __DIR__);
define('DIST_DIR', BASE_DIR . '/dist');
define('APP_DIR', BASE_DIR . '/app');
define('ENV_FILE', BASE_DIR . '/.env');
define('LOG_FILE', BASE_DIR . '/install.log');
define('MIN_PHP', '8.1.0');
define('MIN_NODE', '18.0.0');

// ─── Helper Functions ────────────────────────────────────────────────────────

function writeLog(string $message): void {
    $ts = date('Y-m-d H:i:s');
    @file_put_contents(LOG_FILE, "[$ts] $message\n", FILE_APPEND | LOCK_EX);
}

function execCmd(string $cmd): array {
    $output = [];
    $code = 1;
    exec($cmd . ' 2>&1', $output, $code);
    $result = implode("\n", $output);
    writeLog("CMD: $cmd → exit=$code");
    if ($result) writeLog("OUT: " . substr($result, 0, 500));
    return ['output' => $result, 'code' => $code];
}

function getVersion(string $cmd): ?string {
    $r = execCmd("$cmd --version");
    if ($r['code'] !== 0) return null;
    if (preg_match('/(\d+\.\d+\.\d+)/', $r['output'], $m)) return $m[1];
    return trim($r['output']);
}

function checkRequirements(): array {
    $checks = [];

    // PHP version
    $phpVer = PHP_VERSION;
    $checks['php'] = [
        'label' => 'PHP >= ' . MIN_PHP,
        'value' => $phpVer,
        'pass'  => version_compare($phpVer, MIN_PHP, '>='),
    ];

    // exec()
    $execDisabled = explode(',', ini_get('disable_functions'));
    $execDisabled = array_map('trim', $execDisabled);
    $checks['exec'] = [
        'label' => 'exec() aktif',
        'value' => in_array('exec', $execDisabled) ? 'Devre dışı' : 'Aktif',
        'pass'  => !in_array('exec', $execDisabled),
    ];

    // shell_exec()
    $checks['shell_exec'] = [
        'label' => 'shell_exec() aktif',
        'value' => in_array('shell_exec', $execDisabled) ? 'Devre dışı' : 'Aktif',
        'pass'  => !in_array('shell_exec', $execDisabled),
    ];

    // Node.js
    $nodeVer = getVersion('node');
    $checks['node'] = [
        'label' => 'Node.js >= ' . MIN_NODE,
        'value' => $nodeVer ?: 'Bulunamadı',
        'pass'  => $nodeVer && version_compare($nodeVer, MIN_NODE, '>='),
    ];

    // npm
    $npmVer = getVersion('npm');
    $checks['npm'] = [
        'label' => 'npm',
        'value' => $npmVer ?: 'Bulunamadı',
        'pass'  => (bool)$npmVer,
    ];

    // bun (optional)
    $bunVer = getVersion('bun');
    $checks['bun'] = [
        'label' => 'bun (opsiyonel)',
        'value' => $bunVer ?: 'Bulunamadı',
        'pass'  => true, // optional
        'optional' => true,
    ];

    // Write permissions
    $writable = is_writable(BASE_DIR);
    $checks['write'] = [
        'label' => 'Yazma izni (' . BASE_DIR . ')',
        'value' => $writable ? 'Evet' : 'Hayır',
        'pass'  => $writable,
    ];

    // package.json exists
    $checks['package'] = [
        'label' => 'package.json mevcut',
        'value' => file_exists(BASE_DIR . '/package.json') ? 'Evet' : 'Hayır',
        'pass'  => file_exists(BASE_DIR . '/package.json'),
    ];

    return $checks;
}

function sanitize(string $input): string {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

function validateUrl(string $url): bool {
    return (bool)filter_var($url, FILTER_VALIDATE_URL);
}

function validateEmail(string $email): bool {
    return (bool)filter_var($email, FILTER_VALIDATE_EMAIL);
}

// ─── AJAX Install Handler ────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'install') {
    header('Content-Type: application/json; charset=utf-8');

    // CSRF check
    if (!isset($_POST['csrf']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf'])) {
        echo json_encode(['ok' => false, 'step' => 0, 'msg' => 'Geçersiz CSRF token']);
        exit;
    }

    // Validate inputs
    $siteName   = sanitize($_POST['site_name'] ?? '');
    $adminEmail = sanitize($_POST['admin_email'] ?? '');
    $supaUrl    = sanitize($_POST['supabase_url'] ?? '');
    $supaAnon   = sanitize($_POST['supabase_anon'] ?? '');
    $supaService = sanitize($_POST['supabase_service'] ?? '');
    $env        = ($_POST['environment'] ?? 'production') === 'development' ? 'development' : 'production';
    $pkgManager = ($_POST['pkg_manager'] ?? 'npm') === 'bun' ? 'bun' : 'npm';

    $errors = [];
    if (strlen($siteName) < 2)          $errors[] = 'Site adı en az 2 karakter olmalı';
    if (!validateEmail($adminEmail))     $errors[] = 'Geçerli bir e-posta adresi girin';
    if (!validateUrl($supaUrl))          $errors[] = 'Geçerli bir Supabase URL girin';
    if (strlen($supaAnon) < 20)         $errors[] = 'Supabase Anon Key geçersiz';
    if (strlen($supaService) < 20)      $errors[] = 'Supabase Service Role Key geçersiz';

    if ($errors) {
        echo json_encode(['ok' => false, 'step' => 0, 'msg' => implode(', ', $errors)]);
        exit;
    }

    writeLog("=== KURULUM BAŞLADI ===");
    writeLog("Site: $siteName | Env: $env | PM: $pkgManager");

    $steps = [];

    // STEP 3 — .env
    $envContent = <<<ENV
# Auto-generated by ISG Akademi Installer
# {$siteName} — Generated at: {date('Y-m-d H:i:s')}

VITE_SUPABASE_URL="{$supaUrl}"
VITE_SUPABASE_PUBLISHABLE_KEY="{$supaAnon}"
SUPABASE_SERVICE_ROLE_KEY="{$supaService}"
VITE_SITE_NAME="{$siteName}"
VITE_ADMIN_EMAIL="{$adminEmail}"
NODE_ENV={$env}
ENV;

    $envWritten = @file_put_contents(ENV_FILE, $envContent, LOCK_EX);
    if (!$envWritten) {
        echo json_encode(['ok' => false, 'step' => 3, 'msg' => '.env dosyası oluşturulamadı']);
        exit;
    }
    // Secure .env
    @chmod(ENV_FILE, 0600);
    $steps[] = ['step' => 3, 'msg' => '.env dosyası oluşturuldu'];
    writeLog("STEP 3: .env created");

    // STEP 4 — Install dependencies
    $installCmd = $pkgManager === 'bun' ? 'cd ' . escapeshellarg(BASE_DIR) . ' && bun install --frozen-lockfile 2>&1'
                                        : 'cd ' . escapeshellarg(BASE_DIR) . ' && npm ci --omit=dev 2>&1 || npm install 2>&1';
    $r = execCmd($installCmd);
    if ($r['code'] !== 0) {
        // Fallback: try npm install if npm ci failed
        if ($pkgManager === 'npm') {
            $r = execCmd('cd ' . escapeshellarg(BASE_DIR) . ' && npm install 2>&1');
        }
        if ($r['code'] !== 0) {
            echo json_encode(['ok' => false, 'step' => 4, 'msg' => 'Bağımlılık kurulumu başarısız: ' . substr($r['output'], -300)]);
            exit;
        }
    }
    $steps[] = ['step' => 4, 'msg' => 'Bağımlılıklar kuruldu (' . $pkgManager . ')'];
    writeLog("STEP 4: Dependencies installed");

    // STEP 5 — Build
    $buildCmd = $pkgManager === 'bun' ? 'cd ' . escapeshellarg(BASE_DIR) . ' && bun run build 2>&1'
                                      : 'cd ' . escapeshellarg(BASE_DIR) . ' && npm run build 2>&1';
    $r = execCmd($buildCmd);
    if ($r['code'] !== 0 || !is_dir(DIST_DIR)) {
        echo json_encode(['ok' => false, 'step' => 5, 'msg' => 'Build başarısız: ' . substr($r['output'], -300)]);
        exit;
    }
    $steps[] = ['step' => 5, 'msg' => 'Uygulama derlendi (dist/ oluşturuldu)'];
    writeLog("STEP 5: Build successful");

    // STEP 6 — Deploy to /app
    // Copy dist to app directory
    if (is_dir(APP_DIR)) {
        execCmd('rm -rf ' . escapeshellarg(APP_DIR));
    }
    execCmd('cp -r ' . escapeshellarg(DIST_DIR) . ' ' . escapeshellarg(APP_DIR));

    if (!is_dir(APP_DIR)) {
        echo json_encode(['ok' => false, 'step' => 6, 'msg' => 'app/ dizini oluşturulamadı']);
        exit;
    }

    // Create .htaccess for SPA routing (Apache)
    $htaccess = <<<'HTACCESS'
# ISG Akademi — SPA Routing (Auto-generated)
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /app/

    # Security headers
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"

    # Cache static assets aggressively
    <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>

    # Don't cache HTML
    <FilesMatch "\.(html)$">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires "0"
    </FilesMatch>

    # GZIP compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/css application/json application/javascript text/javascript application/xml
    </IfModule>

    # SPA fallback: serve index.html for all non-file routes
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.html [QSA,L]
</IfModule>
HTACCESS;
    @file_put_contents(APP_DIR . '/.htaccess', $htaccess);

    // Root .htaccess — redirect to /app
    $rootHtaccess = <<<'ROOTHTACCESS'
# ISG Akademi — Root Redirect (Auto-generated)
<IfModule mod_rewrite.c>
    RewriteEngine On

    # Block access to sensitive files
    RewriteRule ^\.env$ - [F,L]
    RewriteRule ^install\.log$ - [F,L]
    RewriteRule ^install\.lock$ - [F,L]
    RewriteRule ^package\.json$ - [F,L]
    RewriteRule ^tsconfig.*\.json$ - [F,L]
    RewriteRule ^vite\.config\.ts$ - [F,L]
    RewriteRule ^node_modules/ - [F,L]
    RewriteRule ^src/ - [F,L]
    RewriteRule ^supabase/ - [F,L]

    # Redirect root to /app
    RewriteCond %{REQUEST_URI} ^/$
    RewriteRule ^ /app/ [R=302,L]
</IfModule>
ROOTHTACCESS;
    @file_put_contents(BASE_DIR . '/.htaccess', $rootHtaccess);

    // Nginx config hint
    $nginxConf = <<<'NGINX'
# ISG Akademi — Nginx Config (place in server block)
location /app {
    alias /home/domain/public_html/app;
    try_files $uri $uri/ /app/index.html;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Block sensitive files
location ~ /\.(env|log|lock)$ { deny all; }
location ~ ^/(node_modules|src|supabase)/ { deny all; }
NGINX;
    @file_put_contents(BASE_DIR . '/nginx.conf.example', $nginxConf);

    $steps[] = ['step' => 6, 'msg' => 'Uygulama /app dizinine deploy edildi, .htaccess oluşturuldu'];
    writeLog("STEP 6: Deployed to /app");

    // STEP 7 — Permissions
    execCmd('find ' . escapeshellarg(APP_DIR) . ' -type d -exec chmod 755 {} \;');
    execCmd('find ' . escapeshellarg(APP_DIR) . ' -type f -exec chmod 644 {} \;');
    @chmod(ENV_FILE, 0600);
    $steps[] = ['step' => 7, 'msg' => 'Dosya izinleri ayarlandı (755/644)'];
    writeLog("STEP 7: Permissions set");

    // STEP 8 — Lock installer
    @rename(BASE_DIR . '/install.php', BASE_DIR . '/install.lock');
    $steps[] = ['step' => 8, 'msg' => 'Kurulum dosyası kilitlendi (install.php → install.lock)'];
    writeLog("STEP 8: Installer locked");

    writeLog("=== KURULUM TAMAMLANDI ===");

    // Determine app URL
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $appUrl = "$protocol://$host/app/";

    echo json_encode([
        'ok'    => true,
        'steps' => $steps,
        'url'   => $appUrl,
        'msg'   => 'Kurulum başarıyla tamamlandı!'
    ]);
    exit;
}

// ─── Requirements Check (AJAX) ──────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'check') {
    header('Content-Type: application/json; charset=utf-8');
    $checks = checkRequirements();
    $allPass = true;
    foreach ($checks as $c) {
        if (!$c['pass'] && empty($c['optional'])) $allPass = false;
    }
    echo json_encode(['checks' => $checks, 'allPass' => $allPass]);
    exit;
}

// ─── HTML Installer UI ──────────────────────────────────────────────────────
$csrfToken = $_SESSION['csrf_token'];
?>
<!DOCTYPE html>
<html lang="tr" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>ISG Akademi — Kurulum Sihirbazı</title>
    <style>
        :root {
            --bg: #0a0f1a;
            --surface: #111827;
            --surface-2: #1e293b;
            --border: #334155;
            --text: #f1f5f9;
            --text-muted: #94a3b8;
            --primary: #f97316;
            --primary-dark: #ea580c;
            --success: #22c55e;
            --error: #ef4444;
            --warning: #eab308;
            --radius: 12px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .installer {
            width: 100%;
            max-width: 680px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .header {
            background: linear-gradient(135deg, var(--primary-dark), var(--primary));
            padding: 32px;
            text-align: center;
        }

        .header h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .header p {
            font-size: 14px;
            opacity: 0.85;
        }

        /* Steps indicator */
        .steps-bar {
            display: flex;
            padding: 16px 32px;
            background: var(--surface-2);
            border-bottom: 1px solid var(--border);
            gap: 4px;
        }

        .step-dot {
            flex: 1;
            height: 4px;
            border-radius: 2px;
            background: var(--border);
            transition: background 0.3s;
        }

        .step-dot.active { background: var(--primary); }
        .step-dot.done { background: var(--success); }

        /* Content area */
        .content { padding: 32px; }

        /* Check list */
        .check-list { list-style: none; }

        .check-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 8px;
            background: var(--surface-2);
            font-size: 14px;
        }

        .check-item .label { font-weight: 500; }
        .check-item .value { color: var(--text-muted); font-size: 13px; }

        .badge {
            font-size: 11px;
            font-weight: 600;
            padding: 3px 10px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .badge.pass { background: rgba(34,197,94,0.15); color: var(--success); }
        .badge.fail { background: rgba(239,68,68,0.15); color: var(--error); }
        .badge.warn { background: rgba(234,179,8,0.15); color: var(--warning); }

        /* Form */
        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 6px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .form-group input,
        .form-group select {
            width: 100%;
            padding: 10px 14px;
            background: var(--surface-2);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text);
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus {
            border-color: var(--primary);
        }

        .form-group input::placeholder {
            color: var(--text-muted);
            opacity: 0.6;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .section-title {
            font-size: 12px;
            font-weight: 700;
            color: var(--primary);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 24px 0 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--border);
        }

        .section-title:first-child { margin-top: 0; }

        /* Buttons */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--primary-dark), var(--primary));
            color: white;
        }

        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Progress log */
        .log-container {
            background: #000;
            border-radius: 8px;
            padding: 16px;
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 13px;
            line-height: 1.8;
            max-height: 300px;
            overflow-y: auto;
            margin-bottom: 20px;
        }

        .log-line { color: var(--text-muted); }
        .log-line.ok { color: var(--success); }
        .log-line.err { color: var(--error); }
        .log-line.info { color: var(--primary); }

        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Success */
        .success-screen { text-align: center; padding: 40px 20px; }

        .success-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(34,197,94,0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 40px;
        }

        .success-screen h2 { font-size: 22px; margin-bottom: 8px; }
        .success-screen p { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; }

        .success-url {
            display: inline-block;
            padding: 10px 24px;
            background: var(--surface-2);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--primary);
            font-weight: 600;
            text-decoration: none;
            font-size: 15px;
        }

        .success-url:hover { background: var(--border); }

        .hidden { display: none; }

        @media (max-width: 480px) {
            .form-row { grid-template-columns: 1fr; }
            .content { padding: 20px; }
            .header { padding: 24px; }
        }
    </style>
</head>
<body>
    <div class="installer">
        <div class="header">
            <h1>🛡️ ISG Akademi Kurulum Sihirbazı</h1>
            <p>Üretim ortamı otomatik kurulum sistemi</p>
        </div>

        <div class="steps-bar">
            <div class="step-dot" id="sd1"></div>
            <div class="step-dot" id="sd2"></div>
            <div class="step-dot" id="sd3"></div>
        </div>

        <!-- STEP 1: Requirements -->
        <div class="content" id="step1">
            <h3 style="margin-bottom:16px">Sunucu Gereksinimler Kontrolü</h3>
            <ul class="check-list" id="checkList">
                <li class="check-item"><span class="label">Kontrol ediliyor...</span><span class="spinner"></span></li>
            </ul>
            <div style="margin-top:20px">
                <button class="btn btn-primary" id="btnNext1" disabled onclick="goStep(2)">
                    Devam Et →
                </button>
            </div>
            <p id="checkError" class="hidden" style="color:var(--error);font-size:13px;margin-top:12px;text-align:center"></p>
        </div>

        <!-- STEP 2: Configuration Form -->
        <div class="content hidden" id="step2">
            <form id="installForm" onsubmit="return startInstall(event)">
                <input type="hidden" name="csrf" value="<?= $csrfToken ?>">
                <input type="hidden" name="action" value="install">

                <div class="section-title" style="margin-top:0">Genel Ayarlar</div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Site Adı</label>
                        <input type="text" name="site_name" placeholder="ISG Akademi" required minlength="2" maxlength="100">
                    </div>
                    <div class="form-group">
                        <label>Admin E-posta</label>
                        <input type="email" name="admin_email" placeholder="admin@domain.com" required>
                    </div>
                </div>

                <div class="section-title">Supabase Bağlantısı</div>
                <div class="form-group">
                    <label>Supabase URL</label>
                    <input type="url" name="supabase_url" placeholder="https://xxxxx.supabase.co" required>
                </div>
                <div class="form-group">
                    <label>Supabase Anon Key</label>
                    <input type="text" name="supabase_anon" placeholder="eyJhbGci..." required minlength="20">
                </div>
                <div class="form-group">
                    <label>Supabase Service Role Key</label>
                    <input type="password" name="supabase_service" placeholder="eyJhbGci..." required minlength="20">
                </div>

                <div class="section-title">Ortam Ayarları</div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Ortam</label>
                        <select name="environment">
                            <option value="production">Production</option>
                            <option value="development">Development</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Paket Yöneticisi</label>
                        <select name="pkg_manager">
                            <option value="npm">npm</option>
                            <option value="bun">bun</option>
                        </select>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary" id="btnInstall">
                    🚀 Kurulumu Başlat
                </button>
            </form>
        </div>

        <!-- STEP 3: Progress -->
        <div class="content hidden" id="step3">
            <h3 style="margin-bottom:16px">Kurulum Devam Ediyor...</h3>
            <div class="log-container" id="logBox"></div>
            <div id="progressSpinner" style="text-align:center">
                <span class="spinner" style="width:24px;height:24px;border-width:3px"></span>
                <p style="color:var(--text-muted);font-size:13px;margin-top:8px">Bu işlem birkaç dakika sürebilir...</p>
            </div>
        </div>

        <!-- Success -->
        <div class="content hidden" id="stepSuccess">
            <div class="success-screen">
                <div class="success-icon">✅</div>
                <h2>Kurulum Tamamlandı!</h2>
                <p>Uygulamanız başarıyla kuruldu ve kullanıma hazır.</p>
                <a class="success-url" id="appLink" href="#">→ Uygulamayı Aç</a>
            </div>
        </div>
    </div>

    <script>
        const $ = s => document.querySelector(s);

        function setStep(n) {
            for (let i = 1; i <= 3; i++) {
                const dot = $(`#sd${i}`);
                dot.className = 'step-dot' + (i < n ? ' done' : i === n ? ' active' : '');
            }
        }

        function goStep(n) {
            ['step1','step2','step3','stepSuccess'].forEach(id => $(`#${id}`).classList.add('hidden'));
            $(`#step${n}`).classList.remove('hidden');
            setStep(n);
        }

        function addLog(text, type = '') {
            const box = $('#logBox');
            const line = document.createElement('div');
            line.className = 'log-line' + (type ? ' ' + type : '');
            line.textContent = '› ' + text;
            box.appendChild(line);
            box.scrollTop = box.scrollHeight;
        }

        // STEP 1 — Run checks on load
        async function runChecks() {
            try {
                const fd = new FormData();
                fd.append('action', 'check');
                const res = await fetch('', { method: 'POST', body: fd });
                const data = await res.json();

                const list = $('#checkList');
                list.innerHTML = '';

                for (const [key, c] of Object.entries(data.checks)) {
                    const li = document.createElement('li');
                    li.className = 'check-item';
                    const badgeClass = c.pass ? 'pass' : (c.optional ? 'warn' : 'fail');
                    const badgeText = c.pass ? 'GEÇTI' : (c.optional ? 'OPSİYONEL' : 'BAŞARISIZ');
                    li.innerHTML = `
                        <div>
                            <span class="label">${c.label}</span>
                            <span class="value" style="margin-left:8px">${c.value}</span>
                        </div>
                        <span class="badge ${badgeClass}">${badgeText}</span>
                    `;
                    list.appendChild(li);
                }

                if (data.allPass) {
                    $('#btnNext1').disabled = false;
                } else {
                    $('#checkError').textContent = 'Zorunlu gereksinimler karşılanmadı. Lütfen sunucu yapılandırmanızı kontrol edin.';
                    $('#checkError').classList.remove('hidden');
                }
            } catch (e) {
                $('#checkList').innerHTML = '<li class="check-item"><span class="label" style="color:var(--error)">Kontrol başarısız: ' + e.message + '</span></li>';
            }
        }

        // STEP 2 → 3 — Install
        async function startInstall(e) {
            e.preventDefault();
            const btn = $('#btnInstall');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Kuruluyor...';

            goStep(3);

            addLog('Kurulum başlatılıyor...', 'info');
            addLog('.env dosyası oluşturuluyor...', 'info');

            try {
                const fd = new FormData($('#installForm'));
                const res = await fetch('', { method: 'POST', body: fd });
                const data = await res.json();

                if (!data.ok) {
                    addLog('HATA: ' + data.msg, 'err');
                    addLog('Adım ' + data.step + ' başarısız oldu.', 'err');
                    $('#progressSpinner').innerHTML = '<p style="color:var(--error);font-weight:600">Kurulum başarısız oldu.</p>';
                    return;
                }

                for (const s of data.steps) {
                    addLog(`[Adım ${s.step}] ${s.msg}`, 'ok');
                }

                addLog('', '');
                addLog('✅ Kurulum başarıyla tamamlandı!', 'ok');

                // Show success
                setTimeout(() => {
                    ['step1','step2','step3'].forEach(id => $(`#${id}`).classList.add('hidden'));
                    $('#stepSuccess').classList.remove('hidden');
                    $('#appLink').href = data.url;
                    $('#appLink').textContent = '→ ' + data.url;
                    for (let i = 1; i <= 3; i++) $(`#sd${i}`).className = 'step-dot done';
                }, 1000);

            } catch (e) {
                addLog('Bağlantı hatası: ' + e.message, 'err');
                $('#progressSpinner').innerHTML = '<p style="color:var(--error)">Sunucu bağlantı hatası.</p>';
            }
        }

        // Init
        setStep(1);
        runChecks();
    </script>
</body>
</html>
