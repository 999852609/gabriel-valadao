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

      const lastMsgEl = chat.querySelector('[data-testid="last-msg-status"]');
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
