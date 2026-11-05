import { IdbStorage } from '../servicos/idb_storage.js';
import { SessionManager } from '../servicos/session_manager.js';
import { NotaModel } from '../modelos/nota_model.js';

/**
 * Aplicativo Bloco de Notas e Senhas Secretas em Janela DeX
 */
export class NotesApp {
  static getConfig() {
    return {
      id: 'app-notes',
      title: 'Bloco de Notas & Senhas',
      icon: '📝',
      width: 540,
      height: 420,
      contentHtml: `
        <div class="notes-win-container">
          <div class="notes-sidebar">
            <div class="notes-sidebar-header">
              <span class="notes-sidebar-title">Anotações</span>
              <button class="tool-btn btn-new-note" title="Nova Nota">✏️+</button>
            </div>
            <div class="notes-items-list" id="notes-items-list">
              <div class="loading-state">Carregando notas...</div>
            </div>
          </div>
          <div class="notes-editor-pane">
            <input type="text" class="note-edit-title" id="note-edit-title" placeholder="Título da anotação...">
            <textarea class="note-edit-body" id="note-edit-body" placeholder="Digite suas notas, credenciais ou textos seguros..."></textarea>
            <div class="notes-bottom-bar">
              <span class="note-status-info" id="note-status-info">Pronto</span>
              <button class="tool-btn btn-save-note">Salvar 💾</button>
            </div>
          </div>
        </div>
      `,
      onInit: (winEl) => {
        this.setupWindow(winEl);
      }
    };
  }

  static async setupWindow(winEl) {
    const listEl = winEl.querySelector('#notes-items-list');
    const titleInput = winEl.querySelector('#note-edit-title');
    const bodyInput = winEl.querySelector('#note-edit-body');
    const statusInfo = winEl.querySelector('#note-status-info');
    const btnNew = winEl.querySelector('.btn-new-note');
    const btnSave = winEl.querySelector('.btn-save-note');

    let currentNote = null;

    const loadNotes = async () => {
      const isPanic = SessionManager.isPanicMode();
      const notes = await IdbStorage.getAllNotes(isPanic);
      listEl.innerHTML = '';

      if (notes.length === 0) {
        listEl.innerHTML = `<div class="empty-folder-state">Nenhuma nota cadastrada.</div>`;
        return;
      }

      notes.forEach((note) => {
        const item = document.createElement('div');
        item.className = `note-sidebar-item tap-active ${currentNote && currentNote.id === note.id ? 'active' : ''}`;
        item.innerHTML = `
          <div class="note-side-title">${note.title || 'Sem título'}</div>
          <div class="note-side-date">${new Date(note.updatedAt).toLocaleDateString('pt-BR')}</div>
        `;
        item.onclick = () => selectNote(note);
        listEl.appendChild(item);
      });
    };

    const selectNote = (note) => {
      currentNote = note;
      titleInput.value = note.title;
      bodyInput.value = note.content;
      statusInfo.textContent = 'Editando nota';
      winEl.querySelectorAll('.note-sidebar-item').forEach((i) => i.classList.remove('active'));
    };

    const newNote = () => {
      currentNote = null;
      titleInput.value = '';
      bodyInput.value = '';
      titleInput.focus();
      statusInfo.textContent = 'Nova nota em rascunho';
    };

    const saveNote = async () => {
      const title = titleInput.value.trim() || 'Sem título';
      const content = bodyInput.value.trim();

      const isPanic = SessionManager.isPanicMode();
      const note = currentNote || new NotaModel({ isPanicItem: isPanic });
      note.title = title;
      note.content = content;
      note.updatedAt = new Date().toISOString();

      await IdbStorage.saveNote(note);
      currentNote = note;
      statusInfo.textContent = 'Salvo com sucesso!';
      await loadNotes();
    };

    btnNew.onclick = newNote;
    btnSave.onclick = saveNote;

    await loadNotes();
  }
}
