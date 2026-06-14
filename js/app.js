import { store } from './store.js';
import { supplementsView } from './views/supplementsView.js';
import { foodsView } from './views/foodsView.js';
import { historyView } from './views/historyView.js';
import { peopleView } from './views/peopleView.js';

// Application Coordinator
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // 1. Initialize view modules (safely wrapped in try-catch)
  try { supplementsView.init(); } catch (e) { console.error("Error initializing supplementsView:", e); }
  try { foodsView.init(); } catch (e) { console.error("Error initializing foodsView:", e); }
  try { historyView.init(); } catch (e) { console.error("Error initializing historyView:", e); }
  try { peopleView.init(); } catch (e) { console.error("Error initializing peopleView:", e); }

  // 2. Set up SPA Tab Routing
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    const button = item.querySelector('button');
    if (!button) return;

    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      if (!targetId) return;

      // Update active nav class
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Update active view class
      viewSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === targetId) {
          section.classList.add('active');
        }
      });

      // Dispatch load/render events to the active view module
      if (targetId === 'view-supplements') {
        supplementsView.render();
      } else if (targetId === 'view-foods') {
        foodsView.render();
      } else if (targetId === 'view-history') {
        historyView.render();
      } else if (targetId === 'view-people') {
        peopleView.render();
      }
    });
  });

  // 2.5. Set up Sub-Tab routing
  const tabSelectors = document.querySelectorAll('.tab-selector');
  tabSelectors.forEach(selector => {
    const btns = selector.querySelectorAll('.tab-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-sub-target');
        if (!targetId) return;

        // Update active class on buttons of this selector
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update active class on sub-view sections under the parent view
        const parentSection = selector.closest('.view-section');
        if (parentSection) {
          const subSections = parentSection.querySelectorAll('.sub-view-section');
          subSections.forEach(sec => {
            sec.classList.remove('active');
            if (sec.id === targetId) {
              sec.classList.add('active');
            }
          });
        }

        // Trigger chart rendering or updates if switching to a sub-dashboard
        if (targetId === 'supp-sub-dashboard') {
          supplementsView.renderChartsAndAlerts();
        } else if (targetId === 'food-sub-dashboard') {
          foodsView.renderChartsAndAlerts();
        }
      });
    });
  });

  // 3. Modal Close Triggers (Global Backdrop and Close Buttons)
  const modals = document.querySelectorAll('.modal-overlay');
  modals.forEach(modal => {
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });

    // Close on close button click
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    // Close on cancel button click
    const cancelBtn = modal.querySelector('.btn-close-modal');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }
  });

  // Esc key closes active modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal-overlay.active');
      if (activeModal) {
        activeModal.classList.remove('active');
      }
    }
  });

  // 3.5. Edit Ingredient Form Submission Handler
  const editIngForm = document.getElementById('edit-ing-form');
  if (editIngForm) {
    editIngForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-ing-id').value;
      const category = document.getElementById('edit-ing-category').value;
      const name = document.getElementById('edit-ing-name').value;
      const unit = document.getElementById('edit-ing-unit').value;
      const minStock = document.getElementById('edit-ing-min').value;
      const currentStock = document.getElementById('edit-ing-stock').value;
      const averageCost = document.getElementById('edit-ing-cost').value;

      try {
        store.updateIngredient(category, id, {
          name,
          unit,
          minStock,
          currentStock,
          averageCost
        });
        editIngForm.reset();
        document.getElementById('modal-edit-ingredient').classList.remove('active');
        window.dispatchEvent(new Event('storeUpdated'));
      } catch (err) {
        alert("Erro: " + err.message);
      }
    });
  }

  // Global helper to open edit ingredient modal
  window.openEditIngredientModal = function(category, id) {
    const ingredients = store.getIngredients(category);
    const ing = ingredients.find(i => i.id === id);
    if (!ing) return;

    document.getElementById('edit-ing-id').value = id;
    document.getElementById('edit-ing-category').value = category;
    document.getElementById('edit-ing-name').value = ing.name;
    document.getElementById('edit-ing-unit').value = ing.unit;
    document.getElementById('edit-ing-min').value = ing.minStock;
    document.getElementById('edit-ing-stock').value = ing.currentStock;
    document.getElementById('edit-ing-cost').value = ing.averageCost.toFixed(4);

    document.getElementById('modal-edit-ingredient').classList.add('active');
  };

  // 3.6 Compare Prices Add Quote Form Submission Handler
  const compareAddQuoteForm = document.getElementById('compare-add-quote-form');
  if (compareAddQuoteForm) {
    compareAddQuoteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('compare-ing-id').value;
      const category = document.getElementById('compare-ing-category').value;
      const storeName = document.getElementById('compare-quote-store').value;
      const quantity = document.getElementById('compare-quote-qty').value;
      const totalCost = document.getElementById('compare-quote-cost').value;
      const date = document.getElementById('compare-quote-date').value;
      const notes = document.getElementById('compare-quote-notes').value;

      try {
        store.addQuote(category, {
          ingredientId: id,
          storeName,
          quantity,
          totalCost,
          date,
          notes
        });
        compareAddQuoteForm.reset();
        document.getElementById('compare-quote-date').value = new Date().toISOString().split('T')[0];
        window.renderComparePricesModal(category, id);
        window.dispatchEvent(new Event('storeUpdated'));
      } catch (err) {
        alert("Erro: " + err.message);
      }
    });
  }

  // Global helper to open compare prices modal
  window.openComparePricesModal = function(category, id) {
    const ingredients = store.getIngredients(category);
    const ing = ingredients.find(i => i.id === id);
    if (!ing) return;

    // Set fields in modal form
    document.getElementById('compare-ing-id').value = id;
    document.getElementById('compare-ing-category').value = category;
    document.getElementById('compare-ing-name').innerText = ing.name;
    document.querySelectorAll('.compare-ing-unit-label').forEach(el => el.innerText = ing.unit);

    // Reset cotações form
    const quoteForm = document.getElementById('compare-add-quote-form');
    if (quoteForm) {
      quoteForm.reset();
      document.getElementById('compare-quote-date').value = new Date().toISOString().split('T')[0];
    }

    // Populate data tables
    window.renderComparePricesModal(category, id);

    document.getElementById('modal-compare-prices').classList.add('active');
  };

  window.renderComparePricesModal = function(category, id) {
    const ingredients = store.getIngredients(category);
    const ing = ingredients.find(i => i.id === id);
    if (!ing) return;

    // 1. Populate Cotações Pesquisadas
    const quotes = store.getQuotes(category, id);
    const quotesBody = document.getElementById('compare-quotes-table-body');
    if (quotesBody) {
      if (quotes.length === 0) {
        quotesBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 12px;">
              Nenhuma cotação cadastrada para este insumo.
            </td>
          </tr>
        `;
      } else {
        const cheapestQuote = quotes[0]; // sorted by unitPrice ascending in store.js
        quotesBody.innerHTML = quotes.map(q => {
          const isCheapest = q.id === cheapestQuote.id && q.unitPrice > 0;
          const highlightClass = isCheapest ? 'cheapest-highlight' : '';
          const cheapestLabel = isCheapest ? ' <span class="badge badge-purchase" style="font-size: 0.65rem; padding: 2px 4px; text-transform: none; margin-left: 5px;">Mais Barato</span>' : '';
          
          return `
            <tr class="${highlightClass}">
              <td><strong>${q.store}</strong>${cheapestLabel}</td>
              <td>${q.quantity} ${ing.unit} por R$ ${q.totalCost.toFixed(2)}</td>
              <td><strong>R$ ${q.unitPrice.toFixed(4)}</strong> / ${ing.unit}</td>
              <td><span style="opacity:0.75; font-size:0.8rem;">${q.notes || '-'}</span></td>
              <td style="text-align: right;">
                <div style="display:flex; flex-wrap:wrap; gap:4px; justify-content:flex-end;">
                <button class="btn btn-primary btn-sm use-quote-btn" data-store="${q.store}" data-qty="${q.quantity}" data-cost="${q.totalCost}">Comprar</button>
                <button class="btn btn-danger btn-sm delete-quote-btn" data-id="${q.id}">Excluir</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Bind delete quote buttons
        quotesBody.querySelectorAll('.delete-quote-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const quoteId = btn.getAttribute('data-id');
            if (confirm("Deseja realmente excluir esta cotação?")) {
              store.deleteQuote(category, quoteId);
              window.renderComparePricesModal(category, id);
            }
          });
        });

        // Bind use quote buttons
        quotesBody.querySelectorAll('.use-quote-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const quoteStore = btn.getAttribute('data-store');
            const quoteQty = btn.getAttribute('data-qty');
            const quoteCost = btn.getAttribute('data-cost');

            // Close compare modal
            document.getElementById('modal-compare-prices').classList.remove('active');

            // Open appropriate category purchase modal
            if (category === 'supplements') {
              const select = document.getElementById('supp-pur-ing-select');
              supplementsView.populateIngredientSelect('supp-pur-ing-select');
              select.value = id;
              document.getElementById('supp-pur-qty').value = quoteQty;
              document.getElementById('supp-pur-cost').value = quoteCost;
              document.getElementById('supp-pur-store').value = quoteStore;
              document.getElementById('supp-pur-date').value = new Date().toISOString().split('T')[0];
              document.getElementById('supp-pur-notes').value = "Comprado com base na cotação pesquisada";
              document.getElementById('modal-supp-purchase').classList.add('active');
            } else {
              const select = document.getElementById('food-pur-ing-select');
              foodsView.populateIngredientSelect('food-pur-ing-select');
              select.value = id;
              document.getElementById('food-pur-qty').value = quoteQty;
              document.getElementById('food-pur-cost').value = quoteCost;
              document.getElementById('food-pur-store').value = quoteStore;
              document.getElementById('food-pur-date').value = new Date().toISOString().split('T')[0];
              document.getElementById('food-pur-notes').value = "Comprado com base na cotação pesquisada";
              document.getElementById('modal-food-usage'); // dummy reference or just open modal
              document.getElementById('modal-food-purchase').classList.add('active');
            }
          });
        });
      }
    }

    // 2. Populate Histórico de Compras Reais
    const purchases = store.getTransactions(category)
      .filter(t => t.type === 'purchase' && t.itemId === id && t.quantity > 0);
    const purchasesBody = document.getElementById('compare-purchases-table-body');
    if (purchasesBody) {
      if (purchases.length === 0) {
        purchasesBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 12px;">
              Nenhuma compra registrada para este insumo.
            </td>
          </tr>
        `;
      } else {
        const cheapestPurchase = purchases.reduce((cheapest, current) => {
          const currentUnit = current.totalCost / current.quantity;
          const cheapestUnit = cheapest.totalCost / cheapest.quantity;
          return currentUnit < cheapestUnit ? current : cheapest;
        });

        purchasesBody.innerHTML = purchases.map(p => {
          const unitPrice = p.totalCost / p.quantity;
          const isCheapest = p.id === cheapestPurchase.id;
          const highlightClass = isCheapest ? 'cheapest-highlight' : '';
          const cheapestLabel = isCheapest ? ' <span class="badge badge-purchase" style="font-size: 0.65rem; padding: 2px 4px; text-transform: none; margin-left: 5px;">Melhor Custo</span>' : '';
          const dateStr = p.date.split('-').reverse().join('/');

          return `
            <tr class="${highlightClass}">
              <td>${dateStr}</td>
              <td><strong>${p.store || 'Desconhecido'}</strong>${cheapestLabel}</td>
              <td>${p.quantity} ${ing.unit}</td>
              <td>R$ ${p.totalCost.toFixed(2)}</td>
              <td><strong>R$ ${unitPrice.toFixed(4)}</strong> / ${ing.unit}</td>
            </tr>
          `;
        }).join('');
      }
    }
  };

  // 4. Initial Render
  supplementsView.render();
}
