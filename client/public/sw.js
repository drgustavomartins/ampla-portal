// Service worker desativado para evitar que cache antigo bloqueie atualizacoes
// do bundle. Esse SW registra-se, limpa todas as caches existentes, e desregistra-se
// imediatamente. Clientes que ja tinham o SW antigo (v10/v11) recebem este novo
// arquivo na proxima navegacao (Cache-Control: no-cache em /sw.js no vercel.json),
// disparam o handler 'activate' que apaga as caches, e ficam sem SW na proxima visita.
// O app continua funcionando normalmente — sem offline mas tambem sem stale bundle.

const CACHE_NAME = 'ampla-facial-disabled-v1';

self.addEventListener('install', (event) => {
  // Pula a fase de waiting para ativar imediatamente.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Apaga todas as caches (qualquer nome — ampla-facial-v10, v11, etc.)
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      // Toma controle de todas as abas abertas.
      await self.clients.claim();

      // Desregistra-se. Na proxima navegacao nao havera SW ativo.
      try {
        await self.registration.unregister();
      } catch (_) {
        // ignore
      }

      // Recarrega as abas controladas para garantir que o proximo fetch venha
      // da rede sem passar por nenhum SW.
      const allClients = await self.clients.matchAll({ type: 'window' });
      for (const client of allClients) {
        try {
          client.navigate(client.url);
        } catch (_) {
          // ignore
        }
      }
    })()
  );
});

// Pass-through fetch — apenas durante o ciclo de vida ate o unregister completar.
// Nao cacheia nada. Sempre vai para a rede.
self.addEventListener('fetch', (event) => {
  // Sem chamar respondWith → o browser usa o caminho normal de rede.
  return;
});
