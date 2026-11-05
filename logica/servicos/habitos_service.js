import { HabitoModel } from '../modelos/habito_model.js';

/**
 * Serviço de Gerenciamento de Hábitos Diários
 */
export class HabitosService {
  static STORAGE_KEY = 'user_habits_v1';

  static getHabits() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) {
      const defaultHabits = this.getDefaultHabits();
      this.saveHabits(defaultHabits);
      return defaultHabits;
    }

    try {
      const list = JSON.parse(data);
      const todayStr = new Date().toISOString().slice(0, 10);
      return list.map((item) => {
        const habit = HabitoModel.fromJSON(item);
        habit.isCompletedToday = habit.lastCompletedDate === todayStr;
        return habit;
      });
    } catch (_) {
      return this.getDefaultHabits();
    }
  }

  static saveHabits(habits) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(habits));
  }

  static toggleHabit(id) {
    const habits = this.getHabits();
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const updated = habits.map((h) => {
      if (h.id !== id) return h;

      if (h.isCompletedToday) {
        h.isCompletedToday = false;
        h.streakDays = h.streakDays > 0 ? h.streakDays - 1 : 0;
        h.lastCompletedDate = '';
      } else {
        h.isCompletedToday = true;
        if (h.lastCompletedDate === yesterday) {
          h.streakDays += 1;
        } else if (h.lastCompletedDate !== todayStr) {
          h.streakDays = 1;
        }
        h.lastCompletedDate = todayStr;
      }
      return h;
    });

    this.saveHabits(updated);
    return updated;
  }

  static addHabit(title, category = 'Geral') {
    const habits = this.getHabits();
    const newHabit = new HabitoModel({ title, category });
    habits.unshift(newHabit);
    this.saveHabits(habits);
    return newHabit;
  }

  static deleteHabit(id) {
    const habits = this.getHabits().filter((h) => h.id !== id);
    this.saveHabits(habits);
    return habits;
  }

  static getDefaultHabits() {
    return [
      new HabitoModel({ title: 'Beber 2 litros de água', category: 'Saúde' }),
      new HabitoModel({ title: 'Leitura de desenvolvimento (20 min)', category: 'Mente' }),
      new HabitoModel({ title: 'Exercício físico e mobilidade', category: 'Treino' }),
      new HabitoModel({ title: 'Organizar sistema e prioridades', category: 'Foco' })
    ];
  }
}
