import { HabitosService } from '../servicos/habitos_service.js';
import { AuthService } from '../servicos/auth_service.js';

/**
 * Controlador da Camada Pública de Hábitos (Camuflagem)
 */
export class HabitosController {
  static init() {
    this.renderHeaderDate();
    this.renderHabits();
    this.setupEvents();
  }

  static renderHeaderDate() {
    const el = document.getElementById('habitos-date-display');
    if (el) {
      const options = { weekday: 'long', day: 'numeric', month: 'long' };
      el.textContent = new Date().toLocaleDateString('pt-BR', options);
    }
  }

  static renderHabits() {
    const listEl = document.getElementById('habits-list-container');
    const progressFill = document.getElementById('progress-bar-fill');
    const progressText = document.getElementById('progress-count-text');
    if (!listEl) return;

    const habits = HabitosService.getHabits();
    const completed = habits.filter((h) => h.isCompletedToday).length;
    const total = habits.length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${completed} / ${total}`;

    listEl.innerHTML = '';

    if (habits.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; color: var(--habit-muted); padding: 30px;">
          Nenhum hábito cadastrado ainda.
        </div>`;
      return;
    }

    habits.forEach((habit) => {
      const item = document.createElement('div');
      item.className = `habit-item tap-active ${habit.isCompletedToday ? 'completed' : ''}`;
      item.innerHTML = `
        <div class="habit-checkbox" data-id="${habit.id}">
          ${habit.isCompletedToday ? '✓' : ''}
        </div>
        <div class="habit-info">
          <div class="habit-title">${this.escapeHtml(habit.title)}</div>
          <div class="habit-meta">
            <span class="habit-category-badge">${this.escapeHtml(habit.category)}</span>
            <span class="habit-streak">🔥 ${habit.streakDays} dias</span>
          </div>
        </div>
        <div class="habit-actions" data-delete="${habit.id}">🗑️</div>
      `;

      item.querySelector('.habit-checkbox').onclick = () => {
        HabitosService.toggleHabit(habit.id);
        this.renderHabits();
      };

      item.querySelector('.habit-actions').onclick = (e) => {
        e.stopPropagation();
        if (confirm('Deseja excluir este hábito?')) {
          HabitosService.deleteHabit(habit.id);
          this.renderHabits();
        }
      };

      listEl.appendChild(item);
    });
  }

  static setupEvents() {
    // Gatilho Secreto 1: Toque longo (800ms) no título
    const titleEl = document.getElementById('secret-trigger-title');
    let pressTimer = null;

    if (titleEl) {
      const startPress = () => {
        pressTimer = setTimeout(() => {
          this.triggerSecretVault();
        }, 700);
      };
      const cancelPress = () => clearTimeout(pressTimer);

      titleEl.addEventListener('mousedown', startPress);
      titleEl.addEventListener('mouseup', cancelPress);
      titleEl.addEventListener('touchstart', startPress, { passive: true });
      titleEl.addEventListener('touchend', cancelPress);
    }

    // Gatilho Secreto 2: Duplo clique no botão de status superior
    const btnSecret = document.getElementById('secret-trigger-btn');
    if (btnSecret) {
      btnSecret.addEventListener('dblclick', () => this.triggerSecretVault());
    }

    // Botão Adicionar Hábito
    const btnAdd = document.getElementById('btn-add-habit');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => this.showAddHabitPrompt());
    }
  }

  static showAddHabitPrompt() {
    const title = prompt('Digite o nome do novo hábito:');
    if (title && title.trim()) {
      HabitosService.addHabit(title.trim());
      this.renderHabits();
    }
  }

  static triggerSecretVault() {
    // Vibração háptica suave se suportada no celular
    if (navigator.vibrate) navigator.vibrate(50);

    const isSetup = AuthService.isConfigured();
    window.location.hash = isSetup ? '#auth' : '#setup';
  }

  static escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
