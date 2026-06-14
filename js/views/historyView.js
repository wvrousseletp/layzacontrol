import { store } from '../store.js';

export const historyView = {
  init() {
    this.registerEventListeners();
    this.render();

    window.addEventListener('storeUpdated', () => {
      if (document.getElementById('view-history').classList.contains('active')) {
        this.render();
      }
    });
  },

  registerEventListeners() {
    // Filter input triggers
    const filters = ['hist-filter-search', 'hist-filter-type', 'hist-filter-category', 'hist-filter-start', 'hist-filter-end'];
    filters.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => this.render());
        el.addEventListener('input', () => this.render());
      }
    });

    // Export buttons
    const exportCsvBtn = document.getElementById('hist-export-csv');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => this.exportToCSV());
    }

    const exportJsonBtn = document.getElementById('hist-export-json');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => this.exportToJSON());
    }
  },

  render() {
    const tableBody = document.getElementById('history-table-body');
    if (!tableBody) return;

    // Get filters
    const searchVal = (document.getElementById('hist-filter-search')?.value || '').toLowerCase().trim();
    const typeVal = document.getElementById('hist-filter-type')?.value || 'all'; // all, purchase, production, usage
    const categoryVal = document.getElementById('hist-filter-category')?.value || 'all'; // all, supplements, foods
    const startDateVal = document.getElementById('hist-filter-start')?.value || '';
    const endDateVal = document.getElementById('hist-filter-end')?.value || '';

    // Retrieve transactions
    let txs = store.getTransactions();

    // Apply Filters
    if (categoryVal !== 'all') {
      txs = txs.filter(t => t.category === categoryVal);
    }
    if (typeVal !== 'all') {
      txs = txs.filter(t => t.type === typeVal);
    }
    if (startDateVal) {
      txs = txs.filter(t => t.date >= startDateVal);
    }
    if (endDateVal) {
      txs = txs.filter(t => t.date <= endDateVal);
    }
    if (searchVal) {
      txs = txs.filter(t => 
        t.itemName.toLowerCase().includes(searchVal) || 
        (t.notes && t.notes.toLowerCase().includes(searchVal))
      );
    }

    // Render Table
    if (txs.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">
            Nenhuma transação encontrada com os filtros selecionados.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = txs.map(t => {
      let typeBadge = '';
      if (t.type === 'purchase') typeBadge = '<span class="badge badge-purchase">Compra</span>';
      else if (t.type === 'production') typeBadge = '<span class="badge badge-production">Pronto</span>';
      else if (t.type === 'usage') {
        const label = t.category === 'supplements' ? 'Envio' : 'Envio/Uso';
        typeBadge = `<span class="badge badge-usage">${label}</span>`;
      }

      const categoryName = t.category === 'supplements' ? 'Suplemento' : 'Alimento';
      const formattedDate = t.date.split('-').reverse().join('/');
      const formattedValue = t.type === 'usage' ? `- R$ ${t.totalCost.toFixed(2)}` : `R$ ${t.totalCost.toFixed(2)}`;
      const valueStyle = t.type === 'usage' ? 'color: var(--accent-cyan);' : 'font-weight: 600;';

      const recipientText = t.recipient ? `<div style="font-size: 0.8rem; color: var(--accent-cyan); margin-top: 4px; font-weight: 500;">Enviado para: ${t.recipient}</div>` : '';

      return `
        <tr>
          <td>${formattedDate}</td>
          <td>${typeBadge}</td>
          <td>${categoryName}</td>
          <td>
            <strong>${t.itemName}</strong>
            ${recipientText}
            ${t.notes ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Obs: ${t.notes}</div>` : ''}
          </td>
          <td>${t.quantity} ${t.unit}</td>
          <td>R$ ${t.unitPrice.toFixed(2)}</td>
          <td style="${valueStyle}">${formattedValue}</td>
          <td style="text-align: right;">
            <button class="btn btn-danger btn-sm delete-tx-btn" data-id="${t.id}">Estornar</button>
          </td>
        </tr>
      `;
    }).join('');

    // Bind delete (rollback) buttons
    tableBody.querySelectorAll('.delete-tx-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm("Deseja realmente estornar esta transação? Os valores financeiros e estoque serão revertidos automaticamente.")) {
          try {
            store.deleteTransaction(id);
            window.dispatchEvent(new Event('storeUpdated'));
          } catch (err) {
            alert("Não foi possível estornar: " + err.message);
          }
        }
      });
    });
  },

  // Export as CSV
  exportToCSV() {
    const txs = store.getTransactions();
    if (txs.length === 0) {
      alert("Nenhum dado para exportar.");
      return;
    }

    const headers = ['Data', 'Tipo', 'Categoria', 'Item', 'Quantidade', 'Unidade', 'Preco Unitario', 'Valor Total', 'Notas'];
    const rows = txs.map(t => [
      t.date,
      t.type === 'purchase' ? 'Compra' : (t.type === 'production' ? 'Fabricacao' : 'Uso'),
      t.category === 'supplements' ? 'Suplemento' : 'Alimento',
      t.itemName,
      t.quantity,
      t.unit,
      t.unitPrice.toFixed(4),
      t.totalCost.toFixed(2),
      t.notes || ''
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // UTF-8 BOM for Excel compatibility
    csvContent += headers.join(",") + "\n";
    rows.forEach(r => {
      // Escape strings containing commas
      const escapedRow = r.map(val => {
        const strVal = String(val);
        if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      });
      csvContent += escapedRow.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historico_transacoes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Export as JSON
  exportToJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store.state, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `backup_controle_suplementos_alimentos_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
