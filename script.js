let currentTab = 'dashboard';
let currentScope = 'all';

// Estado local seguro
let finances = loadFromStorage('planner_finances');
let tasks = loadFromStorage('planner_tasks');
let goals = loadFromStorage('planner_goals');
let reminders = loadFromStorage('planner_reminders');
let habits = loadFromStorage('planner_habits');
let projects = loadFromStorage('planner_projects');
let recurring = loadFromStorage('planner_recurring');
let notes = loadFromStorage('planner_notes');

let chartInstance = null;
let currentCalDate = new Date();

function loadFromStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Erro ao carregar chave ${key}:`, e);
    return [];
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupScopeSelector();
  setupForms();
  setupBackup();
  setupTheme();
  setupCalendarControls();
  renderAll();
});

// Navegação
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      
      const activeTabEl = document.getElementById(`tab-${currentTab}`);
      if (activeTabEl) activeTabEl.classList.add('active');

      const titles = {
        dashboard: 'Visão Geral',
        finances: 'Finanças & Gastos',
        recurring: 'Contas Recorrentes & Assinaturas',
        tasks: 'Quadro de Tarefas (Kanban)',
        projects: 'Gestão de Projetos',
        habits: 'Rastreador de Hábitos',
        calendar: 'Visão Calendário',
        goals: 'Metas Futuras',
        reminders: 'Lembretes & Rituais',
        notes: 'Diário & Anotações'
      };
      document.getElementById('page-title').innerText = titles[currentTab] || 'Visão Geral';

      renderAll();
    });
  });
}

// Filtro de Âmbito
function setupScopeSelector() {
  document.querySelectorAll('.scope-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.scope-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentScope = btn.getAttribute('data-scope');
      document.getElementById('active-scope-badge').innerText = `Âmbito: ${capitalize(currentScope)}`;
      renderAll();
    });
  });
}

// Tema Claro/Escuro
function setupTheme() {
  const toggleBtn = document.getElementById('theme-toggle');
  toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    toggleBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  });
}

// Backup & Importação
function setupBackup() {
  document.getElementById('export-btn').addEventListener('click', () => {
    const data = { finances, tasks, goals, reminders, habits, projects, recurring, notes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_lifeplanner_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        finances = data.finances || [];
        tasks = data.tasks || [];
        goals = data.goals || [];
        reminders = data.reminders || [];
        habits = data.habits || [];
        projects = data.projects || [];
        recurring = data.recurring || [];
        notes = data.notes || [];
        saveAll();
        renderAll();
        alert('Dados restaurados com sucesso!');
      } catch (err) {
        alert('Erro ao ler arquivo de backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

// Formulários
function setupForms() {
  // Finanças
  document.getElementById('finance-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('fin-amount').value);
    if (isNaN(amount) || amount <= 0) return alert('Insira um valor válido!');

    finances.push({
      id: Date.now(),
      desc: document.getElementById('fin-desc').value,
      amount: amount,
      type: document.getElementById('fin-type').value,
      category: document.getElementById('fin-category').value,
      scope: document.getElementById('fin-scope').value
    });
    saveAndRender('planner_finances', finances);
    e.target.reset();
  });

  // Contas Recorrentes
  document.getElementById('recurring-form').addEventListener('submit', (e) => {
    e.preventDefault();
    recurring.push({
      id: Date.now(),
      name: document.getElementById('rec-name').value,
      amount: parseFloat(document.getElementById('rec-amount').value),
      dueDay: parseInt(document.getElementById('rec-due-day').value),
      scope: document.getElementById('rec-scope').value,
      paidMonths: []
    });
    saveAndRender('planner_recurring', recurring);
    e.target.reset();
  });

  // Tarefas
  document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    tasks.push({
      id: Date.now(),
      title: document.getElementById('task-title').value,
      dueDate: document.getElementById('task-duedate').value || null,
      scope: document.getElementById('task-scope').value,
      priority: document.getElementById('task-priority').value,
      status: 'todo'
    });
    saveAndRender('planner_tasks', tasks);
    e.target.reset();
  });

  // Projetos
  document.getElementById('project-form').addEventListener('submit', (e) => {
    e.preventDefault();
    projects.push({
      id: Date.now(),
      title: document.getElementById('proj-title').value,
      scope: document.getElementById('proj-scope').value,
      subtasks: []
    });
    saveAndRender('planner_projects', projects);
    e.target.reset();
  });

  // Hábitos
  document.getElementById('habit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    habits.push({
      id: Date.now(),
      name: document.getElementById('habit-name').value,
      scope: document.getElementById('habit-scope').value,
      completedDates: []
    });
    saveAndRender('planner_habits', habits);
    e.target.reset();
  });

  // Metas
  document.getElementById('goal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const target = parseFloat(document.getElementById('goal-target').value);
    const current = parseFloat(document.getElementById('goal-current').value) || 0;
    if (isNaN(target) || target <= 0) return alert('Insira uma meta válida!');

    goals.push({
      id: Date.now(),
      title: document.getElementById('goal-title').value,
      target: target,
      current: current,
      scope: document.getElementById('goal-scope').value
    });
    saveAndRender('planner_goals', goals);
    e.target.reset();
  });

  // Lembretes
  document.getElementById('reminder-form').addEventListener('submit', (e) => {
    e.preventDefault();
    reminders.push({
      id: Date.now(),
      text: document.getElementById('rem-text').value,
      time: document.getElementById('rem-time').value,
      scope: document.getElementById('rem-scope').value,
      done: false
    });
    saveAndRender('planner_reminders', reminders);
    e.target.reset();
  });

  // Diário e Notas
  document.getElementById('note-form').addEventListener('submit', (e) => {
    e.preventDefault();
    notes.push({
      id: Date.now(),
      title: document.getElementById('note-title').value,
      content: document.getElementById('note-content').value,
      scope: document.getElementById('note-scope').value,
      date: new Date().toLocaleDateString('pt-BR')
    });
    saveAndRender('planner_notes', notes);
    e.target.reset();
  });

  // Busca finanças
  document.getElementById('finance-search').addEventListener('input', (e) => {
    renderFinances(e.target.value.toLowerCase());
  });
}

// Renderização Geral
function renderAll() {
  renderDashboard();
  renderFinances();
  renderRecurring();
  renderTasks();
  renderProjects();
  renderHabits();
  renderCalendar();
  renderGoals();
  renderReminders();
  renderNotes();
}

function filterByScope(list) {
  return currentScope === 'all' ? list : list.filter(item => item.scope === currentScope);
}

// 1. Dashboard
function renderDashboard() {
  const filteredFin = filterByScope(finances);
  const income = filteredFin.filter(i => i.type === 'receita').reduce((a, b) => a + b.amount, 0);
  const expense = filteredFin.filter(i => i.type === 'despesa').reduce((a, b) => a + b.amount, 0);

  document.getElementById('dash-income').innerText = formatCurrency(income);
  document.getElementById('dash-expense').innerText = formatCurrency(expense);
  document.getElementById('dash-balance').innerText = formatCurrency(income - expense);
  document.getElementById('dash-habits-count').innerText = filterByScope(habits).length;

  const pendingTasks = filterByScope(tasks).filter(t => t.status !== 'done');
  const taskListEl = document.getElementById('dash-task-list');
  taskListEl.innerHTML = pendingTasks.length ? '' : '<li>Nenhuma tarefa pendente</li>';
  pendingTasks.slice(0, 5).forEach(task => {
    taskListEl.innerHTML += `<li><span>${escapeHTML(task.title)}</span><span class="badge-scope-tag scope-${task.scope}">${task.scope}</span></li>`;
  });

  renderChart(income, expense);
}

function renderChart(income, expense) {
  const canvas = document.getElementById('financeChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Receitas', 'Despesas'],
      datasets: [{ data: [income, expense], backgroundColor: ['#10b981', '#ef4444'] }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

// 2. Finanças
function renderFinances(filterText = '') {
  const tbody = document.getElementById('finance-table-body');
  tbody.innerHTML = '';
  filterByScope(finances)
    .filter(f => f.desc.toLowerCase().includes(filterText))
    .forEach(item => {
      tbody.innerHTML += `
        <tr>
          <td><strong>${escapeHTML(item.desc)}</strong></td>
          <td>${escapeHTML(item.category)}</td>
          <td><span class="badge-scope-tag scope-${item.scope}">${item.scope}</span></td>
          <td style="color:${item.type === 'receita' ? 'var(--success)' : 'var(--danger)'}">${capitalize(item.type)}</td>
          <td><strong>${formatCurrency(item.amount)}</strong></td>
          <td><button class="btn-icon" onclick="deleteItem('finances', ${item.id})"><i class="fa-solid fa-trash"></i></button></td>
        </tr>`;
    });
}

// 3. Contas Recorrentes
function renderRecurring() {
  const tbody = document.getElementById('recurring-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  const currentMonth = new Date().toISOString().slice(0, 7);

  filterByScope(recurring).forEach(item => {
    const isPaid = item.paidMonths && item.paidMonths.includes(currentMonth);
    tbody.innerHTML += `
      <tr>
        <td>
          <input type="checkbox" ${isPaid ? 'checked' : ''} onchange="togglePaidRecurring(${item.id}, '${currentMonth}')">
        </td>
        <td><strong>${escapeHTML(item.name)}</strong></td>
        <td>Dia ${item.dueDay}</td>
        <td><span class="badge-scope-tag scope-${item.scope}">${item.scope}</span></td>
        <td><strong>${formatCurrency(item.amount)}</strong></td>
        <td><button class="btn-icon" onclick="deleteItem('recurring', ${item.id})"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`;
  });
}

function togglePaidRecurring(id, month) {
  const item = recurring.find(r => r.id === id);
  if (item) {
    if (!item.paidMonths) item.paidMonths = [];
    const index = item.paidMonths.indexOf(month);
    if (index === -1) item.paidMonths.push(month);
    else item.paidMonths.splice(index, 1);
    saveAndRender('planner_recurring', recurring);
  }
}

// 4. Kanban (Com Solução de Arrastar/Soltar Corrigida)
function renderTasks() {
  const cols = { todo: document.getElementById('col-todo'), doing: document.getElementById('col-doing'), done: document.getElementById('col-done') };
  Object.values(cols).forEach(c => { if(c) c.innerHTML = ''; });

  filterByScope(tasks).forEach(task => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.id = `task-${task.id}`;

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', String(task.id));
      e.dataTransfer.effectAllowed = 'move';
    });

    card.innerHTML = `
      <strong>${escapeHTML(task.title)}</strong>
      ${task.dueDate ? `<small style="color:var(--text-muted)"><i class="fa-regular fa-calendar"></i> ${task.dueDate}</small>` : ''}
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; margin-top:8px;">
        <span class="badge-scope-tag scope-${task.scope}">${task.scope}</span>
        <button class="btn-icon" onclick="deleteItem('tasks', ${task.id})"><i class="fa-solid fa-trash"></i></button>
      </div>`;

    if (cols[task.status]) cols[task.status].appendChild(card);
  });
}

window.allowDrop = function(ev) {
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'move';
};

window.drop = function(ev, targetStatus) {
  ev.preventDefault();
  const rawId = ev.dataTransfer.getData('text/plain');
  if (!rawId) return;

  const taskId = isNaN(rawId) ? rawId : Number(rawId);
  const taskIndex = tasks.findIndex(t => t.id === taskId);

  if (taskIndex !== -1) {
    tasks[taskIndex].status = targetStatus;
    saveAndRender('planner_tasks', tasks);
  }
};

// 5. Gestão de Projetos & Subtarefas
function renderProjects() {
  const grid = document.getElementById('projects-list');
  if (!grid) return;
  grid.innerHTML = '';

  filterByScope(projects).forEach(proj => {
    const total = proj.subtasks ? proj.subtasks.length : 0;
    const completed = total > 0 ? proj.subtasks.filter(s => s.done).length : 0;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    let subtasksHTML = '';
    if (proj.subtasks) {
      proj.subtasks.forEach((sub, idx) => {
        subtasksHTML += `
          <li class="subtask-item">
            <input type="checkbox" ${sub.done ? 'checked' : ''} onchange="toggleSubtask(${proj.id}, ${idx})">
            <span style="${sub.done ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${escapeHTML(sub.title)}</span>
          </li>`;
      });
    }

    grid.innerHTML += `
      <div class="project-card">
        <div style="display:flex; justify-content:space-between;">
          <h4>${escapeHTML(proj.title)}</h4>
          <span class="badge-scope-tag scope-${proj.scope}">${proj.scope}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
        <small>${completed} de ${total} concluídas (${percent}%)</small>
        <ul class="subtask-list">${subtasksHTML}</ul>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="btn-sm" onclick="addSubtask(${proj.id})">+ Subtarefa</button>
          <button class="btn-icon" onclick="deleteItem('projects', ${proj.id})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
  });
}

function addSubtask(projId) {
  const title = prompt('Título da subtarefa:');
  if (title) {
    const proj = projects.find(p => p.id === projId);
    if (proj) {
      if (!proj.subtasks) proj.subtasks = [];
      proj.subtasks.push({ title, done: false });
      saveAndRender('planner_projects', projects);
    }
  }
}

function toggleSubtask(projId, index) {
  const proj = projects.find(p => p.id === projId);
  if (proj && proj.subtasks[index]) {
    proj.subtasks[index].done = !proj.subtasks[index].done;
    saveAndRender('planner_projects', projects);
  }
}

// 6. Rastreador de Hábitos
function renderHabits() {
  const container = document.getElementById('habits-list');
  if (!container) return;
  container.innerHTML = '';

  const today = new Date();
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().slice(0, 10));
  }

  filterByScope(habits).forEach(habit => {
    let daysHTML = '';
    last7Days.forEach(dateStr => {
      const isCompleted = habit.completedDates && habit.completedDates.includes(dateStr);
      const dayName = new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'narrow' });
      daysHTML += `
        <button class="habit-day-btn ${isCompleted ? 'active' : ''}" 
          title="${dateStr}" onclick="toggleHabitDate(${habit.id}, '${dateStr}')">
          ${dayName}
        </button>`;
    });

    container.innerHTML += `
      <div class="habit-row">
        <div>
          <strong>${escapeHTML(habit.name)}</strong>
          <span class="badge-scope-tag scope-${habit.scope}" style="margin-left:8px;">${habit.scope}</span>
        </div>
        <div class="habit-days">${daysHTML}</div>
        <button class="btn-icon" onclick="deleteItem('habits', ${habit.id})"><i class="fa-solid fa-trash"></i></button>
      </div>`;
  });
}

function toggleHabitDate(id, dateStr) {
  const habit = habits.find(h => h.id === id);
  if (habit) {
    if (!habit.completedDates) habit.completedDates = [];
    const index = habit.completedDates.indexOf(dateStr);
    if (index === -1) habit.completedDates.push(dateStr);
    else habit.completedDates.splice(index, 1);
    saveAndRender('planner_habits', habits);
  }
}

// 7. Visão Calendário
function setupCalendarControls() {
  document.getElementById('cal-prev').addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() + 1);
    renderCalendar();
  });
}

function renderCalendar() {
  const daysEl = document.getElementById('calendar-days');
  const monthYearEl = document.getElementById('cal-month-year');
  if (!daysEl || !monthYearEl) return;

  daysEl.innerHTML = '';
  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  monthYearEl.innerText = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    daysEl.innerHTML += `<div class="cal-day empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTasks = filterByScope(tasks).filter(t => t.dueDate === dateStr);

    let eventsHTML = '';
    dayTasks.forEach(t => {
      eventsHTML += `<div class="cal-event" title="${escapeHTML(t.title)}">${escapeHTML(t.title)}</div>`;
    });

    daysEl.innerHTML += `
      <div class="cal-day">
        <strong>${day}</strong>
        ${eventsHTML}
      </div>`;
  }
}

// 8. Metas
function renderGoals() {
  const grid = document.getElementById('goals-grid');
  grid.innerHTML = '';
  filterByScope(goals).forEach(goal => {
    const percent = goal.target > 0 ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0;
    grid.innerHTML += `
      <div class="goal-card">
        <div style="display:flex; justify-content:space-between;">
          <h4>${escapeHTML(goal.title)}</h4>
          <span class="badge-scope-tag scope-${goal.scope}">${goal.scope}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
        <p style="font-size:0.82rem; color:var(--text-muted);">${formatCurrency(goal.current)} / ${formatCurrency(goal.target)} (${percent}%)</p>
        <div style="display:flex; gap:8px;">
          <button class="btn" style="padding:4px 8px; font-size:0.78rem;" onclick="addGoalValue(${goal.id})">+ Guardar</button>
          <button class="btn-icon" onclick="deleteItem('goals', ${goal.id})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
  });
}

function addGoalValue(id) {
  const val = prompt('Quanto deseja adicionar à meta?');
  const parsedVal = parseFloat(val);
  if (val && !isNaN(parsedVal) && parsedVal > 0) {
    const goal = goals.find(g => g.id === id);
    if (goal) {
      goal.current += parsedVal;
      saveAndRender('planner_goals', goals);
    }
  }
}

// 9. Lembretes
function renderReminders() {
  const list = document.getElementById('reminder-list');
  list.innerHTML = '';
  filterByScope(reminders).forEach(item => {
    list.innerHTML += `
      <li class="check-item">
        <div>
          <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleReminder(${item.id})">
          <span style="margin-left:8px; ${item.done ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">
            <strong>[${escapeHTML(item.time)}]</strong> ${escapeHTML(item.text)}
          </span>
        </div>
        <div>
          <span class="badge-scope-tag scope-${item.scope}">${item.scope}</span>
          <button class="btn-icon" onclick="deleteItem('reminders', ${item.id})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </li>`;
  });
}

function toggleReminder(id) {
  const item = reminders.find(r => r.id === id);
  if (item) {
    item.done = !item.done;
    saveAndRender('planner_reminders', reminders);
  }
}

// 10. Diário & Anotações
function renderNotes() {
  const grid = document.getElementById('notes-grid');
  if (!grid) return;
  grid.innerHTML = '';

  filterByScope(notes).forEach(note => {
    grid.innerHTML += `
      <div class="goal-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4>${escapeHTML(note.title)}</h4>
          <span class="badge-scope-tag scope-${note.scope}">${note.scope}</span>
        </div>
        <small style="color:var(--text-muted);"><i class="fa-regular fa-clock"></i> ${note.date}</small>
        <p style="font-size:0.88rem; white-space:pre-wrap; margin-top:8px;">${escapeHTML(note.content)}</p>
        <div style="display:flex; justify-content:flex-end; margin-top:10px;">
          <button class="btn-icon" onclick="deleteItem('notes', ${note.id})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
  });
}

// Funções de Persistência e Remoção
function deleteItem(type, id) {
  if (type === 'finances') finances = finances.filter(i => i.id !== id);
  else if (type === 'tasks') tasks = tasks.filter(i => i.id !== id);
  else if (type === 'goals') goals = goals.filter(i => i.id !== id);
  else if (type === 'reminders') reminders = reminders.filter(i => i.id !== id);
  else if (type === 'habits') habits = habits.filter(i => i.id !== id);
  else if (type === 'projects') projects = projects.filter(i => i.id !== id);
  else if (type === 'recurring') recurring = recurring.filter(i => i.id !== id);
  else if (type === 'notes') notes = notes.filter(i => i.id !== id);
  saveAll();
  renderAll();
}

function saveAll() {
  localStorage.setItem('planner_finances', JSON.stringify(finances));
  localStorage.setItem('planner_tasks', JSON.stringify(tasks));
  localStorage.setItem('planner_goals', JSON.stringify(goals));
  localStorage.setItem('planner_reminders', JSON.stringify(reminders));
  localStorage.setItem('planner_habits', JSON.stringify(habits));
  localStorage.setItem('planner_projects', JSON.stringify(projects));
  localStorage.setItem('planner_recurring', JSON.stringify(recurring));
  localStorage.setItem('planner_notes', JSON.stringify(notes));
}

function saveAndRender(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
  renderAll();
}

// Utilitários
function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

function escapeHTML(str) {
  return str ? str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  ) : '';
}

