import { store } from '../store.js';
import { renderBarChart } from '../charts.js';

export const dashboardView = {
  init() {
    this.render();
    
    // Listen for state changes (e.g. transactions registered elsewhere) to re-render
    window.addEventListener('storeUpdated', () => {
      if (document.getElementById('view-dashboard').classList.contains('active')) {
        this.render();
      }
    });

    // Reset database handler
    const resetBtn = document.getElementById('db-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm("⚠️ Tem certeza que deseja limpar TODOS os dados? Esta ação não pode ser desfeita!")) {
          store.reset();
          window.dispatchEvent(new Event('storeUpdated'));
          alert("Banco de dados resetado.");
        }
      });
    }
  },

  render() {
    const summary = store.getFinancialSummary();
    const alerts = store.getLowStockItems();
    
    // 1. Update Financial Summary Cards
    document.getElementById('dash-total-spent').innerText = `R$ ${summary.totalPurchases.toFixed(2)}`;
    document.getElementById('dash-raw-value').innerText = `R$ ${summary.rawInventoryValue.toFixed(2)}`;
    document.getElementById('dash-finished-value').innerText = `R$ ${summary.finishedInventoryValue.toFixed(2)}`;
    document.getElementById('dash-usage-cost').innerText = `R$ ${summary.totalUsageCost.toFixed(2)}`;

    // 2. Render Low Stock Alerts Table
    const alertsTableBody = document.getElementById('dash-alerts-table-body');
    if (alertsTableBody) {
      if (alerts.length === 0) {
        alertsTableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--text-muted);">
              🎉 Todos os estoques estão normais!
            </td>
          </tr>
        `;
      } else {
        alertsTableBody.innerHTML = alerts.slice(0, 5).map(alertItem => {
          const statusClass = alertItem.current === 0 ? 'stock-critical' : 'stock-low';
          const badgeClass = alertItem.current === 0 ? 'badge-danger' : 'badge-warn';
          
          return `
            <tr>
              <td><strong>${alertItem.name}</strong></td>
              <td><span class="badge ${alertItem.category === 'Suplemento' ? 'badge-production' : 'badge-purchase'}">${alertItem.category}</span></td>
              <td>${alertItem.type}</td>
              <td>
                <div class="stock-indicator">
                  <span class="stock-dot ${statusClass}"></span>
                  <span>${alertItem.current.toFixed(1)} ${alertItem.unit}</span>
                </div>
              </td>
              <td><span class="badge ${badgeClass}">${alertItem.current === 0 ? 'Zerado' : 'Baixo'}</span></td>
            </tr>
          `;
        }).join('');
      }
    }

    // 3. Render Recent Transactions Table
    const recentTableBody = document.getElementById('dash-recent-table-body');
    if (recentTableBody) {
      const txs = store.getTransactions().slice(0, 5);
      if (txs.length === 0) {
        recentTableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
              Nenhuma movimentação cadastrada.
            </td>
          </tr>
        `;
      } else {
        recentTableBody.innerHTML = txs.map(t => {
          let typeBadge = '';
          if (t.type === 'purchase') typeBadge = '<span class="badge badge-purchase">Compra</span>';
          else if (t.type === 'production') typeBadge = '<span class="badge badge-production">Pronto</span>';
          else if (t.type === 'usage') {
            const label = t.category === 'supplements' ? 'Envio' : 'Envio/Uso';
            typeBadge = `<span class="badge badge-usage">${label}</span>`;
          }

          const categoryName = t.category === 'supplements' ? 'Suplemento' : 'Alimento';
          const formattedValue = t.type === 'usage' ? `- R$ ${t.totalCost.toFixed(2)}` : `R$ ${t.totalCost.toFixed(2)}`;
          const valueStyle = t.type === 'usage' ? 'color: var(--accent-cyan);' : 'font-weight: 600;';

          const recipientText = t.recipient ? ` <span style="color: var(--accent-cyan); font-size: 0.75rem;">(Para: ${t.recipient})</span>` : '';

          return `
            <tr>
              <td>${t.date.split('-').reverse().join('/')}</td>
              <td>${typeBadge}</td>
              <td>${categoryName}</td>
              <td><strong>${t.itemName}</strong>${recipientText}</td>
              <td>${t.quantity} ${t.unit}</td>
              <td style="${valueStyle}">${formattedValue}</td>
            </tr>
          `;
        }).join('');
      }
    }

    // 4. Render Financial Chart (Expenses by month)
    this.renderFinancialChart();
  },

  renderFinancialChart() {
    const txs = store.getTransactions();
    
    // Group purchases by month and category (supplements vs foods)
    const monthlyData = {};
    
    // Get last 6 months list
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthsKeys = [];
    const labels = [];
    
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsKeys.push(key);
      labels.push(`${monthNames[d.getMonth()]} / ${String(d.getFullYear()).slice(-2)}`);
      
      monthlyData[key] = { supplements: 0, foods: 0 };
    }

    // Accumulate purchases cost
    txs.forEach(t => {
      if (t.type === 'purchase') {
        const monthKey = t.date.substring(0, 7); // YYYY-MM
        if (monthlyData[monthKey]) {
          if (t.category === 'supplements') {
            monthlyData[monthKey].supplements += t.totalCost;
          } else if (t.category === 'foods') {
            monthlyData[monthKey].foods += t.totalCost;
          }
        }
      }
    });

    const supplementsCosts = monthsKeys.map(key => monthlyData[key].supplements);
    const foodsCosts = monthsKeys.map(key => monthlyData[key].foods);

    renderBarChart('dashboard-financial-chart', [
      {
        label: 'Suplementos (Compras)',
        data: supplementsCosts,
        color: '#9d4edd' // purple
      },
      {
        label: 'Alimentos (Compras)',
        data: foodsCosts,
        color: '#00f59b' // green
      }
    ], labels);
  }
};
