// ===================================================================
// Service Worker（サービスワーカー）
// -------------------------------------------------------------------
// ブラウザの裏側で動く小さなプログラム。
// アプリのファイルを「キャッシュ（端末内に一時保存）」しておくことで、
// 2回目以降は高速に開け、オフライン（圏外・機内モード）でも表示できます。
// ===================================================================

// キャッシュの名前。中身を更新したら、末尾の数字(v1→v2)を上げると
// 古いキャッシュが破棄され、新しいファイルに更新されます。
const CACHE_NAME = 'marketing-roadmap-v1';

// 最初に保存しておくファイル一覧（アプリの基本セット）。
// パスは相対指定。GitHub Pagesのサブフォルダ公開でも正しく動きます。
const CORE_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

// --- インストール時：基本ファイルをキャッシュに保存する ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  // すぐに新しいService Workerを有効化する
  self.skipWaiting();
});

// --- 有効化時：古いバージョンのキャッシュを掃除する ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME) // 今のバージョン以外を
          .map((key) => caches.delete(key))    // 削除する
      )
    )
  );
  self.clients.claim();
});

// --- ファイル取得時：まずキャッシュ、無ければネットから取る ---
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET以外（送信など）はそのままネットワークに任せる
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // キャッシュにあればそれを返す（＝高速＆オフラインOK）
      if (cached) return cached;

      // 無ければネットから取得し、ついでにキャッシュへ保存しておく
      return fetch(req)
        .then((res) => {
          // 同じサイト内のファイルだけキャッシュに追加する
          if (res.ok && req.url.startsWith(self.location.origin)) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // オフラインでページ移動しようとした場合は index.html を返す
          if (req.mode === 'navigate') return caches.match('index.html');
        });
    })
  );
});
