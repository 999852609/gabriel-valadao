// Pattern: one or more account numbers (6+ digits) separated by // before a dash and name
const CLIENT_PATTERN = /^([\d\s/]+)-\s*(.+)$/;
const ACCOUNT_PATTERN = /\d{6,}/g;

function log(msg, data) {
  if (data !== undefined) {
    console.log('[WCE] ' + msg, data);
  } else {
    console.log('[WCE] ' + msg);
  }
}

function extractClientData() {
  const clients = [];

  // Try multiple selectors for chat items
  const selectors = [
    '[role="listitem"]',
    '[data-testid="cell-frame-container"]',
    '[data-testid="list-item"]',
    '#pane-side [role="row"]',
    '#pane-side [role="gridcell"]',
    '#pane-side > div > div > div > div > div'
  ];

  let chatList = [];
  for (var s = 0; s < selectors.length; s++) {
    chatList = document.querySelectorAll(selectors[s]);
    if (chatList.length > 0) {
      log('Selector "' + selectors[s] + '" found ' + chatList.length + ' items');
      break;
    }
  }

  if (chatList.length === 0) {
    // Fallback: search ALL span[title] on the page
    log('No chat items found with standard selectors, trying fallback...');
    var allSpans = document.querySelectorAll('span[title]');
    log('Found ' + allSpans.length + ' span[title] elements');

    allSpans.forEach(function(span) {
      var title = span.getAttribute('title') || '';
      var match = title.match(CLIENT_PATTERN);
      if (match) {
        var accountsPart = match[1].trim();
        var name = match[2].trim();
        var accounts = accountsPart.match(ACCOUNT_PATTERN) || [];
        if (accounts.length > 0) {
          log('CLIENT FOUND (fallback): ' + title);
          clients.push({
            nome_completo: title,
            cliente: name,
            contas: accounts,
            ultimo_contato: '',
            ultima_mensagem: '',
            direcao: 'desconhecida'
          });
        }
      }
    });

    return clients;
  }

  // Standard extraction from chat items
  var titlesChecked = 0;
  chatList.forEach(function(chat) {
    try {
      // Try multiple selectors for the title
      var titleEl = chat.querySelector('[data-testid="cell-frame-title"] span[title]') ||
                    chat.querySelector('span[title][dir]') ||
                    chat.querySelector('span[title]');
      if (!titleEl) return;

      var fullTitle = titleEl.getAttribute('title') || titleEl.textContent || '';
      if (!fullTitle) return;

      titlesChecked++;
      if (titlesChecked <= 5) {
        log('Chat title: "' + fullTitle + '"');
      }

      var match = fullTitle.match(CLIENT_PATTERN);
      if (!match) return;

      var accountsPart = match[1].trim();
      var name = match[2].trim();
      var accounts = accountsPart.match(ACCOUNT_PATTERN) || [];
      if (accounts.length === 0) return;

      log('CLIENT MATCHED: ' + name + ' (' + accounts.join(', ') + ')');

      var msgContentEl = chat.querySelector('[data-testid="cell-frame-secondary"] span[title]') ||
                         chat.querySelector('[data-testid="cell-frame-secondary"] span[dir]') ||
                         chat.querySelector('[data-testid="cell-frame-secondary"] span') ||
                         chat.querySelector('div:nth-child(2) span[title]');

      var lastMessage = '';
      if (msgContentEl) {
        lastMessage = msgContentEl.getAttribute('title') || msgContentEl.textContent || '';
      }

      var timeEl = chat.querySelector('[data-testid="cell-frame-primary-detail"] span') ||
                   chat.querySelector('div[class] > span[aria-label]') ||
                   chat.querySelector('span[dir="auto"]');
      var lastContact = '';
      if (timeEl) {
        var t = timeEl.textContent || '';
        if (/\d/.test(t) && t.length < 20) lastContact = t;
      }

      var isSentByMe = !!chat.querySelector('[data-testid="msg-dblcheck"]') ||
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
      log('Error processing chat item: ' + e.message);
    }
  });

  log('Titles checked: ' + titlesChecked + ', Clients found: ' + clients.length);
  return clients;
}

function scrollAndCollect(callback) {
  var panel = document.querySelector('[data-testid="chat-list"]') ||
              document.querySelector('#pane-side') ||
              document.querySelector('[aria-label*="lista"]') ||
              document.querySelector('[aria-label*="Chat"]');

  log('Scroll panel found: ' + !!panel);

  if (!panel) {
    callback(extractClientData());
    return;
  }

  // Find the scrollable element
  var scrollContainer = panel;
  var scrollable = panel.querySelector('[role="grid"]') ||
                   panel.querySelector('[role="list"]') ||
                   panel.querySelector('[tabindex]');
  if (scrollable && scrollable.parentElement) {
    scrollContainer = scrollable.parentElement;
  }

  log('Scroll container tag: ' + scrollContainer.tagName + ', scrollHeight: ' + scrollContainer.scrollHeight);

  var lastHeight = 0;
  var attempts = 0;
  var maxAttempts = 50;
  var allClients = new Map();

  function collectAndScroll() {
    var current = extractClientData();
    current.forEach(function(c) {
      allClients.set(c.nome_completo, c);
    });

    var newHeight = scrollContainer.scrollHeight;
    if (newHeight === lastHeight || attempts >= maxAttempts) {
      scrollContainer.scrollTop = 0;
      log('Scroll complete. Total unique clients: ' + allClients.size);
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

// Inject export button into WhatsApp Web
function injectExportButton() {
  if (document.getElementById('wce-export-btn')) return;

  log('Injecting export button...');

  var btn = document.createElement('button');
  btn.id = 'wce-export-btn';
  btn.textContent = 'Exportar JSON';
  btn.title = 'Exportar clientes em JSON';
  btn.style.cssText = 'position:fixed;top:12px;right:16px;z-index:99999;'
    + 'background:#2563eb;color:#fff;border:none;border-radius:8px;'
    + 'padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;'
    + 'font-family:-apple-system,BlinkMacSystemFont,sans-serif;'
    + 'box-shadow:0 2px 12px rgba(37,99,235,0.5);transition:all 0.2s;'
    + 'letter-spacing:0.5px;';

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
    btn.textContent = 'Escaneando...';
    btn.style.background = '#93c5fd';

    scrollAndCollect(function(clients) {
      if (clients.length === 0) {
        btn.textContent = 'Nenhum cliente';
        btn.style.background = '#dc2626';
        setTimeout(function() {
          btn.textContent = 'Exportar JSON';
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

      btn.textContent = clients.length + ' exportados!';
      btn.style.background = '#16a34a';
      setTimeout(function() {
        btn.textContent = 'Exportar JSON';
        btn.style.background = '#2563eb';
        btn.disabled = false;
      }, 3000);
    });
  });

  document.body.appendChild(btn);
  log('Export button injected successfully');
}

// Wait for WhatsApp Web to load
function waitAndInject() {
  log('Waiting for WhatsApp Web to load...');
  var check = setInterval(function() {
    var loaded = document.querySelector('#pane-side') ||
                 document.querySelector('[data-testid="chatlist-header"]') ||
                 document.querySelector('header');
    if (loaded) {
      clearInterval(check);
      log('WhatsApp Web loaded, injecting button');
      setTimeout(injectExportButton, 2000);
    }
  }, 1500);
}

waitAndInject();

// Keep listening for popup messages
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'extract') {
    scrollAndCollect(function(clients) {
      sendResponse({ clients: clients });
    });
    return true;
  }
  if (request.action === 'quickExtract') {
    sendResponse({ clients: extractClientData() });
    return true;
  }
});
