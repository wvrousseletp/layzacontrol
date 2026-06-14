import { store } from '../store.js';

export const peopleView = {
  selectedPersonId: null,

  init() {
    this.registerEventListeners();
    this.render();

    window.addEventListener('storeUpdated', () => {
      if (document.getElementById('view-people').classList.contains('active')) {
        this.render();
      }
    });
  },

  registerEventListeners() {
    // Add Person Form
    const form = document.getElementById('people-add-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('people-new-name');
        const name = nameInput.value;

        try {
          store.addPerson(name);
          nameInput.value = '';
          window.dispatchEvent(new Event('storeUpdated'));
        } catch (err) {
          alert("Erro: " + err.message);
        }
      });
    }
  },

  render() {
    const tableBody = document.getElementById('people-table-body');
    if (!tableBody) return;

    const people = store.getPeople();

    if (people.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="2" style="text-align: center; color: var(--text-muted); padding: 16px;">
            Nenhum destinatário cadastrado.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = people.map(p => {
      const deleteBtn = p.id === 'self' 
        ? '' 
        : `<button class="btn btn-danger btn-sm delete-person-btn" data-id="${p.id}">Excluir</button>`;
      
      const activeStyle = this.selectedPersonId === p.id 
        ? 'background: rgba(0, 240, 255, 0.05); font-weight: 600; color: var(--accent-cyan);' 
        : '';

      return `
        <tr style="${activeStyle}">
          <td style="cursor: pointer;" class="view-person-hist-click" data-id="${p.id}">
            <strong>${p.name}</strong>
          </td>
          <td style="text-align: right;">
            <button class="btn btn-primary btn-sm view-person-hist-btn" data-id="${p.id}">Ver Histórico</button>
            ${deleteBtn}
          </td>
        </tr>
      `;
    }).join('');

    // Bind clicks to view history
    tableBody.querySelectorAll('.view-person-hist-click, .view-person-hist-btn').forEach(el => {
      el.addEventListener('click', (e) => {
        // Find nearest clickable target to get the ID
        const target = e.currentTarget;
        const id = target.getAttribute('data-id');
        this.selectedPersonId = id;
        this.render(); // Re-render list to show active state
        this.renderIndividualHistory(id);
      });
    });

    // Bind delete buttons
    tableBody.querySelectorAll('.delete-person-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent loading history
        const id = e.target.getAttribute('data-id');
        const personName = people.find(p => p.id === id)?.name;
        if (confirm(`Deseja realmente excluir o destinatário "${personName}"?`)) {
          try {
            store.deletePerson(id);
            if (this.selectedPersonId === id) {
              this.selectedPersonId = null;
              this.clearHistoryPanel();
            }
            window.dispatchEvent(new Event('storeUpdated'));
          } catch (err) {
            alert("Erro: " + err.message);
          }
        }
      });
    });

    // Keep history panel updated if a person is currently selected
    if (this.selectedPersonId) {
      // Check if selected person still exists
      if (people.some(p => p.id === this.selectedPersonId)) {
        this.renderIndividualHistory(this.selectedPersonId);
      } else {
        this.selectedPersonId = null;
        this.clearHistoryPanel();
      }
    }
  },

  renderIndividualHistory(personId) {
    const people = store.getPeople();
    const person = people.find(p => p.id === personId);
    if (!person) return;

    // Update Title
    const title = document.getElementById('people-history-title');
    title.innerText = `Histórico de Envios: ${person.name}`;

    // Hide placeholder, show table container
    document.getElementById('people-history-placeholder').style.display = 'none';
    document.getElementById('people-history-table-container').style.display = 'block';

    const tableBody = document.getElementById('people-history-table-body');
    if (!tableBody) return;

    // Get all usage transactions for this person
    const txs = store.getTransactions().filter(t => t.type === 'usage' && t.recipientId === personId);

    if (txs.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px;">
            Nenhum envio registrado para esta pessoa.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = txs.map(t => {
      const formattedDate = t.date.split('-').reverse().join('/');
      const categoryName = t.category === 'supplements' ? 'Suplemento' : 'Alimento';
      const badgeClass = t.category === 'supplements' ? 'badge-production' : 'badge-purchase';

      return `
        <tr>
          <td>${formattedDate}</td>
          <td><span class="badge ${badgeClass}">${categoryName}</span></td>
          <td><strong>${t.itemName}</strong></td>
          <td>${t.quantity} ${t.unit}</td>
        </tr>
      `;
    }).join('');
  },

  clearHistoryPanel() {
    document.getElementById('people-history-title').innerText = 'Histórico de Envios';
    document.getElementById('people-history-placeholder').style.display = 'block';
    document.getElementById('people-history-table-container').style.display = 'none';
  }
};
