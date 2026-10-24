(function () {
  "use strict";

  const icons = {
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5A9 9 0 0 1 12 6v14a9 9 0 0 0-9.5-1.5z"/><path d="M21.5 4.5A9 9 0 0 0 12 6v14a9 9 0 0 1 9.5-1.5z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12"/><circle cx="12" cy="12" r="2.5"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-6h6v6"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h7l2 2h9v11H3z"/></svg>',
    task: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 21V11M12 21V3M19 21v-6"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 17l5-5-5-5M15 12H3M15 4h5v16h-5"/></svg>'
  };

  const today = new Date();
  let calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDateKey = toDateKey(today);
  const calendarEventSources = new Map();
  let noticeTimer = null;

  function renderIcons(root) {
    root.querySelectorAll("[data-icon]").forEach((element) => {
      if (icons[element.dataset.icon]) element.innerHTML = icons[element.dataset.icon];
    });
  }

  function initPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.innerHTML = icons.eye;
      button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.passwordToggle);
        if (!input) return;
        const revealing = input.type === "password";
        input.type = revealing ? "text" : "password";
        button.setAttribute("aria-label", revealing ? "Скрыть пароль" : "Показать пароль");
      });
    });
  }

  function getNavigation(role) {
    if (role === "admin") {
      return [["Главная","home","#dashboardOverview"],["Группы","calendar","#adminGroupForm"],["Пользователи","users","#userForm"],["Список аккаунтов","user","#adminUsersSection"],["Нагрузка","chart","#teacherLoadSection"],["Посещаемость","calendar","#attendanceSection"]];
    }
    return role === "teacher"
      ? [["Главная","home","#teacherHomeView"],["Курсы","book","#teacherCoursesView"],["Студенты","users","#teacherStudentsView"]]
      : [["Главная","home","#dashboardOverview"],["Мои курсы","book","#coursesList"],["Материалы","folder","#courseMaterialsSection"],["Задания","task","#courseAssignmentsSection"],["Мой профиль","user","#profile"]];
  }

  function toDateKey(value) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getCalendarEvents() {
    return Array.from(calendarEventSources.values()).flat();
  }

  function renderCalendar() {
    const grid = document.getElementById("calendarGrid");
    const monthLabel = document.getElementById("calendarMonth");
    if (!grid || !monthLabel) return;
    monthLabel.textContent = new Intl.DateTimeFormat("ru-RU", { month:"long", year:"numeric" }).format(calendarCursor);
    grid.innerHTML = "";
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPreviousMonth = new Date(year, month, 0).getDate();
    const events = getCalendarEvents();

    for (let cell = 0; cell < 42; cell += 1) {
      let day = cell - firstDayOffset + 1;
      let cellMonth = month;
      let cellYear = year;
      let outside = false;
      if (day < 1) {
        day = daysInPreviousMonth + day;
        cellMonth -= 1;
        outside = true;
      } else if (day > daysInMonth) {
        day -= daysInMonth;
        cellMonth += 1;
        outside = true;
      }
      const date = new Date(cellYear, cellMonth, day);
      const key = toDateKey(date);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "calendar-day";
      if (outside) button.classList.add("is-outside");
      if (key === toDateKey(today)) button.classList.add("is-today");
      if (key === selectedDateKey) button.classList.add("is-selected");
      if (events.some((event) => event.date === key)) button.classList.add("has-events");
      button.textContent = String(day);
      button.setAttribute("aria-label", new Intl.DateTimeFormat("ru-RU", { dateStyle:"long" }).format(date));
      button.addEventListener("click", () => {
        selectedDateKey = key;
        calendarCursor = new Date(date.getFullYear(), date.getMonth(), 1);
        renderCalendar();
        renderEvents();
      });
      grid.appendChild(button);
    }
  }

  function renderEvents() {
    const list = document.getElementById("calendarEvents");
    const title = document.getElementById("eventsTitle");
    if (!list || !title) return;
    const selectedDate = new Date(`${selectedDateKey}T12:00:00`);
    title.textContent = `События · ${new Intl.DateTimeFormat("ru-RU", { day:"numeric", month:"long" }).format(selectedDate)}`;
    const events = getCalendarEvents().filter((event) => event.date === selectedDateKey);
    list.innerHTML = "";
    if (events.length === 0) {
      list.innerHTML = '<p class="rail-empty">На выбранную дату событий нет.</p>';
      return;
    }
    events.slice(0, 5).forEach((event) => {
      const item = document.createElement("div");
      item.className = "rail-event";
      const dot = document.createElement("span");
      dot.className = `rail-event-dot ${event.type === "assignment" ? "assignment" : ""}`;
      const content = document.createElement("span");
      content.textContent = event.title;
      const kind = document.createElement("small");
      kind.textContent = event.type === "assignment" ? "Задание" : "Занятие";
      content.appendChild(kind);
      item.appendChild(dot);
      item.appendChild(content);
      list.appendChild(item);
    });
  }

  function setCalendarEvents(source, events) {
    calendarEventSources.set(source, (events || []).map((event) => ({
      date: toDateKey(event.date),
      title: event.title || "Событие",
      type: event.type || "lesson"
    })).filter((event) => event.date));
    renderCalendar();
    renderEvents();
  }

  function createActionGroup(...buttons) {
    const group = document.createElement("div");
    group.className = "row-actions";
    buttons.flat().filter(Boolean).forEach((button) => {
      if (/Удалить|Отклонить|Заблокировать/.test(button.textContent)) button.classList.add("danger-action");
      group.appendChild(button);
    });
    return group;
  }

  function addRailNotice(text) {
    const list = document.getElementById("railNotifications");
    if (!list || !text || /Загрузка/.test(text)) return;
    if (list.querySelector(".rail-empty")) list.innerHTML = "";
    const item = document.createElement("div");
    item.className = "rail-notice";
    const dot = document.createElement("span");
    dot.className = "rail-event-dot";
    const content = document.createElement("span");
    content.textContent = text;
    const time = document.createElement("small");
    time.textContent = "Только что";
    content.appendChild(time);
    item.appendChild(dot);
    item.appendChild(content);
    list.prepend(item);
    while (list.children.length > 3) list.lastElementChild.remove();
  }

  function initNotifications() {
    const message = document.getElementById("message");
    if (!message) return;
    message.title = "Нажмите, чтобы закрыть";
    message.addEventListener("click", () => { message.textContent = ""; });
    const observer = new MutationObserver(() => {
      const text = message.textContent.trim();
      if (!text) return;
      addRailNotice(text);
      window.clearTimeout(noticeTimer);
      const isError = /ошиб|не удалось|нет доступа|укажите|выберите|сначала/i.test(text);
      noticeTimer = window.setTimeout(() => { message.textContent = ""; }, isError ? 7000 : 4000);
    });
    observer.observe(message, { childList:true, characterData:true, subtree:true });
  }

  function initDashboard() {
    const role = document.body.dataset.role || "student";
    const roleLabel = role === "admin" ? "Администратор" : role === "teacher" ? "Преподаватель" : "Студент";
    const contentNodes = Array.from(document.body.childNodes).filter((node) => node.nodeName !== "SCRIPT");
    const shell = document.createElement("div");
    shell.className = "app-shell";
    const navigation = getNavigation(role).map(([label, iconName, target], index) => `<button class="nav-button${index === 0 ? " is-active" : ""}" type="button" data-target="${target}">${icons[iconName]}<span>${label}</span></button>`).join("");
    shell.innerHTML = `
      <aside class="app-sidebar" aria-label="Основная навигация">
        <div class="brand brand--light"><span class="brand-mark">${icons.book}</span><span>EduPlatform</span></div>
        <div class="sidebar-user"><div class="user-avatar" id="sidebarAvatar">${role === "admin" ? "А" : role === "teacher" ? "П" : "С"}</div><div class="user-meta"><strong id="sidebarName">Личный кабинет</strong><span>${roleLabel}</span></div></div>
        <nav class="sidebar-nav">${navigation}</nav>
        <button class="sidebar-logout" id="sidebarLogout" type="button">${icons.logout}<span>Выйти</span></button>
      </aside>
      <button class="sidebar-backdrop" type="button" aria-label="Закрыть меню"></button>
      <main class="workspace">
        <header class="workspace-header"><button class="menu-toggle" type="button" aria-label="Открыть меню">${icons.menu}</button><div class="workspace-title"><h1 id="welcomeTitle">Добро пожаловать!</h1><p>${role === "admin" ? "Управляйте пользователями и следите за показателями платформы." : role === "teacher" ? "Управляйте курсами, заданиями и учебной активностью студентов." : "Ваши курсы, задания и результаты собраны в одном месте."}</p></div></header>
        <div class="dashboard-layout">
          <div class="dashboard-main">
            <section class="overview-panel" id="dashboardOverview"><div class="stat-grid">
              <article class="stat-card"><span class="stat-icon">${icons.book}</span><span><strong class="stat-value" id="statCourses">—</strong><span class="stat-label">${role === "admin" ? "Пользователей" : role === "teacher" ? "Учебных курсов" : "Моих курсов"}</span></span></article>
              <article class="stat-card"><span class="stat-icon">${icons.users}</span><span><strong class="stat-value" id="statPeople">—</strong><span class="stat-label">${role === "admin" ? "Преподавателей" : role === "teacher" ? "Заявок студентов" : "Учебная группа"}</span></span></article>
              <article class="stat-card"><span class="stat-icon">${icons.task}</span><span><strong class="stat-value" id="statTasks">—</strong><span class="stat-label">${role === "admin" ? "Посещаемость" : "Активных заданий"}</span></span></article>
              <article class="stat-card"><span class="stat-icon">${icons.chart}</span><span><strong class="stat-value" id="statSystem">${role === "admin" ? "—" : "100%"}</strong><span class="stat-label">${role === "admin" ? "Учебных курсов" : "Система доступна"}</span></span></article>
            </div></section>
            <div class="content-stack"></div>
          </div>
          <aside class="dashboard-rail" aria-label="Календарь и уведомления">
            <section class="rail-card calendar-card">
              <div class="calendar-head"><strong id="calendarMonth"></strong><div class="calendar-nav"><button id="calendarPrevious" type="button" aria-label="Предыдущий месяц">‹</button><button id="calendarNext" type="button" aria-label="Следующий месяц">›</button></div></div>
              <div class="calendar-weekdays"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div>
              <div class="calendar-grid" id="calendarGrid"></div>
            </section>
            <section class="rail-card"><h2 class="rail-card-title" id="eventsTitle">События</h2><div class="rail-list" id="calendarEvents"><p class="rail-empty">На выбранную дату событий нет.</p></div></section>
            <section class="rail-card"><h2 class="rail-card-title">Уведомления</h2><div class="rail-list" id="railNotifications"><p class="rail-empty">Новых уведомлений нет.</p></div></section>
            <section class="rail-card"><h2 class="rail-card-title">Быстрые действия</h2><div class="quick-actions">${role === "admin" ? '<button class="quick-action" data-quick-target="#adminGroupForm">Создать группу</button><button class="quick-action" data-quick-target="#userForm">Добавить пользователя</button><button class="quick-action" data-quick-target="#teacherLoadSection">Нагрузка</button><button class="quick-action" data-quick-target="#attendanceSection">Посещаемость</button>' : role === "teacher" ? '<button class="quick-action" data-quick-target="#teacherCoursesView">Открыть курсы</button><button class="quick-action" data-quick-target="#courseForm">Создать курс</button><button class="quick-action" data-quick-target="#teacherStudentsView">Студенты</button><button class="quick-action" data-quick-target="#groupForm">Создать группу</button>' : '<button class="quick-action" data-quick-target="#coursesList">Мои курсы</button><button class="quick-action" data-quick-target="#courseAssignmentsSection">Задания</button><button class="quick-action" data-quick-target="#courseMaterialsSection">Материалы</button><button class="quick-action" data-quick-target="#profile">Профиль</button>'}</div></section>
          </aside>
        </div>
      </main>`;

    const content = shell.querySelector(".content-stack");
    contentNodes.forEach((node) => content.appendChild(node));
    document.body.insertBefore(shell, document.body.firstChild);

    shell.querySelector("#calendarPrevious").addEventListener("click", () => {
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
      renderCalendar();
    });
    shell.querySelector("#calendarNext").addEventListener("click", () => {
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
      renderCalendar();
    });
    shell.querySelectorAll("[data-quick-target]").forEach((button) => button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.quickTarget);
      const teacherView = target?.closest(".teacher-view");
      if (role === "teacher" && teacherView) window.TeacherUI?.activateView(teacherView);
      const details = target?.closest("details");
      if (details) details.open = true;
      if (target && !target.hidden) target.scrollIntoView({ behavior:"smooth", block:"center" });
    }));
    renderCalendar();
    renderEvents();
    initNotifications();

    const closeMenu = () => document.body.classList.remove("sidebar-open");
    shell.querySelector(".menu-toggle").addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
    shell.querySelector(".sidebar-backdrop").addEventListener("click", closeMenu);
    shell.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.target);
      if (role === "teacher" && target?.classList.contains("teacher-view")) {
        window.TeacherUI?.activateView(target);
      } else if (target && !target.hidden) {
        target.scrollIntoView({ behavior:"smooth", block:"start" });
      }
      shell.querySelectorAll(".nav-button").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      closeMenu();
    }));
    shell.querySelector("#sidebarLogout").addEventListener("click", () => document.getElementById("logoutButton")?.click());

    const updateCounts = () => {
      if (role === "admin") return;
      const count = (selector) => {
        const element = document.querySelector(selector);
        if (!element || /Загрузка|пока|Нет /.test(element.textContent)) return 0;
        return element.children.length;
      };
      document.getElementById("statCourses").textContent = String(count("#coursesList"));
      document.getElementById("statPeople").textContent = role === "teacher" ? String(count("#studentsList")) : "Моя";
      document.getElementById("statTasks").textContent = String(count("#assignmentsList"));
    };
    ["coursesList","studentsList","assignmentsList"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) new MutationObserver(updateCounts).observe(element, { childList:true, subtree:true, characterData:true });
    });
    updateCounts();
  }

  function setUser(user) {
    if (!user) return;
    const first = user.firstName || user.first_name || "";
    const last = user.lastName || user.last_name || "";
    const name = [first,last].filter(Boolean).join(" ") || user.email || "Личный кабинет";
    const sidebarName = document.getElementById("sidebarName");
    const avatar = document.getElementById("sidebarAvatar");
    const welcome = document.getElementById("welcomeTitle");
    if (sidebarName) sidebarName.textContent = name;
    if (avatar) avatar.textContent = name.split(/\s+/).map((part) => part[0]).join("").slice(0,2).toUpperCase();
    if (welcome) welcome.textContent = `Добро пожаловать, ${first || "пользователь"}!`;
  }

  window.EduUI = { setUser, setCalendarEvents, createActionGroup };
  renderIcons(document);
  initPasswordToggles();
  if (document.body.classList.contains("dashboard-page")) initDashboard();
})();
