const CACHE_NAME = 'voces-campesinas-cache-v1';
const CACHE_ASSETS = [
'index.html',
'manifest.json',
'https://www.google.com/search?q=https://fonts.googleapis.com/css2%3Ffamily%3DMaterial%2BSymbols%2BOutlined:opsz,wght,FILL,GRAD%4020..48,100..700,0..1,-50..200',
'https://walterzinho.github.io/VocesCampesinas/', // logo
'https://www.google.com/search?q=https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Facebook_icon_2020.svg/2048px-Facebook_icon_2020.svg.png',
'https://www.google.com/search?q=https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.svg/2048px-Instagram_icon.svg.png',
'https://www.google.com/search?q=https://www.iconpacks.net/tutorials/wp-content/uploads/2020/07/tiktok-app-icon-logo-round-circular-black-and-white.png',
'https://www.google.com/search?q=https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/YouTube_icon_%25282017%2529.svg/2048px-YouTube_icon_%25282017%2529.svg.png',
'https://www.google.com/search?q=https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/2044px-WhatsApp.svg.png'
];

// Instalar el Service Worker y cachear los archivos esenciales
self.addEventListener('install', (event) => {
event.waitUntil(
caches.open(CACHE_NAME)
.then((cache) => {
console.log('Service Worker: Archivos en caché');
return cache.addAll(CACHE_ASSETS);
})
.catch((error) => {
console.error('Service Worker: Error al cachear', error);
})
);
});

// Activar el Service Worker y limpiar cachés antiguos
self.addEventListener('activate', (event) => {
const cacheWhitelist = [CACHE_NAME];
event.waitUntil(
caches.keys().then((cacheNames) => {
return Promise.all(
cacheNames.map((cacheName) => {
if (cacheWhitelist.indexOf(cacheName) === -1) {
return caches.delete(cacheName);
}
})
);
})
);
});

// Interceptar las peticiones y servir desde el caché
self.addEventListener('fetch', (event) => {
event.respondWith(
caches.match(event.request)
.then((response) => {
// Si la respuesta está en caché, la servimos
if (response) {
return response;
}

            // De lo contrario, hacemos una petición a la red
            return fetch(event.request).then(
                (fetchResponse) => {
                    // Verificamos si la respuesta es válida
                    if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                        return fetchResponse;
                    }

                    // Clonamos la respuesta porque es un stream y solo se puede consumir una vez
                    const responseToCache = fetchResponse.clone();
                    
                    // Guardamos la nueva respuesta en caché
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    
                    return fetchResponse;
                }
            );
        })
);

});
