// Store logic for Supplements and Foods tracking
const LOCAL_STORAGE_KEY = 'suplementos_alimentos_v1';

// Helper to generate unique IDs
function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Initial state structure
function getInitialState() {
  return {
    supplements: {
      ingredients: [], // Raw materials (insumos)
      recipes: [],     // Formulas/recipes
      products: []     // Finished products
    },
    foods: {
      ingredients: [], // Raw food items
      recipes: [],     // Prepared recipes (e.g. marmitas)
      products: []     // Finished foods/prepared meals
    },
    people: [
      { id: 'self', name: 'Consumo Próprio' }
    ],
    transactions: [] // Financial & inventory logs
  };
}

class StorageManager {
  constructor() {
    this.state = this.load();
  }

  // Load from localStorage
  load() {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          // Ensure all properties exist in case of schema updates
          const fresh = getInitialState();
          return {
            supplements: { ...fresh.supplements, ...parsed.supplements },
            foods: { ...fresh.foods, ...parsed.foods },
            people: parsed.people || fresh.people,
            transactions: parsed.transactions || []
          };
        }
      }
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
    }
    return getInitialState();
  }

  // Save to localStorage
  save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  }

  // Reset store
  reset() {
    this.state = getInitialState();
    this.save();
  }

  // Generic helpers to get data
  getIngredients(category) {
    return this.state[category].ingredients;
  }

  getRecipes(category) {
    return this.state[category].recipes;
  }

  getProducts(category) {
    return this.state[category].products;
  }

  getTransactions(category = null) {
    if (!category) return this.state.transactions;
    return this.state.transactions.filter(t => t.category === category);
  }

  // CRUD for People
  getPeople() {
    return this.state.people || [];
  }

  addPerson(name) {
    if (!name || !name.trim()) throw new Error("O nome do destinatário é obrigatório.");
    const trimmed = name.trim();
    if (this.state.people.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error("Já existe um destinatário com este nome.");
    }
    const person = {
      id: generateId(),
      name: trimmed
    };
    this.state.people.push(person);
    this.save();
    return person;
  }

  deletePerson(id) {
    if (id === 'self') {
      throw new Error("Não é possível excluir o destinatário padrão 'Consumo Próprio'.");
    }
    const index = this.state.people.findIndex(p => p.id === id);
    if (index !== -1) {
      // Check if they have transaction history
      const hasHistory = this.state.transactions.some(t => t.recipientId === id);
      if (hasHistory) {
        throw new Error("Não é possível excluir: Este destinatário possui histórico de envios registrado.");
      }
      this.state.people.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  // CRUD for Ingredients
  addIngredient(category, { name, unit, minStock = 0 }) {
    const ingredient = {
      id: generateId(),
      name: name.trim(),
      unit: unit.trim(),
      currentStock: 0,
      minStock: parseFloat(minStock) || 0,
      averageCost: 0,
      totalSpent: 0,
      totalQtyBought: 0
    };
    this.state[category].ingredients.push(ingredient);
    this.save();
    return ingredient;
  }

  updateIngredient(category, id, updates) {
    const list = this.state[category].ingredients;
    const index = list.findIndex(item => item.id === id);
    if (index !== -1) {
      const currentStock = updates.currentStock !== undefined ? parseFloat(updates.currentStock) || 0 : list[index].currentStock;
      const averageCost = updates.averageCost !== undefined ? parseFloat(updates.averageCost) || 0 : list[index].averageCost;

      list[index] = { 
        ...list[index], 
        name: updates.name ? updates.name.trim() : list[index].name,
        unit: updates.unit ? updates.unit.trim() : list[index].unit,
        minStock: updates.minStock !== undefined ? parseFloat(updates.minStock) || 0 : list[index].minStock,
        currentStock: currentStock,
        averageCost: averageCost,
        totalQtyBought: currentStock,
        totalSpent: currentStock * averageCost
      };
      this.save();
      return list[index];
    }
    return null;
  }

  deleteIngredient(category, id) {
    const list = this.state[category].ingredients;
    const index = list.findIndex(item => item.id === id);
    if (index !== -1) {
      // Check if ingredient is used in recipes
      const isUsed = this.state[category].recipes.some(recipe => 
        recipe.ingredients.some(ing => ing.ingredientId === id)
      );
      if (isUsed) {
        throw new Error("Não é possível excluir: Este insumo é utilizado em uma ou mais receitas cadastradas.");
      }
      list.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  // CRUD for Recipes
  addRecipe(category, { name, unit, ingredients }) {
    // ingredients should be array of { ingredientId, quantity }
    const recipe = {
      id: generateId(),
      name: name.trim(),
      unit: unit.trim(), // Unit of the produced material (e.g. porção, pote, dose)
      ingredients: ingredients.map(i => ({
        ingredientId: i.ingredientId,
        quantity: parseFloat(i.quantity) || 0
      }))
    };
    
    this.state[category].recipes.push(recipe);
    
    // Check if matching product exists, if not, create it
    const products = this.state[category].products;
    const hasProduct = products.some(p => p.recipeId === recipe.id);
    if (!hasProduct) {
      products.push({
        id: generateId(),
        name: recipe.name,
        recipeId: recipe.id,
        unit: recipe.unit,
        currentStock: 0,
        minStock: 0,
        averageCost: 0
      });
    }

    this.save();
    return recipe;
  }

  deleteRecipe(category, id) {
    const recipes = this.state[category].recipes;
    const index = recipes.findIndex(r => r.id === id);
    if (index !== -1) {
      // Delete associated product if stock is zero
      const products = this.state[category].products;
      const prodIndex = products.findIndex(p => p.recipeId === id);
      if (prodIndex !== -1) {
        if (products[prodIndex].currentStock > 0) {
          throw new Error("Não é possível excluir esta receita pois ainda há estoque do produto pronto fabricado.");
        }
        products.splice(prodIndex, 1);
      }
      recipes.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  // Update minStock of products
  updateProductMinStock(category, id, minStock) {
    const products = this.state[category].products;
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index].minStock = parseFloat(minStock) || 0;
      this.save();
      return products[index];
    }
    return null;
  }

  // TRANSACTIONS
  
  // 1. Purchase (Comprar Insumo)
  recordPurchase(category, { ingredientId, quantity, totalCost, date, notes = '' }) {
    const list = this.state[category].ingredients;
    const ing = list.find(item => item.id === ingredientId);
    if (!ing) throw new Error("Insumo não encontrado.");

    const qty = parseFloat(quantity);
    const cost = parseFloat(totalCost);
    if (qty <= 0 || cost < 0) throw new Error("Quantidade e custo devem ser valores positivos.");

    const unitPrice = cost / qty;

    // Update stock and average cost
    ing.currentStock += qty;
    ing.totalSpent += cost;
    ing.totalQtyBought += qty;
    ing.averageCost = ing.totalSpent / ing.totalQtyBought;

    // Create transaction log
    const transaction = {
      id: generateId(),
      type: 'purchase',
      category,
      date: date || new Date().toISOString().split('T')[0],
      itemId: ingredientId,
      itemName: ing.name,
      itemType: 'ingredient',
      quantity: qty,
      unit: ing.unit,
      unitPrice,
      totalCost: cost,
      notes: notes.trim()
    };

    this.state.transactions.unshift(transaction); // Add to beginning (newest first)
    this.save();
    return transaction;
  }

  // 2. Production (Fabricar material pronto com base em receita)
  recordProduction(category, { recipeId, yieldQuantity, date, notes = '' }) {
    const recipes = this.state[category].recipes;
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) throw new Error("Receita não encontrada.");

    const yieldQty = parseFloat(yieldQuantity);
    if (yieldQty <= 0) throw new Error("A quantidade produzida deve ser maior que zero.");

    // Validate ingredient stocks
    const ingredients = this.state[category].ingredients;
    const missing = [];
    const usageList = [];

    recipe.ingredients.forEach(req => {
      const ing = ingredients.find(i => i.id === req.ingredientId);
      if (!ing) {
        missing.push(`Insumo ID ${req.ingredientId} não encontrado.`);
        return;
      }
      
      // Total ingredient needed = quantity per batch * yieldQuantity (or does recipe define total yield? Let's assume recipe definition is per 1 unit of product)
      const totalNeeded = req.quantity * yieldQty;
      if (ing.currentStock < totalNeeded) {
        missing.push(`${ing.name} (Necessário: ${totalNeeded.toFixed(1)}${ing.unit}, Disponível: ${ing.currentStock.toFixed(1)}${ing.unit})`);
      }

      usageList.push({
        ing,
        totalNeeded,
        costContrib: totalNeeded * ing.averageCost
      });
    });

    if (missing.length > 0) {
      throw new Error("Estoque insuficiente para os seguintes insumos:\n" + missing.join("\n"));
    }

    // Deduct ingredients from stock
    let totalCostOfProduction = 0;
    usageList.forEach(({ ing, totalNeeded, costContrib }) => {
      ing.currentStock -= totalNeeded;
      totalCostOfProduction += costContrib;
    });

    const computedUnitPrice = yieldQty > 0 ? totalCostOfProduction / yieldQty : 0;

    // Update product stock and average cost
    const products = this.state[category].products;
    let product = products.find(p => p.recipeId === recipeId);
    if (!product) {
      // Fallback in case product got deleted or didn't initialize
      product = {
        id: generateId(),
        name: recipe.name,
        recipeId: recipeId,
        unit: recipe.unit,
        currentStock: 0,
        minStock: 0,
        averageCost: 0
      };
      products.push(product);
    }

    const currentTotalCost = product.currentStock * product.averageCost;
    const newTotalCost = currentTotalCost + totalCostOfProduction;
    product.currentStock += yieldQty;
    product.averageCost = product.currentStock > 0 ? newTotalCost / product.currentStock : 0;

    // Log the Production transaction
    const transaction = {
      id: generateId(),
      type: 'production',
      category,
      date: date || new Date().toISOString().split('T')[0],
      itemId: product.id,
      itemName: product.name,
      itemType: 'product',
      quantity: yieldQty,
      unit: product.unit,
      unitPrice: computedUnitPrice,
      totalCost: totalCostOfProduction,
      notes: notes.trim() || `Produzido usando a fórmula: ${recipe.name}`
    };

    this.state.transactions.unshift(transaction);
    this.save();
    return transaction;
  }

  // 3. Usage (Registrar consumo ou envio de insumo ou produto pronto)
  recordUsage(category, { itemId, itemType, quantity, date, notes = '', recipientId = '' }) {
    // itemType can be 'ingredient' or 'product'
    const qty = parseFloat(quantity);
    if (qty <= 0) throw new Error("A quantidade consumida deve ser maior que zero.");

    let item;
    if (itemType === 'ingredient') {
      item = this.state[category].ingredients.find(i => i.id === itemId);
    } else {
      item = this.state[category].products.find(p => p.id === itemId);
    }

    if (!item) throw new Error("Item não encontrado.");
    if (item.currentStock < qty) {
      throw new Error(`Estoque insuficiente. Disponível: ${item.currentStock.toFixed(1)}${item.unit}`);
    }

    // Deduct stock
    item.currentStock -= qty;
    const costOfUsage = qty * item.averageCost;

    // Resolve recipient name
    const person = this.state.people.find(p => p.id === recipientId);
    const recipientName = person ? person.name : 'Desconhecido';

    // Log the Usage transaction
    const transaction = {
      id: generateId(),
      type: 'usage',
      category,
      date: date || new Date().toISOString().split('T')[0],
      itemId: item.id,
      itemName: item.name,
      itemType,
      quantity: qty,
      unit: item.unit,
      unitPrice: item.averageCost,
      totalCost: costOfUsage,
      recipientId,
      recipientName,
      notes: notes.trim()
    };

    this.state.transactions.unshift(transaction);
    this.save();
    return transaction;
  }

  // Remove a transaction and revert its effect (useful for correcting mistakes)
  deleteTransaction(id) {
    const index = this.state.transactions.findIndex(t => t.id === id);
    if (index === -1) throw new Error("Transação não encontrada.");

    const transaction = this.state.transactions[index];
    const { type, category, itemId, itemType, quantity, totalCost } = transaction;

    if (type === 'purchase') {
      // Purchase of ingredient: decrease ingredient stock, revert spent/qty
      const ing = this.state[category].ingredients.find(i => i.id === itemId);
      if (ing) {
        if (ing.currentStock < quantity) {
          throw new Error("Não é possível reverter esta compra: O estoque atual do insumo é menor que a quantidade comprada.");
        }
        ing.currentStock -= quantity;
        ing.totalSpent = Math.max(0, ing.totalSpent - totalCost);
        ing.totalQtyBought = Math.max(0, ing.totalQtyBought - quantity);
        ing.averageCost = ing.totalQtyBought > 0 ? ing.totalSpent / ing.totalQtyBought : 0;
      }
    } else if (type === 'usage') {
      // Usage of ingredient or product: add back stock
      let item;
      if (itemType === 'ingredient') {
        item = this.state[category].ingredients.find(i => i.id === itemId);
      } else {
        item = this.state[category].products.find(p => p.id === itemId);
      }
      if (item) {
        item.currentStock += quantity;
      }
    } else if (type === 'production') {
      // Production: revert finished product stock (decrease) AND add back ingredient stocks
      const prod = this.state[category].products.find(p => p.id === itemId);
      if (prod) {
        if (prod.currentStock < quantity) {
          throw new Error("Não é possível reverter esta produção: O estoque atual do produto pronto é menor que a quantidade produzida.");
        }
        
        // Find recipe to add back ingredients
        const recipe = this.state[category].recipes.find(r => r.id === prod.recipeId);
        if (recipe) {
          recipe.ingredients.forEach(req => {
            const ing = this.state[category].ingredients.find(i => i.id === req.ingredientId);
            if (ing) {
              ing.currentStock += (req.quantity * quantity);
            }
          });
        }

        // Revert product stock and average cost
        const originalCost = prod.currentStock * prod.averageCost;
        const revertedCost = Math.max(0, originalCost - totalCost);
        prod.currentStock -= quantity;
        prod.averageCost = prod.currentStock > 0 ? revertedCost / prod.currentStock : 0;
      }
    }

    this.state.transactions.splice(index, 1);
    this.save();
    return true;
  }

  // FINANCIAL SUMMARIES
  getFinancialSummary(category = null) {
    const txs = this.getTransactions(category);
    
    let totalPurchases = 0;
    let totalProductionCost = 0;
    let totalUsageCost = 0;

    txs.forEach(t => {
      if (t.type === 'purchase') {
        totalPurchases += t.totalCost;
      } else if (t.type === 'production') {
        totalProductionCost += t.totalCost;
      } else if (t.type === 'usage') {
        totalUsageCost += t.totalCost;
      }
    });

    // Current inventory value (cost basis)
    let rawInventoryValue = 0;
    let finishedInventoryValue = 0;

    const cats = category ? [category] : ['supplements', 'foods'];
    cats.forEach(c => {
      this.state[c].ingredients.forEach(i => {
        rawInventoryValue += i.currentStock * i.averageCost;
      });
      this.state[c].products.forEach(p => {
        finishedInventoryValue += p.currentStock * p.averageCost;
      });
    });

    return {
      totalPurchases,
      totalProductionCost,
      totalUsageCost,
      rawInventoryValue,
      finishedInventoryValue,
      totalInventoryValue: rawInventoryValue + finishedInventoryValue
    };
  }

  // Stock alerts
  getLowStockItems(category = null) {
    const alerts = [];
    const cats = category ? [category] : ['supplements', 'foods'];
    
    cats.forEach(c => {
      this.state[c].ingredients.forEach(i => {
        if (i.currentStock <= i.minStock) {
          alerts.push({
            id: i.id,
            name: i.name,
            type: 'Insumo',
            category: c === 'supplements' ? 'Suplemento' : 'Alimento',
            current: i.currentStock,
            min: i.minStock,
            unit: i.unit
          });
        }
      });
      this.state[c].products.forEach(p => {
        if (p.currentStock <= p.minStock) {
          alerts.push({
            id: p.id,
            name: p.name,
            type: 'Pronto',
            category: c === 'supplements' ? 'Suplemento' : 'Alimento',
            current: p.currentStock,
            min: p.minStock,
            unit: p.unit
          });
        }
      });
    });
    return alerts;
  }
}

export const store = new StorageManager();
