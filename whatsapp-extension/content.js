// Pattern: one or more account numbers (9+ digits) separated by // before a dash and name
const CLIENT_PATTERN = /^([\d\s/]+)-\s*(.+)$/;
const ACCOUNT_PATTERN = /\d{6,}/g;

function extractClientData() {
  const clients = [];
  const chatList = document.querySelectorAll('[role="listitem"]');

  chatList.forEach(function(chat) {
    try {
      const titleEl = chat.querySelector('[data-testid="cell-frame-title"] span[title]') ||
                       chat.querySelector('span[title]');
      if (!titleEl) return;

      const fullTitle = titleEl.getAttribute('title') || titleEl.textContent || '';
      const match = fullTitle.match(CLIENT_PATTERN);
      if (!match) return;

      const accountsPart = match[1].trim();
      const name = match[2].trim();
      const accounts = accountsPart.match(ACCOUNT_PATTERN) || [];
      if (accounts.length === 0) return;

      const msgContentEl = chat.querySelector('span[data-testid="last-msg-status"]')?.closest('[class]')?.querySelector('span[title]') ||
                           chat.querySelector('[data-testid="cell-frame-secondary"] span[title]') ||
                           chat.querySelector('[data-testid="cell-frame-secondary"] span');

      let lastMessage = '';
      if (msgContentEl) {
        lastMessage = msgContentEl.getAttribute('title') || msgContentEl.textContent || '';
      }

      const timeEl = chat.querySelector('[data-testid="cell-frame-primary-detail"] span') ||
                     chat.querySelector('div[class] > span[aria-label]');
      let lastContact = '';
      if (timeEl) {
        lastContact = timeEl.textContent || timeEl.getAttribute('aria-label') || '';
      }

      const isSentByMe = !!chat.querySelector('[data-testid="msg-dblcheck"]') ||
                         !!chat.querySelector('[data-testid="msg-check"]') ||
                         !!chat.querySelector('[data-icon="msg-dblcheck"]') ||
                         !!chat.querySelector('[data-icon="msg-check"]');

      clients.push({
        nome_completo: fullTitle,
        cliente: name,
        contas: accounts,
        ultimo_contato: lastContact,
        ultima_mensagem: lastMessage.substring(0, 200),
        direcao: isSentByMe ? 'enviada' : 'recebida'
      });
    } catch (e) {
      // skip problematic entries
    }
  });

  return clients;
}

function scrollAndCollect(callback) {
  const panel = document.querySelector('[data-testid="chat-list"]') ||
                document.querySelector('#pane-side') ||
                document.querySelector('[aria-label*="lista"]');

  if (!panel) {
    callback(extractClientData());
    return;
  }

  const scrollContainer = panel.querySelector('[role="grid"]')?.parentElement || panel;
  let lastHeight = 0;
  let attempts = 0;
  const maxAttempts = 50;
  const allClients = new Map();

  function collectAndScroll() {
    const current = extractClientData();
    current.forEach(function(c) {
      allClients.set(c.nome_completo, c);
    });

    const newHeight = scrollContainer.scrollHeight;
    if (newHeight === lastHeight || attempts >= maxAttempts) {
      scrollContainer.scrollTop = 0;
      callback(Array.from(allClients.values()));
      return;
    }

    lastHeight = newHeight;
    attempts++;
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    setTimeout(collectAndScroll, 800);
  }

  scrollContainer.scrollTop = 0;
  setTimeout(collectAndScroll, 500);
}

// Inject export button into WhatsApp Web header
function injectExportButton() {
  if (document.getElementById('wce-export-btn')) return;

  const header = document.querySelector('header') ||
                 document.querySelector('[data-testid="chatlist-header"]');
  if (!header) {
    setTimeout(injectExportButton, 2000);
    return;
  }

  const btn = document.createElement('button');
  btn.id = 'wce-export-btn';
  btn.innerHTML = '&#x2913; JSON';
  btn.title = 'Exportar clientes em JSON';
  btn.style.cssText = 'position:fixed;top:12px;right:16px;z-index:9999;'
    + 'background:#2563eb;color:#fff;border:none;border-radius:8px;'
    + 'padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;'
    + 'font-family:-apple-system,BlinkMacSystemFont,sans-serif;'
    + 'box-shadow:0 2px 8px rgba(37,99,235,0.4);transition:all 0.2s;';

  btn.addEventListener('mouseenter', function() {
    btn.style.background = '#1d4ed8';
    btn.style.transform = 'scale(1.05)';
  });
  btn.addEventListener('mouseleave', function() {
    btn.style.background = '#2563eb';
    btn.style.transform = 'scale(1)';
  });

  btn.addEventListener('click', function() {
    btn.disabled = true;
    btn.innerHTML = '&#x23F3; Escaneando...';
    btn.style.background = '#93c5fd';

    scrollAndCollect(function(clients) {
      if (clients.length === 0) {
        btn.innerHTML = '&#x2717; Nenhum cliente';
        btn.style.background = '#dc2626';
        setTimeout(function() {
          btn.innerHTML = '&#x2913; JSON';
          btn.style.background = '#2563eb';
          btn.disabled = false;
        }, 3000);
        return;
      }

      var exportData = {
        exportado_em: new Date().toISOString(),
        total_clientes: clients.length,
        clientes: clients.sort(function(a, b) {
          return a.cliente.localeCompare(b.cliente);
        })
      };

      var json = JSON.stringify(exportData, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = 'clientes_whatsapp_' + date + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      btn.innerHTML = '&#x2713; ' + clients.length + ' exportados';
      btn.style.background = '#16a34a';
      setTimeout(function() {
        btn.innerHTML = '&#x2913; JSON';
        btn.style.background = '#2563eb';
        btn.disabled = false;
      }, 3000);
    });
  });

  document.body.appendChild(btn);
}

// Wait for WhatsApp Web to load, then inject button
function waitAndInject() {
  const check = setInterval(function() {
    const loaded = document.querySelector('[data-testid="chatlist-header"]') ||
                   document.querySelector('header') ||
                   document.querySelector('#pane-side');
    if (loaded) {
      clearInterval(check);
      injectExportButton();
    }
  }, 1500);
}

waitAndInject();

// Keep listening for popup messages too
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'extract') {
    scrollAndCollect(function(clients) {
      sendResponse({ clients: clients });
    });
    return true;
  }

  if (request.action === 'quickExtract') {
    const clients = extractClientData();
    sendResponse({ clients: clients });
    return true;
  }
});
