const CACHE_NAME='idea-atelier-shell-v2';
const CORE_ASSETS=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './style.css?v=19',
  './app.js?v=16'
].map(path=>new URL(path,self.registration.scope).toString());

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('idea-atelier-shell-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(new URL('./index.html',self.registration.scope).toString(),response.clone()));
      return response;
    }).catch(async()=>{
      const cache=await caches.open(CACHE_NAME);
      return (await cache.match(request))||(await cache.match(new URL('./index.html',self.registration.scope).toString()));
    }));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>{
    if(cached)return cached;
    return fetch(request).then(response=>{
      if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));
      return response;
    });
  }));
});