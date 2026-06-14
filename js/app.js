import { store } from './store.js';
import { dashboardView } from './views/dashboardView.js';
import { supplementsView } from './views/supplementsView.js';
import { foodsView } from './views/foodsView.js';
import { historyView } from './views/historyView.js';
import { peopleView } from './views/peopleView.js';

// Application Coordinator
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // 1. Initialize view modules
  dashboardView.init();
  supplementsView.init();
  foodsView.init();
  historyView.init();
  peopleView.init();

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
      if (targetId === 'view-dashboard') {
        dashboardView.render();
      } else if (targetId === 'view-supplements') {
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

  // 4. Initial Render
  dashboardView.render();
}
