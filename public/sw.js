// ============================================================
// IL FILE DI SERVIZIO (service worker) di NoiDemoliamo — 05/10
// Serve SOLO a rendere il sito installabile come app (Chrome e Edge
// chiedono un service worker con un gestore di rete). Non mette niente
// in cache di proposito: ogni richiesta va alla rete come prima, così
// dopo un deploy su Vercel si vede subito la versione nuova e non
// restano pagine vecchie sul telefono.
// ============================================================
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => { /* passa tutto alla rete */ })
