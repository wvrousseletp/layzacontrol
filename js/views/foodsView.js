import { store } from '../store.js';
import { renderLineChart } from '../charts.js';

export const foodsView = {
  category: 'foods',

  init() {
    this.cameraStream = null;
    this.isScanningCamera = false;
    this.registerEventListeners();
    this.render();

    // MutationObserver to stop camera if the import modal is closed
    const nfcModal = document.getElementById('modal-food-nfc-import');
    if (nfcModal) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            const isActive = nfcModal.classList.contains('active');
            if (!isActive) {
              this.stopCameraScan();
            }
          }
        });
      });
      observer.observe(nfcModal, { attributes: true });
    }

    // Stop camera if user switches tabs via main navigation
    document.querySelectorAll('.nav-item button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.stopCameraScan();
      });
    });

    // Stop camera if visibility changes (e.g. app goes to background / tab switch)
    window.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopCameraScan();
      }
    });

    // Stop camera on page unload/refresh
    window.addEventListener('beforeunload', () => {
      this.stopCameraScan();
    });

    window.addEventListener('storeUpdated', () => {
      if (document.getElementById('view-foods').classList.contains('active')) {
        this.render();
      }
    });
  },

  registerEventListeners() {
    // 1. Add Ingredient Form
    const addIngForm = document.getElementById('food-add-ing-form');
    if (addIngForm) {
      addIngForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('food-ing-name').value;
        const unit = document.getElementById('food-ing-unit').value;
        const minStock = document.getElementById('food-ing-min').value;

        try {
          store.addIngredient(this.category, { name, unit, minStock });
          addIngForm.reset();
          this.closeModal('modal-food-add-ing');
          window.dispatchEvent(new Event('storeUpdated'));
        } catch (err) {
          alert("Erro: " + err.message);
        }
      });
    }

    // 2. Record Purchase Form
    const purchaseForm = document.getElementById('food-purchase-form');
    if (purchaseForm) {
      purchaseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const ingredientId = document.getElementById('food-pur-ing-select').value;
        const quantity = document.getElementById('food-pur-qty').value;
        const totalCost = document.getElementById('food-pur-cost').value;
        const date = document.getElementById('food-pur-date').value;
        const storeName = document.getElementById('food-pur-store').value;
        const notes = document.getElementById('food-pur-notes').value;

        try {
          store.recordPurchase(this.category, { ingredientId, quantity, totalCost, date, store: storeName, notes });
          purchaseForm.reset();
          this.closeModal('modal-food-purchase');
          window.dispatchEvent(new Event('storeUpdated'));
        } catch (err) {
          alert("Erro: " + err.message);
        }
      });
    }

    // 3. Dynamic Ingredient Rows in Recipe Form
    const addRecipeIngBtn = document.getElementById('food-recipe-add-ing-row');
    if (addRecipeIngBtn) {
      addRecipeIngBtn.addEventListener('click', () => {
        this.addRecipeIngredientRow();
      });
    }

    // 4. Add Recipe Form
    const recipeForm = document.getElementById('food-recipe-form');
    if (recipeForm) {
      recipeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('food-rec-name').value;
        const unit = document.getElementById('food-rec-unit').value;
        
        // Collect recipe ingredients
        const ingRows = document.querySelectorAll('.food-recipe-ing-row');
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
          alert("Por favor, preencha todos os insumos e quantidades na receita.");
          return;
        }

        try {
          store.addRecipe(this.category, { name, unit, ingredients });
          recipeForm.reset();
          // Reset ingredient rows in builder to only one row
          const builder = document.getElementById('food-recipe-ingredients-builder');
          builder.innerHTML = '';
          this.addRecipeIngredientRow(); // Add back one empty row
          
          this.closeModal('modal-food-recipe');
          window.dispatchEvent(new Event('storeUpdated'));
        } catch (err) {
          alert("Erro: " + err.message);
        }
      });
    }

    // 5. Record Production Form
    const productionForm = document.getElementById('food-production-form');
    if (productionForm) {
      productionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const recipeId = document.getElementById('food-prod-recipe-select').value;
        const yieldQuantity = document.getElementById('food-prod-qty').value;
        const date = document.getElementById('food-prod-date').value;
        const notes = document.getElementById('food-prod-notes').value;

        try {
          store.recordProduction(this.category, { recipeId, yieldQuantity, date, notes });
          productionForm.reset();
          this.closeModal('modal-food-production');
          window.dispatchEvent(new Event('storeUpdated'));
        } catch (err) {
          alert("Erro: " + err.message);
        }
      });
    }

    // 6. Record Usage (Consumption) Form
    // Wait! For foods, the user can consume finished meals OR consume ingredients directly (like eggs, oats, etc.)
    // Let's implement dynamic dropdowns in the usage form: the user can choose whether to consume a "Raw Item (Insumo)" or a "Prepared Meal (Pronto)".
    // This makes the Foods Usage Modal extra powerful!
    const usageTypeSelect = document.getElementById('food-use-type-select');
    if (usageTypeSelect) {
      usageTypeSelect.addEventListener('change', (e) => {
        const type = e.target.value;
        this.populateUsageItemSelect(type);
      });
    }

    const usageForm = document.getElementById('food-usage-form');
    if (usageForm) {
      usageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemType = document.getElementById('food-use-type-select').value; // 'ingredient' or 'product'
        const itemId = document.getElementById('food-use-item-select').value;
        const quantity = document.getElementById('food-use-qty').value;
        const date = document.getElementById('food-use-date').value;
        const recipientId = document.getElementById('food-use-recipient-select').value;
        const notes = document.getElementById('food-use-notes').value;

        try {
          store.recordUsage(this.category, { itemId, itemType, quantity, date, notes, recipientId });
          usageForm.reset();
          this.closeModal('modal-food-usage');
          window.dispatchEvent(new Event('storeUpdated'));
        } catch (err) {
          alert("Erro: " + err.message);
        }
      });
    }

    // Bind triggers to open modals and load dropdown selections
    document.getElementById('btn-food-add-ing').addEventListener('click', () => this.openModal('modal-food-add-ing'));
    
    document.getElementById('btn-food-purchase').addEventListener('click', () => {
      this.populateIngredientSelect('food-pur-ing-select');
      document.getElementById('food-pur-store').value = '';
      document.getElementById('food-pur-date').value = new Date().toISOString().split('T')[0];
      this.openModal('modal-food-purchase');
    });

    document.getElementById('btn-food-recipe').addEventListener('click', () => {
      const builder = document.getElementById('food-recipe-ingredients-builder');
      builder.innerHTML = '';
      this.addRecipeIngredientRow();
      this.openModal('modal-food-recipe');
    });

    document.getElementById('btn-food-production').addEventListener('click', () => {
      this.populateRecipeSelect('food-prod-recipe-select');
      document.getElementById('food-prod-date').value = new Date().toISOString().split('T')[0];
      this.openModal('modal-food-production');
    });

    document.getElementById('btn-food-usage').addEventListener('click', () => {
      document.getElementById('food-use-type-select').value = 'product'; // Default to prepared meal
      this.populateUsageItemSelect('product');
      this.populatePeopleSelect('food-use-recipient-select');
      document.getElementById('food-use-date').value = new Date().toISOString().split('T')[0];
      this.openModal('modal-food-usage');
    });

    document.getElementById('btn-food-nfc-import').addEventListener('click', () => {
      document.getElementById('food-nfc-store').value = '';
      document.getElementById('food-nfc-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('food-nfc-url').value = '';
      document.getElementById('food-nfc-scan-status').innerHTML = '';
      document.getElementById('food-nfc-items-section').style.display = 'none';
      document.getElementById('btn-food-nfc-submit').style.display = 'none';
      this.openModal('modal-food-nfc-import');
    });

    this.registerNFCImportListeners();
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

  populateRecipeSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const recipes = store.getRecipes(this.category);
    if (recipes.length === 0) {
      select.innerHTML = '<option value="">-- Cadastre uma receita primeiro --</option>';
    } else {
      select.innerHTML = recipes.map(r => `
        <option value="${r.id}">${r.name} (${r.unit})</option>
      `).join('');
    }
  },

  populateUsageItemSelect(type) {
    const select = document.getElementById('food-use-item-select');
    if (!select) return;

    if (type === 'ingredient') {
      const ingredients = store.getIngredients(this.category);
      if (ingredients.length === 0) {
        select.innerHTML = '<option value="">-- Nenhum insumo disponível --</option>';
      } else {
        select.innerHTML = ingredients.map(i => `
          <option value="${i.id}">${i.name} - Estoque: ${i.currentStock.toFixed(1)} ${i.unit}</option>
        `).join('');
      }
    } else {
      const products = store.getProducts(this.category);
      if (products.length === 0) {
        select.innerHTML = '<option value="">-- Nenhuma refeição pronta disponível --</option>';
      } else {
        select.innerHTML = products.map(p => `
          <option value="${p.id}">${p.name} - Estoque: ${p.currentStock.toFixed(1)} ${p.unit}</option>
        `).join('');
      }
    }
  },

  addRecipeIngredientRow() {
    const builder = document.getElementById('food-recipe-ingredients-builder');
    if (!builder) return;

    const ingredients = store.getIngredients(this.category);
    if (ingredients.length === 0) {
      alert("Por favor, cadastre insumos de alimentos antes de criar receitas.");
      return;
    }

    const rowId = 'food-recipe-row-' + Math.random().toString(36).substr(2, 5);
    const options = ingredients.map(i => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join('');

    const rowHtml = `
      <div class="recipe-ingredient-row food-recipe-ing-row" id="${rowId}">
        <div>
          <label>Insumo</label>
          <select class="recipe-ing-select" required>
            ${options}
          </select>
        </div>
        <div>
          <label>Quantidade</label>
          <input type="number" step="0.01" class="recipe-ing-qty" placeholder="Ex: 0.2" required />
        </div>
        <div>
          <button type="button" class="btn btn-danger btn-sm delete-row-btn" style="height: 44px; width: 44px; display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>
    `;

    builder.insertAdjacentHTML('beforeend', rowHtml);

    const newRow = document.getElementById(rowId);
    newRow.querySelector('.delete-row-btn').addEventListener('click', () => {
      if (document.querySelectorAll('.food-recipe-ing-row').length > 1) {
        newRow.remove();
      } else {
        alert("A receita precisa de pelo menos 1 ingrediente.");
      }
    });
  },

  render() {
    const ingredients = store.getIngredients(this.category);
    const recipes = store.getRecipes(this.category);
    const products = store.getProducts(this.category);
    
    // Summary values
    const financial = store.getFinancialSummary(this.category);
    document.getElementById('food-summary-spent').innerText = `R$ ${financial.totalPurchases.toFixed(2)}`;
    document.getElementById('food-summary-stock-val').innerText = `R$ ${financial.totalInventoryValue.toFixed(2)}`;
    document.getElementById('food-summary-consumption').innerText = `R$ ${financial.totalUsageCost.toFixed(2)}`;

    // Render sub-dashboard widgets if active
    const subDash = document.getElementById('food-sub-dashboard');
    if (subDash && subDash.classList.contains('active')) {
      this.renderChartsAndAlerts();
    }

    // 1. Render Ingredients (Alimentos Crus) Table
    const ingTableBody = document.getElementById('food-ing-table-body');
    if (ingTableBody) {
      if (ingredients.length === 0) {
        ingTableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
              Nenhum alimento cadastrado. Clique em "Adicionar Alimento" para começar.
            </td>
          </tr>
        `;
      } else {
        ingTableBody.innerHTML = ingredients.map(i => {
          const statusClass = i.currentStock === 0 ? 'stock-critical' : (i.currentStock <= i.minStock ? 'stock-low' : 'stock-ok');
          
          const lastPurchase = store.getTransactions(this.category)
            .find(t => t.type === 'purchase' && t.itemId === i.id);
          const lastPurchaseDate = lastPurchase ? lastPurchase.date.split('-').reverse().join('/') : 'N/A';

          return `
            <tr>
              <td>
                <strong>${i.name}</strong>
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
                <div class="table-sub-text">Preço Médio: R$ ${i.averageCost.toFixed(2)}</div>
              </td>
              <td style="text-align: right; white-space: nowrap;">
                <button class="btn btn-purple btn-sm compare-ing-btn" data-id="${i.id}">Comparar</button>
                <button class="btn btn-secondary btn-sm edit-ing-btn" data-id="${i.id}">Editar</button>
                <button class="btn btn-danger btn-sm delete-ing-btn" data-id="${i.id}">Excluir</button>
              </td>
            </tr>
          `;
        }).join('');

        // Bind delete / edit buttons
        ingTableBody.querySelectorAll('.delete-ing-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const ingName = ingredients.find(i => i.id === id)?.name;
            if (confirm(`Deseja realmente excluir o item "${ingName}"?`)) {
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

    // 2. Render Recipes & Finished Products (Refeições Prontas / Misturas)
    const prodTableBody = document.getElementById('food-prod-table-body');
    if (prodTableBody) {
      if (products.length === 0) {
        prodTableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
              Nenhuma refeição pronta cadastrada. Crie uma receita e cozinhe um lote para começar.
            </td>
          </tr>
        `;
      } else {
        prodTableBody.innerHTML = products.map(p => {
          const recipe = recipes.find(r => r.id === p.recipeId);
          const recipeIngredientsText = recipe ? recipe.ingredients.map(ri => {
            const ing = ingredients.find(i => i.id === ri.ingredientId);
            return `${ri.quantity}${ing ? ing.unit : ''} de ${ing ? ing.name : 'insumo deletado'}`;
          }).join(', ') : 'Receita não encontrada';

          const statusClass = p.currentStock === 0 ? 'stock-critical' : (p.currentStock <= p.minStock ? 'stock-low' : 'stock-ok');

          const lastProd = store.getTransactions(this.category)
            .find(t => t.type === 'production' && t.itemId === p.id);
          const lastProdDate = lastProd ? lastProd.date.split('-').reverse().join('/') : 'N/A';

          return `
            <tr>
              <td>
                <strong>${p.name}</strong>
                <div class="table-sub-text" style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  Receita: ${recipeIngredientsText}
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
              <td style="text-align: right; white-space: nowrap;">
                <button class="btn btn-secondary btn-sm edit-prod-min-btn" data-id="${p.id}">Alerta</button>
                <button class="btn btn-danger btn-sm delete-recipe-btn" data-id="${p.recipeId}">Excluir</button>
              </td>
            </tr>
          `;
        }).join('');

        // Bind delete recipes
        prodTableBody.querySelectorAll('.delete-recipe-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const recipeId = e.target.getAttribute('data-id');
            const recipeName = recipes.find(r => r.id === recipeId)?.name;
            if (confirm(`Deseja realmente excluir a receita "${recipeName}"? Isso excluirá a refeição pronta associada (apenas se o estoque for zero).`)) {
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
    renderLineChart('foods-financial-chart', dataPoints, labels, '#00f59b', 'Gastos Alimentos');

    // 2. Render Low Stock Alerts for foods
    const alertsBody = document.getElementById('food-dash-alerts-body');
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

    // 3. Render Recent Usages/Shipments for foods
    const recentBody = document.getElementById('food-dash-recent-body');
    if (recentBody) {
      const usages = txs.filter(t => t.type === 'usage').slice(0, 5);
      if (usages.length === 0) {
        recentBody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 12px;">
              Nenhum consumo recente.
            </td>
          </tr>
        `;
      } else {
        recentBody.innerHTML = usages.map(u => {
          const dateStr = u.date.split('-').reverse().join('/');
          const recipientStr = u.recipientName || 'Consumo Próprio';
          return `
            <tr>
              <td>${dateStr}</td>
              <td><strong>${u.itemName}</strong></td>
              <td>${u.quantity} ${u.unit}</td>
              <td><span style="color: var(--accent-cyan); font-weight: 500;">${recipientStr}</span></td>
            </tr>
          `;
        }).join('');
      }
    }
  },

  registerNFCImportListeners() {
    const dropzone = document.getElementById('food-nfc-dropzone');
    const fileInput = document.getElementById('food-nfc-file-input');
    const statusDiv = document.getElementById('food-nfc-scan-status');

    if (!dropzone || !fileInput) return;

    // Trigger file input click
    dropzone.addEventListener('click', () => fileInput.click());

    // Drag and drop styles
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--accent-cyan)';
      dropzone.style.background = 'rgba(0, 240, 255, 0.05)';
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      dropzone.style.background = 'rgba(255, 255, 255, 0.02)';
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      dropzone.style.background = 'rgba(255, 255, 255, 0.02)';
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.decodeQRCodeFromImage(files[0]);
      }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        this.decodeQRCodeFromImage(files[0]);
      }
    });

    // Camera buttons
    const startCameraBtn = document.getElementById('btn-food-nfc-camera-start');
    if (startCameraBtn) {
      startCameraBtn.addEventListener('click', () => {
        this.startCameraScan();
      });
    }

    const stopCameraBtn = document.getElementById('btn-food-nfc-camera-stop');
    if (stopCameraBtn) {
      stopCameraBtn.addEventListener('click', () => {
        this.stopCameraScan();
      });
    }

    // Load URL button click
    const loadUrlBtn = document.getElementById('btn-food-nfc-load-url');
    if (loadUrlBtn) {
      loadUrlBtn.addEventListener('click', () => {
        const url = document.getElementById('food-nfc-url').value;
        if (!url || !url.trim()) {
          alert("Por favor, cole um link de QR Code válido.");
          return;
        }
        this.processNFCeURL(url);
      });
    }

    // Simulate button click
    const simulateBtn = document.getElementById('btn-food-nfc-simulate');
    if (simulateBtn) {
      simulateBtn.addEventListener('click', () => {
        document.getElementById('food-nfc-url').value = "https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?chNFe=43260690055373002345650010001234561008765432";
        document.getElementById('food-nfc-store').value = "Supermercado Layza Simulação";
        this.processNFCeURL("https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?chNFe=43260690055373002345650010001234561008765432");
      });
    }

    // Form submit import confirm
    const importForm = document.getElementById('food-nfc-import-form');
    if (importForm) {
      importForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const storeName = document.getElementById('food-nfc-store').value;
        const purchaseDate = document.getElementById('food-nfc-date').value;

        if (!storeName || !purchaseDate) {
          alert("Por favor, preencha o fornecedor e a data.");
          return;
        }

        const rows = document.querySelectorAll('.food-nfc-item-row');
        if (rows.length === 0) return;

        try {
          rows.forEach(row => {
            const select = row.querySelector('.food-nfc-mapping-select');
            const originalName = row.getAttribute('data-name');
            const unit = row.getAttribute('data-unit');
            const quantity = parseFloat(row.getAttribute('data-qty'));
            const totalCost = parseFloat(row.getAttribute('data-cost'));
            const selection = select.value;

            let ingredientId;
            if (selection === '_new') {
              // Create new ingredient
              const newIng = store.addIngredient(this.category, {
                name: originalName,
                unit: unit,
                minStock: 0
              });
              ingredientId = newIng.id;
            } else {
              ingredientId = selection;
            }

            // Record purchase
            store.recordPurchase(this.category, {
              ingredientId,
              quantity,
              totalCost,
              date: purchaseDate,
              store: storeName,
              notes: 'Importado via Nota Fiscal'
            });
          });

          importForm.reset();
          this.closeModal('modal-food-nfc-import');
          window.dispatchEvent(new Event('storeUpdated'));
          alert("Importação da Nota Fiscal efetuada com sucesso!");
        } catch (err) {
          alert("Erro na importação: " + err.message);
        }
      });
    }
  },

  decodeQRCodeFromImage(file) {
    const statusDiv = document.getElementById('food-nfc-scan-status');
    if (!statusDiv) return;

    statusDiv.style.color = 'var(--text-muted)';
    statusDiv.textContent = "Processando imagem do QR Code...";

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to draw the image and extract ImageData
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);
        
        try {
          const imageData = context.getImageData(0, 0, img.width, img.height);
          // Run jsQR
          if (typeof jsQR === 'undefined') {
            statusDiv.style.color = 'var(--color-danger)';
            statusDiv.textContent = "Biblioteca jsQR não foi carregada. Verifique sua conexão com a internet.";
            return;
          }

          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            statusDiv.style.color = 'var(--accent-green)';
            statusDiv.textContent = "QR Code decodificado com sucesso!";
            document.getElementById('food-nfc-url').value = code.data;
            this.processNFCeURL(code.data);
          } else {
            statusDiv.style.color = 'var(--accent-orange)';
            statusDiv.textContent = "Não foi possível encontrar um QR Code legível na imagem.";
          }
        } catch (err) {
          statusDiv.style.color = 'var(--color-danger)';
          statusDiv.textContent = "Erro ao processar os dados da imagem: " + err.message;
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  },

  processNFCeURL(url) {
    const statusDiv = document.getElementById('food-nfc-scan-status');
    if (statusDiv) {
      statusDiv.style.color = 'var(--accent-green)';
      statusDiv.textContent = "Nota identificada. Simulando processamento local de itens...";
    }

    // Realistic mock grocery items for demonstration since SEFAZ pages reject direct browser scrape (CORS)
    const mockItems = [
      { name: "Peito de Frango Sadia 1kg", quantity: 1, totalCost: 22.90, unit: "kg" },
      { name: "Ovos Brancos Mantiqueira c/30", quantity: 1, totalCost: 18.50, unit: "un" },
      { name: "Arroz Integral Camil 1kg", quantity: 2, totalCost: 15.80, unit: "kg" },
      { name: "Batata Doce kg", quantity: 2.5, totalCost: 12.50, unit: "kg" }
    ];

    // Populate interface tables
    this.renderNFCItemsTable(mockItems);
  },

  renderNFCItemsTable(items) {
    const tableBody = document.getElementById('food-nfc-items-table-body');
    if (!tableBody) return;

    const existingIngredients = store.getIngredients(this.category);

    tableBody.innerHTML = items.map((item, idx) => {
      // Name match check
      let matchedId = "_new";
      let bestScore = 0;
      existingIngredients.forEach(ing => {
        const ingNameLower = ing.name.toLowerCase();
        const itemNameLower = item.name.toLowerCase();
        // Check partial or exact containment
        if (itemNameLower.includes(ingNameLower) || ingNameLower.includes(itemNameLower)) {
          const score = Math.min(ingNameLower.length, itemNameLower.length) / Math.max(ingNameLower.length, itemNameLower.length);
          if (score > bestScore) {
            bestScore = score;
            matchedId = ing.id;
          }
        }
      });

      const options = [
        `<option value="_new" ${matchedId === '_new' ? 'selected' : ''}>+ Cadastrar como Novo: "${item.name}"</option>`
      ];
      existingIngredients.forEach(ing => {
        options.push(`<option value="${ing.id}" ${ing.id === matchedId ? 'selected' : ''}>Mapear para: ${ing.name} (${ing.unit})</option>`);
      });

      const hasMatch = matchedId !== "_new";
      const warningText = hasMatch ? '' : ' <span class="badge badge-warn" style="font-size: 0.65rem; padding: 2px 4px; text-transform:none; vertical-align:middle; margin-left: 5px;">⚠️ Não cadastrado</span>';

      return `
        <tr class="food-nfc-item-row" data-name="${item.name}" data-qty="${item.quantity}" data-cost="${item.totalCost}" data-unit="${item.unit}">
          <td><strong>${item.name}</strong>${warningText}</td>
          <td>${item.quantity} ${item.unit} por R$ ${item.totalCost.toFixed(2)}</td>
          <td>R$ ${(item.totalCost / item.quantity).toFixed(2)} / ${item.unit}</td>
          <td>
            <select class="food-nfc-mapping-select" style="padding: 6px; border-radius: 4px; background: rgba(255,255,255,0.05); color: var(--text-color); border: 1px solid rgba(255,255,255,0.1); width: 100%;">
              ${options.join('')}
            </select>
          </td>
        </tr>
      `;
    }).join('');

    document.getElementById('food-nfc-items-section').style.display = 'block';
    document.getElementById('btn-food-nfc-submit').style.display = 'inline-block';
  },

  startCameraScan() {
    const statusDiv = document.getElementById('food-nfc-scan-status');
    const videoContainer = document.getElementById('food-nfc-video-container');
    const startCameraBtn = document.getElementById('btn-food-nfc-camera-start');
    const stopCameraBtn = document.getElementById('btn-food-nfc-camera-stop');
    const video = document.getElementById('food-nfc-video');

    if (!video || !videoContainer) return;

    this.isScanningCamera = true;
    videoContainer.style.display = 'block';
    if (stopCameraBtn) stopCameraBtn.style.display = 'inline-block';
    if (startCameraBtn) startCameraBtn.style.display = 'none';

    if (statusDiv) {
      statusDiv.style.color = 'var(--text-muted)';
      statusDiv.textContent = "Iniciando câmera...";
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        this.cameraStream = stream;
        video.srcObject = stream;
        video.setAttribute("playsinline", true); // iOS Safari support
        video.play();
        if (statusDiv) {
          statusDiv.style.color = 'var(--accent-cyan)';
          statusDiv.textContent = "Câmera ativa. Aponte para o QR Code da nota fiscal.";
        }
        requestAnimationFrame(() => this.tickCameraScan());
      })
      .catch(err => {
        console.error("Error accessing camera: ", err);
        this.stopCameraScan();
        if (statusDiv) {
          statusDiv.style.color = 'var(--color-danger)';
          statusDiv.textContent = "Erro ao acessar a câmera: " + (err.message || err);
        }
      });
  },

  stopCameraScan() {
    this.isScanningCamera = false;

    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.error("Error stopping track: ", e);
        }
      });
      this.cameraStream = null;
    }

    const video = document.getElementById('food-nfc-video');
    if (video) {
      video.srcObject = null;
    }

    const videoContainer = document.getElementById('food-nfc-video-container');
    if (videoContainer) videoContainer.style.display = 'none';

    const startCameraBtn = document.getElementById('btn-food-nfc-camera-start');
    if (startCameraBtn) startCameraBtn.style.display = 'inline-block';

    const stopCameraBtn = document.getElementById('btn-food-nfc-camera-stop');
    if (stopCameraBtn) stopCameraBtn.style.display = 'none';
  },

  tickCameraScan() {
    if (!this.isScanningCamera || !this.cameraStream) return;

    const video = document.getElementById('food-nfc-video');
    const statusDiv = document.getElementById('food-nfc-scan-status');

    if (!video) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      if (!this.scanCanvas) {
        this.scanCanvas = document.createElement('canvas');
      }
      const canvas = this.scanCanvas;
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        if (typeof jsQR === 'undefined') {
          if (statusDiv) {
            statusDiv.style.color = 'var(--color-danger)';
            statusDiv.textContent = "Biblioteca jsQR não encontrada.";
          }
          this.stopCameraScan();
          return;
        }

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          if (statusDiv) {
            statusDiv.style.color = 'var(--accent-green)';
            statusDiv.textContent = "QR Code decodificado com sucesso!";
          }
          document.getElementById('food-nfc-url').value = code.data;
          this.processNFCeURL(code.data);
          this.stopCameraScan();
          return; // Stop scanning loop
        }
      } catch (err) {
        console.error("Error decoding in tickCameraScan: ", err);
      }
    }

    if (this.isScanningCamera) {
      requestAnimationFrame(() => this.tickCameraScan());
    }
  }
};
