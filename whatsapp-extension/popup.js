var clientData = [];

function showMsg(text, type) {
  var el = document.getElementById('msg');
  el.textContent = text;
  el.className = 'msg visible ' + type;
}

function scan() {
  var btn = document.getElementById('scanBtn');
  btn.disabled = true;
  btn.textContent = 'Escaneando...';
  showMsg('Varrendo conversas do WhatsApp Web...', 'info');

  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    var tab = tabs[0];
    if (!tab || !tab.url || tab.url.indexOf('web.whatsapp.com') === -1) {
      showMsg('Abra o WhatsApp Web primeiro.', 'error');
      btn.disabled = false;
      btn.textContent = 'Escanear conversas';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'extract' }, function(response) {
      btn.disabled = false;
      btn.textContent = 'Escanear novamente';

      if (chrome.runtime.lastError || !response) {
        showMsg('Erro: recarregue o WhatsApp Web e tente novamente.', 'error');
        return;
      }

      clientData = response.clients || [];
      document.getElementById('clientCount').textContent = clientData.length;

      if (clientData.length === 0) {
        showMsg('Nenhum cliente encontrado. Verifique se as conversas estao visiveis.', 'error');
        document.getElementById('exportBtn').disabled = true;
        return;
      }

      showMsg(clientData.length + ' clientes identificados!', 'success');
      document.getElementById('exportBtn').disabled = false;
      renderPreview();
    });
  });
}

function renderPreview() {
  var container = document.getElementById('preview');
  var html = '';

  var sorted = clientData.slice().sort(function(a, b) {
    return a.cliente.localeCompare(b.cliente);
  });

  sorted.forEach(function(c) {
    var contas = c.contas.length > 1 ? c.contas.length + ' contas' : '1 conta';
    html += '<div class="preview-item">'
      + '<div class="name">' + escapeHtml(c.cliente) + '</div>'
      + '<div class="detail">' + contas + ' | ' + escapeHtml(c.ultimo_contato) + ' | ' + escapeHtml(c.ultima_mensagem.substring(0, 60)) + '</div>'
      + '</div>';
  });

  container.innerHTML = html;
  container.classList.add('visible');
}

function exportJSON() {
  if (clientData.length === 0) return;

  var exportData = {
    exportado_em: new Date().toISOString(),
    total_clientes: clientData.length,
    clientes: clientData.sort(function(a, b) {
      return a.cliente.localeCompare(b.cliente);
    })
  };

  var json = JSON.stringify(exportData, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var date = new Date().toISOString().split('T')[0];

  chrome.downloads.download({
    url: url,
    filename: 'clientes_whatsapp_' + date + '.json',
    saveAs: true
  }, function() {
    if (chrome.runtime.lastError) {
      // fallback: copy to clipboard
      navigator.clipboard.writeText(json).then(function() {
        showMsg('JSON copiado para a area de transferencia!', 'success');
      }).catch(function() {
        // last resort: open in new tab
        var dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
        chrome.tabs.create({ url: dataUrl });
      });
    } else {
      showMsg('Arquivo exportado com sucesso!', 'success');
    }
  });
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
