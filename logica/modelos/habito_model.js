/**
 * Modelo de dados para um Hábito Diário
 */
export class HabitoModel {
  constructor({
    id = crypto.randomUUID(),
    title,
    category = 'Geral',
    streakDays = 0,
    isCompletedToday = false,
    createdAt = new Date().toISOString(),
    lastCompletedDate = ''
  }) {
    this.id = id;
    this.title = title;
    this.category = category;
    this.streakDays = streakDays;
    this.isCompletedToday = isCompletedToday;
    this.createdAt = createdAt;
    this.lastCompletedDate = lastCompletedDate;
  }

  static fromJSON(json) {
    return new HabitoModel(json);
  }
}
