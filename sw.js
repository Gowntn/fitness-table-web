/* 健身Excel超级套表 · Service Worker（v3）
   策略：
   - 页面导航：网络优先，失败回退缓存（保证线上更新及时，离线也能打开）
   - 图片（本站或 jsDelivr CDN）：stale-while-revalidate，看过的图离线也能看
   - 更新版本号 VERSION 即可让用户拿到新缓存 */
var VERSION = 'v3-2';
var APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './images/pwa-192.png',
  './images/pwa-512.png'
];
var CDN_IMG = 'https://cdn.jsdelivr.net/gh/Gowntn/fitness-table-web@main/images/';

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(VERSION).then(function(c){
      return c.addAll(APP_SHELL);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var url;
  try{ url = new URL(e.request.url); }catch(err){ return; }

  // 页面导航：网络优先，离线回退缓存
  if(e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request).then(function(res){
        if(res && res.ok){
          var copy = res.clone();
          caches.open(VERSION).then(function(c){ c.put('./index.html', copy); });
        }
        return res;
      }).catch(function(){
        return caches.match('./index.html');
      })
    );
    return;
  }

  // 图片（本站 images/ 或 jsDelivr CDN）：stale-while-revalidate
  var isImage = /\.(png|jpe?g|webp|gif)$/i.test(url.pathname)
    && (url.origin === self.location.origin || url.href.indexOf(CDN_IMG) === 0);
  if(isImage){
    e.respondWith(
      caches.match(e.request).then(function(cached){
        var fetched = fetch(e.request).then(function(res){
          if(res && res.ok){
            var copy = res.clone();
            caches.open(VERSION).then(function(c){ c.put(e.request, copy); });
          }
          return res;
        }).catch(function(){ return cached; });
        return cached || fetched;
      })
    );
    return;
  }

  // 其他资源：常规缓存优先，失败回退网络
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(res){
        if(res && res.ok && url.origin === self.location.origin){
          var copy = res.clone();
          caches.open(VERSION).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      });
    })
  );
});
