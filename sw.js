/* sw.js — Service Worker：离线缓存，让 PWA 可安装、断网可用 */
var CACHE = 'watering-v5'
var ASSETS = [
  './', './index.html', './style.css', './app.js', './store.js', './plants.js', './plantapi.js', './ai.js',
  './manifest.json', './icon-192.png', './icon-512.png'
]

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS) }).then(function () { return self.skipWaiting() }))
})

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE }).map(function (k) { return caches.delete(k) }))
  }).then(function () { return self.clients.claim() }))
})

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return
  var url = new URL(e.request.url)
  // 跨域 API 请求不缓存，直接走网络
  if (url.origin !== self.location.origin) return

  // 本地资源：网络优先，失败回退缓存（保证更新及时且离线可用）
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone()
      caches.open(CACHE).then(function (c) { c.put(e.request, copy) })
      return res
    }).catch(function () {
      return caches.match(e.request).then(function (hit) { return hit || caches.match('./index.html') })
    })
  )
})
