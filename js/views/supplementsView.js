import { store } from '../store.js';
import { renderLineChart } from '../charts.js';

export const supplementsView = {
  category: 'supplements',

  init() {
    this.registerEventListeners();
    this.render();

    window.addEventListener('storeUpdated', () => {
      if (document.getElementById('view-supplements').classList.contains('active')) {
        this.render();
      }
    });
  },

  registerEventListeners() {
    // 1. Add Ingredient Form
    const addIngForm = document.getElementById('supp-add-ing-form');
    if (addIngForm) {
      addIngForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('supp-ing-name').value;
        const unit = document.getElementById('supp-ing-unit').value;
        const minStock = document.getElementById('supp-ing-min').value;
        const subType = document.getElementById('supp-ing-subtype').value;

        try {
          store.addIngredient(this.category, { name, unit, minStock, subType });
          addIngForm.reset();
          this.closeModal('modal-supp-add-ing');
          window.dispatchEvent(new Event('storeUpdated'));
        } catch (err) {
          alert("Erro: " + err.message);
        }
      });
    }

    // 2. Record Purchase Form
    const purchaseForm = document.getElementById('supp-purchase-form');
    if (purchaseForm) {
      purchaseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const ingredientId = document.getElementById('supp-pur-ing-select').value;
        const quantity = document.getElementById('supp-pur-qty').value;
        const totalCost = document.getElementById('supp-pur-cost').value;
        const date = document.getElementById('supp-pur-date').value;
        const storeName = document.getElementById('supp-pur-store').value;
        const notes = document.getElementById('supp-pur-notes').value;

        try {
          store.recordPurchase(this.category, { ingredientId, quantity, totalCost, date, store: storeName, notes });
          purchaseForm.reset();
          this.closeModal('modal-supp-purchase');
          window.dispatchEvent(new Event('storeUpdated'));
        } catch (err) {
          alert("Erro: " + err.message);
        }
      });
    }

    // 3. Dynamic Ingredient Rows in Recipe Form
    const addRecipeIngBtn = document.getElementById('supp-recipe-add-ing-row');
    if (addRecipeIngBtn) {
      addRecipeIngBtn.addEventListener('click', () => {
        this.addRecipeIngredientRow();
      });
    }

    // 4. Add Recipe Form
    const recipeForm = document.getElementById('supp-recipe-form');
    if (recipeForm) {
      recipeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('supp-rec-name').value;
        const unit = document.getElementById('supp-rec-unit').value;
        const capsuleId = document.getElementById('supp-rec-capsule-select').value;
        const capsuleQty = parseFloat(document.getElementById('supp-rec-capsule-qty').value) || 0;
        
        // Collect recipe ingredients
        const ingRows = document.querySelectorAll('.supp-recipe-ing-row');
        const ingredients = [];
        let valid = true;

        ingRows.forEach(row => {
          const ingredientId = row.querySelector('.recipe-ing-select').value;
          const quantity = parseFloat(row.querySelector('.recipe-ing-qty').value) || 0;
          
          if (!ingredientId || quantity <= 0) {
            valid = false;
            return;
          }
          ingredients.push({ ingredientId, quantity });
        });

        if (!valid || ingredients.length === 0) {
          alert("Por favor, preencha todos os insumos e quantidades na fórmula.");
          return;
        }

        if (capsuleId && capsuleQty <= 0) {
          alert("Por favor, insira uma quantidade válida de cápsulas por dose.");
          return;
        }

        try {
          store.addRecipe(this.category, { name, unit, ingredients, capsuleId, capsuleQty });
          recipeForm.reset();
          // Reset ingredient rows in builder to only one row
          const builder = document.getElementById('supp-recipe-ingredients-builder');
          builder.innerHTML = '';
          this.addRecipeIngredientRow(); // Add back one empty row
          
          this.closeModal('modal-supp-recipe');
          window.dispatchEvent(new Event('storeUpdated'));
        } catch (err) {
          alert("Erro: " + err.message);
        }
      });
    }

    // 5. Record Production Form
    const productionForm = document.getElementById('supp-production-form');
    if (productionForm) {
      productionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const recipeId = document.getElementById('supp-prod-recipe-select').value;
        const yieldQuantity = document.getElementById('supp-prod-qty').value;
        const date = document.getElementById('supp-prod-date').value;
        const notes = document.getElementById('supp-prod-notes').value;

        try {
          store.recordProduction(this.category, { recipeId, yieldQuantity, date, notes });
          productionForm.reset();
          this.closeModal('modal-supp-production');
          window.dispatchEvent(new Event('storeUpdated'));
        } catch (err) {
          alert("Erro: " + err.message);
        }
      });
    }

    // 6. Record Usage Form
    const usageForm = document.getElementById('supp-usage-form');
    if (usageForm) {
      usageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemId = document.getElementById('supp-use-item-select').value;
        const quantity = document.getElementById('supp-use-qty').value;
        const date = document.getElementById('supp-use-date').value;
        const recipientId = document.getElementById('supp-use-recipient-select').value;
        const notes = document.getElementById('supp-use-notes').value;

        try {
          store.recordUsage(this.category, { itemId, itemType: 'product', quantity, date, notes, recipientId });
          usageForm.reset();
          this.closeModal('modal-supp-usage');
          window.dispatchEvent(new Event('storeUpdated'));
        } catch (err) {
          alert("Erro: " + err.message);
        }
      });
    }

    // Bind triggers to open modals and load dropdown selections
    document.getElementById('btn-supp-add-ing').addEventListener('click', () => this.openModal('modal-supp-add-ing'));
    
    document.getElementById('btn-supp-purchase').addEventListener('click', () => {
      this.populateIngredientSelect('supp-pur-ing-select');
      document.getElementById('supp-pur-store').value = '';
      // Set current date as default
      document.getElementById('supp-pur-date').value = new Date().toISOString().split('T')[0];
      this.openModal('modal-supp-purchase');
    });

    document.getElementById('btn-supp-recipe').addEventListener('click', () => {
      // Initialize recipe builder rows
      const builder = document.getElementById('supp-recipe-ingredients-builder');
      builder.innerHTML = '';
      this.addRecipeIngredientRow();
      this.populateCapsuleSelect('supp-rec-capsule-select');
      this.openModal('modal-supp-recipe');
    });

    document.getElementById('btn-supp-production').addEventListener('click', () => {
      this.populateRecipeSelect('supp-prod-recipe-select');
      document.getElementById('supp-prod-date').value = new Date().toISOString().split('T')[0];
      this.openModal('modal-supp-production');
    });

    document.getElementById('btn-supp-usage').addEventListener('click', () => {
      this.populateProductSelect('supp-use-item-select');
      this.populatePeopleSelect('supp-use-recipient-select');
      document.getElementById('supp-use-date').value = new Date().toISOString().split('T')[0];
      this.openModal('modal-supp-usage');
    });

    // Live filter: Insumos table
    const suppIngFilter = document.getElementById('supp-ing-filter');
    if (suppIngFilter) {
      suppIngFilter.addEventListener('input', () => {
        this.applyTableFilter('supp-ing-table-body', suppIngFilter.value);
      });
    }

    // Live filter: Produtos prontos table
    const suppProdFilter = document.getElementById('supp-prod-filter');
    if (suppProdFilter) {
      suppProdFilter.addEventListener('input', () => {
        this.applyTableFilter('supp-prod-table-body', suppProdFilter.value);
      });
    }
  },

  // Filters table rows whose first <td> text matches the query (case-insensitive)
  applyTableFilter(tbodyId, query) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const q = query.trim().toLowerCase();
    Array.from(tbody.querySelectorAll('tr')).forEach(row => {
      const firstCell = row.querySelector('td');
      if (!firstCell) return;
      const text = firstCell.textContent.toLowerCase();
      row.style.display = (!q || text.includes(q)) ? '' : 'none';
    });
  },

  // Modal actions
  openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
  },

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  },

  // Select Populators
  populatePeopleSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const people = store.getPeople();
    select.innerHTML = '<option value="">Consumo Próprio (Padrão)</option>' + people.map(p => `
      <option value="${p.id}">${p.name}</option>
    `).join('');
  },

  populateIngredientSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const ingredients = store.getIngredients(this.category);
    if (ingredients.length === 0) {
      select.innerHTML = '<option value="">-- Cadastre um insumo primeiro --</option>';
    } else {
      select.innerHTML = ingredients.map(i => `
        <option value="${i.id}">${i.name} (${i.unit}) - Estoque: ${i.currentStock.toFixed(1)}</option>
      `).join('');
    }
  },

  populateCapsuleSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const ingredients = store.getIngredients(this.category).filter(i => i.subType === 'capsula');
    if (ingredients.length === 0) {
      select.innerHTML = '<option value="">Nenhuma (Fórmula em pó/livre)</option>';
    } else {
      select.innerHTML = '<option value="">Nenhuma (Fórmula em pó/livre)</option>' + ingredients.map(i => `
        <option value="${i.id}">${i.name} (Estoque: ${i.currentStock.toFixed(1)})</option>
      `).join('');
    }
  },

  populateRecipeSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const recipes = store.getRecipes(this.category);
    if (recipes.length === 0) {
      select.innerHTML = '<option value="">-- Cadastre uma fórmula primeiro --</option>';
    } else {
      select.innerHTML = recipes.map(r => `
        <option value="${r.id}">${r.name} (${r.unit})</option>
      `).join('');
    }
  },

  populateProductSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const products = store.getProducts(this.category);
    if (products.length === 0) {
      select.innerHTML = '<option value="">-- Fabrique um lote primeiro --</option>';
    } else {
      select.innerHTML = products.map(p => `
        <option value="${p.id}">${p.name} - Estoque: ${p.currentStock.toFixed(1)} ${p.unit}</option>
      `).join('');
    }
  },

  addRecipeIngredientRow() {
    const builder = document.getElementById('supp-recipe-ingredients-builder');
    if (!builder) return;

    const ingredients = store.getIngredients(this.category).filter(i => i.subType !== 'capsula');
    if (ingredients.length === 0) {
      alert("Por favor, cadastre matérias-primas/pós antes de criar fórmulas.");
      return;
    }

    const rowId = 'recipe-row-' + Math.random().toString(36).substr(2, 5);
    const options = ingredients.map(i => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join('');

    const rowHtml = `
      <div class="recipe-ingredient-row supp-recipe-ing-row" id="${rowId}">
        <div>
          <label>Insumo</label>
          <select class="recipe-ing-select" required>
            ${options}
          </select>
        </div>
        <div>
          <label>Quantidade</label>
          <input type="number" step="0.01" class="recipe-ing-qty" placeholder="Ex: 5" required />
        </div>
        <div>
          <button type="button" class="btn btn-danger btn-sm delete-row-btn" style="height: 44px; width: 44px; display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
    `;

    builder.insertAdjacentHTML('beforeend', rowHtml);

    // Bind delete event to the new row's button
    const newRow = document.getElementById(rowId);
    newRow.querySelector('.delete-row-btn').addEventListener('click', () => {
      // Don't delete if it's the only row left
      if (document.querySelectorAll('.supp-recipe-ing-row').length > 1) {
        newRow.remove();
      } else {
        alert("A fórmula precisa de pelo menos 1 insumo.");
      }
    });
  },

  render() {
    const ingredients = store.getIngredients(this.category);
    const recipes = store.getRecipes(this.category);
    const products = store.getProducts(this.category);
    
    // Summary values
    const financial = store.getFinancialSummary(this.category);
    document.getElementById('supp-summary-spent').innerText = `R$ ${financial.totalPurchases.toFixed(2)}`;
    document.getElementById('supp-summary-stock-val').innerText = `R$ ${financial.totalInventoryValue.toFixed(2)}`;
    document.getElementById('supp-summary-consumption').innerText = `R$ ${financial.totalUsageCost.toFixed(2)}`;

    // Render sub-dashboard widgets if active
    const subDash = document.getElementById('supp-sub-dashboard');
    if (subDash && subDash.classList.contains('active')) {
      this.renderChartsAndAlerts();
    }

    // 1. Render Ingredients (Insumos) Table
    const ingTableBody = document.getElementById('supp-ing-table-body');
    if (ingTableBody) {
      if (ingredients.length === 0) {
        ingTableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
              Nenhum insumo cadastrado. Clique em "Adicionar Insumo" para começar.
            </td>
          </tr>
        `;
      } else {
        ingTableBody.innerHTML = ingredients.map(i => {
          const statusClass = i.currentStock === 0 ? 'stock-critical' : (i.currentStock <= i.minStock ? 'stock-low' : 'stock-ok');
          const badgeClass = i.currentStock === 0 ? 'badge-danger' : (i.currentStock <= i.minStock ? 'badge-warn' : '');
          
          const isCapsule = i.subType === 'capsula';
          const nameLabel = isCapsule ? ' <span class="badge badge-production" style="text-transform: none;">Cápsula</span>' : '';

          const lastPurchase = store.getTransactions(this.category)
            .find(t => t.type === 'purchase' && t.itemId === i.id);
          const lastPurchaseDate = lastPurchase ? lastPurchase.date.split('-').reverse().join('/') : 'N/A';

          return `
            <tr>
              <td>
                <strong>${i.name}</strong>${nameLabel}
                <div class="table-sub-text">Última Compra: ${lastPurchaseDate}</div>
              </td>
              <td>
                <span class="stock-indicator">
                  <span class="stock-dot ${statusClass}"></span>
                  <span>${i.currentStock.toFixed(1)} ${i.unit} <span style="opacity: 0.5; font-size: 0.75rem;">(Mín: ${i.minStock.toFixed(1)})</span></span>
                </span>
              </td>
              <td>
                <strong>R$ ${(i.currentStock * i.averageCost).toFixed(2)}</strong>
                <div class="table-sub-text">Preço Médio: R$ ${i.averageCost.toFixed(4)}</div>
              </td>
              <td style="text-align: right;">
                <div style="display:flex; flex-wrap:wrap; gap:4px; justify-content:flex-end;">
                <button class="btn btn-purple btn-sm compare-ing-btn" data-id="${i.id}">Comparar</button>
                <button class="btn btn-secondary btn-sm edit-ing-btn" data-id="${i.id}">Editar</button>
                <button class="btn btn-danger btn-sm delete-ing-btn" data-id="${i.id}">Excluir</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Bind delete / edit buttons
        ingTableBody.querySelectorAll('.delete-ing-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const ingName = ingredients.find(i => i.id === id)?.name;
            if (confirm(`Deseja realmente excluir o insumo "${ingName}"?`)) {
              try {
                store.deleteIngredient(this.category, id);
                window.dispatchEvent(new Event('storeUpdated'));
              } catch (err) {
                alert("Erro: " + err.message);
              }
            }
          });
        });

        ingTableBody.querySelectorAll('.edit-ing-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            window.openEditIngredientModal(this.category, id);
          });
        });

        ingTableBody.querySelectorAll('.compare-ing-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            window.openComparePricesModal(this.category, id);
          });
        });
      }
    }

    // 2. Render Recipes & Finished Products (Fórmulas e Estoque Pronto)
    const prodTableBody = document.getElementById('supp-prod-table-body');
    if (prodTableBody) {
      if (products.length === 0) {
        prodTableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
              Nenhum produto pronto cadastrado. Crie uma fórmula e fabrique um lote para começar.
            </td>
          </tr>
        `;
      } else {
        prodTableBody.innerHTML = products.map(p => {
          const recipe = recipes.find(r => r.id === p.recipeId);
          let recipeIngredientsText = recipe ? recipe.ingredients.map(ri => {
            const ing = ingredients.find(i => i.id === ri.ingredientId);
            return `${ri.quantity}${ing ? ing.unit : ''} de ${ing ? ing.name : 'insumo deletado'}`;
          }).join(', ') : 'Fórmula não encontrada';

          if (recipe && recipe.capsuleId) {
            const cap = ingredients.find(i => i.id === recipe.capsuleId);
            const capName = cap ? cap.name : 'cápsula deletada';
            recipeIngredientsText += ` + ${recipe.capsuleQty} x ${capName}`;
          }

          const statusClass = p.currentStock === 0 ? 'stock-critical' : (p.currentStock <= p.minStock ? 'stock-low' : 'stock-ok');

          const lastProd = store.getTransactions(this.category)
            .find(t => t.type === 'production' && t.itemId === p.id);
          const lastProdDate = lastProd ? lastProd.date.split('-').reverse().join('/') : 'N/A';

          return `
            <tr>
              <td>
                <strong>${p.name}</strong>
                <div class="table-sub-text" style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  Insumos: ${recipeIngredientsText}
                </div>
                <div class="table-sub-text">Último Preparo: ${lastProdDate}</div>
              </td>
              <td>
                <span class="stock-indicator">
                  <span class="stock-dot ${statusClass}"></span>
                  <span>${p.currentStock.toFixed(1)} ${p.unit} <span style="opacity: 0.5; font-size: 0.75rem;">(Mín: ${p.minStock.toFixed(1)})</span></span>
                </span>
              </td>
              <td>
                <strong>R$ ${(p.currentStock * p.averageCost).toFixed(2)}</strong>
                <div class="table-sub-text">Custo Unit: R$ ${p.averageCost.toFixed(2)}</div>
              </td>
              <td style="text-align: right;">
                <div style="display:flex; flex-wrap:wrap; gap:4px; justify-content:flex-end;">
                <button class="btn btn-secondary btn-sm edit-prod-min-btn" data-id="${p.id}">Alerta</button>
                <button class="btn btn-danger btn-sm delete-recipe-btn" data-id="${p.recipeId}">Excluir</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Bind delete recipes
        prodTableBody.querySelectorAll('.delete-recipe-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const recipeId = e.target.getAttribute('data-id');
            const recipeName = recipes.find(r => r.id === recipeId)?.name;
            if (confirm(`Deseja realmente excluir a fórmula "${recipeName}"? Isso excluirá o produto pronto associado (apenas se o estoque for zero).`)) {
              try {
                store.deleteRecipe(this.category, recipeId);
                window.dispatchEvent(new Event('storeUpdated'));
              } catch (err) {
                alert("Erro: " + err.message);
              }
            }
          });
        });

        // Bind edit product min stock alert
        prodTableBody.querySelectorAll('.edit-prod-min-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const prod = products.find(p => p.id === id);
            if (!prod) return;

            const newMin = prompt(`Estoque mínimo de alerta para ${prod.name} (unidade: ${prod.unit}):`, prod.minStock);
            if (newMin === null) return;

            try {
              store.updateProductMinStock(this.category, id, newMin);
              window.dispatchEvent(new Event('storeUpdated'));
            } catch (err) {
              alert("Erro: " + err.message);
            }
          });
        });
      }
    }
  },

  renderChartsAndAlerts() {
    const txs = store.getTransactions(this.category);
    
    // 1. Group expenses by month (last 6 months)
    const monthlyData = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthsKeys = [];
    const labels = [];
    
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsKeys.push(key);
      labels.push(`${monthNames[d.getMonth()]} / ${String(d.getFullYear()).slice(-2)}`);
      monthlyData[key] = 0;
    }

    txs.forEach(t => {
      if (t.type === 'purchase') {
        const monthKey = t.date.substring(0, 7); // YYYY-MM
        if (monthlyData[monthKey] !== undefined) {
          monthlyData[monthKey] += t.totalCost;
        }
      }
    });

    const dataPoints = monthsKeys.map(key => monthlyData[key]);
    renderLineChart('supplements-financial-chart', dataPoints, labels, '#9d4edd', 'Gastos Suplementos');

    // 2. Render Low Stock Alerts for supplements
    const alertsBody = document.getElementById('supp-dash-alerts-body');
    if (alertsBody) {
      const alerts = store.getLowStockItems(this.category);
      if (alerts.length === 0) {
        alertsBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 12px;">
              🎉 Tudo em ordem!
            </td>
          </tr>
        `;
      } else {
        alertsBody.innerHTML = alerts.slice(0, 5).map(a => {
          const statusClass = a.current === 0 ? 'stock-critical' : 'stock-low';
          return `
            <tr>
              <td><strong>${a.name}</strong></td>
              <td>${a.type}</td>
              <td>
                <div class="stock-indicator">
                  <span class="stock-dot ${statusClass}"></span>
                  <span>${a.current.toFixed(1)} ${a.unit}</span>
                </div>
              </td>
              <td><span class="badge ${a.current === 0 ? 'badge-danger' : 'badge-warn'}">${a.current === 0 ? 'Zerado' : 'Baixo'}</span></td>
            </tr>
          `;
        }).join('');
      }
    }

    // 3. Render Recent Shipments (usage transactions)
    const recentBody = document.getElementById('supp-dash-recent-body');
    if (recentBody) {
      const shipments = txs.filter(t => t.type === 'usage').slice(0, 5);
      if (shipments.length === 0) {
        recentBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 12px;">
              Nenhum envio recente.
            </td>
          </tr>
        `;
      } else {
        recentBody.innerHTML = shipments.map(s => {
          const dateStr = s.date.split('-').reverse().join('/');
          const recipientStr = s.recipientName || 'Consumo Próprio';
          return `
            <tr>
              <td>${dateStr}</td>
              <td><strong>${s.itemName}</strong></td>
              <td>${s.quantity} ${s.unit}</td>
              <td><span style="color: var(--accent-cyan); font-weight: 500;">${recipientStr}</span></td>
            </tr>
          `;
        }).join('');
      }
    }
  }
};
