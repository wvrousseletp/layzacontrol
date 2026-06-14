// Mock localStorage for Node.js environment
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = val; },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { for (const k in mockStorage) delete mockStorage[k]; }
};

import { store } from './store.js';

function assert(condition, message) {
  if (!condition) {
    console.error("❌ FAILED:", message);
    process.exit(1);
  }
  console.log("✅ PASSED:", message);
}

console.log("Iniciando testes unitários do Store...");

// Reset Store
store.reset();

// Test 1: Adicionar insumo
const Creatina = store.addIngredient('supplements', { name: 'Creatina', unit: 'g', minStock: 100 });
assert(Creatina.name === 'Creatina', "Nome do insumo está correto");
assert(Creatina.unit === 'g', "Unidade do insumo está correta");
assert(Creatina.currentStock === 0, "Estoque inicial é zero");

// Test 2: Registrar compra
const purchase1 = store.recordPurchase('supplements', {
  ingredientId: Creatina.id,
  quantity: 500,
  totalCost: 100, // 0.20 por g
  date: '2026-06-14',
  notes: 'Primeira compra de Creatina'
});
const updatedCreatina = store.getIngredients('supplements').find(i => i.id === Creatina.id);
assert(updatedCreatina.currentStock === 500, "Estoque de Creatina aumentou para 500g");
assert(updatedCreatina.averageCost === 0.2, "Custo médio da Creatina é 0.20 por grama");
assert(store.getTransactions('supplements').length === 1, "Transação de compra foi registrada");

// Test 3: Segunda compra com preço diferente (atualização de custo médio)
const purchase2 = store.recordPurchase('supplements', {
  ingredientId: Creatina.id,
  quantity: 500,
  totalCost: 150, // 0.30 por g
  date: '2026-06-14'
});
const updatedCreatina2 = store.getIngredients('supplements').find(i => i.id === Creatina.id);
assert(updatedCreatina2.currentStock === 1000, "Estoque de Creatina aumentou para 1000g");
// Custo total: 100 + 150 = 250. Qtd total: 500 + 500 = 1000. Custo médio: 0.25 por grama
assert(updatedCreatina2.averageCost === 0.25, "Custo médio recalculado corretamente para 0.25");

// Test 4: Cadastrar receita
const BetaAlanina = store.addIngredient('supplements', { name: 'Beta-Alanina', unit: 'g', minStock: 50 });
store.recordPurchase('supplements', {
  ingredientId: BetaAlanina.id,
  quantity: 200,
  totalCost: 80, // 0.40 por g
  date: '2026-06-14'
});

const preTreinoRecipe = store.addRecipe('supplements', {
  name: 'Pré-Treino Focus',
  unit: 'dose',
  ingredients: [
    { ingredientId: Creatina.id, quantity: 5 }, // 5g Creatina * 0.25 = 1.25
    { ingredientId: BetaAlanina.id, quantity: 2 } // 2g Beta-Alanina * 0.40 = 0.80
  ] // Total cost per dose: 2.05
});
assert(preTreinoRecipe.name === 'Pré-Treino Focus', "Receita criada com sucesso");
assert(store.getProducts('supplements').length === 1, "Produto pronto associado à receita foi criado");

// Test 5: Fabricação (Produção)
const prodTx = store.recordProduction('supplements', {
  recipeId: preTreinoRecipe.id,
  yieldQuantity: 10, // Fabricar 10 doses
  date: '2026-06-14'
});

const finalCreatina = store.getIngredients('supplements').find(i => i.id === Creatina.id);
const finalBeta = store.getIngredients('supplements').find(i => i.id === BetaAlanina.id);
assert(finalCreatina.currentStock === 950, "Deduziu Creatina do estoque (1000 - 50 = 950)");
assert(finalBeta.currentStock === 180, "Deduziu Beta-Alanina do estoque (200 - 20 = 180)");

const preTreinoProduct = store.getProducts('supplements').find(p => p.recipeId === preTreinoRecipe.id);
assert(preTreinoProduct.currentStock === 10, "Estoque do produto pronto aumentou para 10 doses");
assert(preTreinoProduct.averageCost === 2.05, "Custo médio de fabricação do produto pronto calculado corretamente (2.05 por dose)");
assert(prodTx.totalCost === 20.5, "Custo total da transação de produção está correto (20.5)");

// Test 6: Uso (Consumo)
const useTx = store.recordUsage('supplements', {
  itemId: preTreinoProduct.id,
  itemType: 'product',
  quantity: 2,
  date: '2026-06-14'
});
const productAfterUsage = store.getProducts('supplements').find(p => p.id === preTreinoProduct.id);
assert(productAfterUsage.currentStock === 8, "Estoque de Pré-Treino reduziu para 8 doses");
assert(useTx.totalCost === 4.10, "Custo de uso registrado corretamente (4.10)");

// Test 7: Reversão (Deletar transação de uso)
store.deleteTransaction(useTx.id);
const productAfterRevert = store.getProducts('supplements').find(p => p.id === preTreinoProduct.id);
assert(productAfterRevert.currentStock === 10, "Estoque do produto pronto voltou para 10 doses após desfazer uso");

// Test 8: Reversão de Produção (deve devolver insumos e zerar estoque do produto pronto)
store.deleteTransaction(prodTx.id);
const creatinaAfterRevertProd = store.getIngredients('supplements').find(i => i.id === Creatina.id);
const betaAfterRevertProd = store.getIngredients('supplements').find(i => i.id === BetaAlanina.id);
const productAfterRevertProd = store.getProducts('supplements').find(p => p.id === preTreinoProduct.id);

assert(creatinaAfterRevertProd.currentStock === 1000, "Estoque de Creatina foi devolvido com sucesso (1000g)");
assert(betaAfterRevertProd.currentStock === 200, "Estoque de Beta-Alanina foi devolvido com sucesso (200g)");
assert(productAfterRevertProd.currentStock === 0, "Estoque do produto pronto voltou a ser zero");

// Test 9: Alertas de estoque
const alerts = store.getLowStockItems('supplements');
// Creatina minStock = 100, currentStock = 1000 -> sem alerta
// Beta minStock = 50, currentStock = 200 -> sem alerta
// Mas o produto pronto Pré-Treino Focus tem minStock = 0 e currentStock = 0 -> alerta de estoque (current <= min -> 0 <= 0 -> true!)
assert(alerts.some(a => a.name === 'Pré-Treino Focus'), "Alerta de estoque baixo ativado para o produto com estoque zero");

console.log("\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!");
