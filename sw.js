const CACHE_NAME = 'voces-campesinas-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    // Aquí puedes añadir otras URL de recursos estáticos que desees cachear, como imágenes, CSS y fuentes.
];

// Evento 'install': se dispara cuando se instala el service worker.
self.addEventListener('install', event => {
    // Almacena en caché los archivos estáticos.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Evento 'fetch': se dispara cada vez que se hace una solicitud de red.
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Devuelve el recurso desde el caché si se encuentra.
                if (response) {
                    return response;
                }
                // Si no está en el caché, realiza la solicitud de red.
                return fetch(event.request);
            })
    );
});

// Evento 'activate': se dispara cuando el service worker se activa.
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // Elimina los cachés antiguos.
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
