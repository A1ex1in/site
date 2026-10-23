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
    return role === "teacher"
      ? [["Главная","home","#dashboardOverview"],["Курсы","book","#courseForm"],["Материалы","folder","#courseMaterialsSection"],["Задания","task","#courseAssignmentsSection"],["Журнал","chart","#journalSection"],["Студенты","users","#studentsList"],["Группы","calendar","#groupForm"]]
      : [["Главная","home","#dashboardOverview"],["Мои курсы","book","#coursesList"],["Материалы","folder","#courseMaterialsSection"],["Задания","task","#courseAssignmentsSection"],["Мой профиль","user","#profile"]];
  }

  function prettyDate() {
    const text = new Intl.DateTimeFormat("ru-RU", { weekday:"long", day:"numeric", month:"long", year:"numeric" }).format(new Date());
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function initDashboard() {
    const role = document.body.dataset.role || "student";
    const roleLabel = role === "teacher" ? "Преподаватель" : "Студент";
    const contentNodes = Array.from(document.body.childNodes).filter((node) => node.nodeName !== "SCRIPT");
    const shell = document.createElement("div");
    shell.className = "app-shell";
    const navigation = getNavigation(role).map(([label, iconName, target], index) => `<button class="nav-button${index === 0 ? " is-active" : ""}" type="button" data-target="${target}">${icons[iconName]}<span>${label}</span></button>`).join("");
    shell.innerHTML = `
      <aside class="app-sidebar" aria-label="Основная навигация">
        <div class="brand brand--light"><span class="brand-mark">${icons.book}</span><span>EduPlatform</span></div>
        <div class="sidebar-user"><div class="user-avatar" id="sidebarAvatar">${role === "teacher" ? "П" : "С"}</div><div class="user-meta"><strong id="sidebarName">Личный кабинет</strong><span>${roleLabel}</span></div></div>
        <nav class="sidebar-nav">${navigation}</nav>
        <button class="sidebar-logout" id="sidebarLogout" type="button">${icons.logout}<span>Выйти</span></button>
      </aside>
      <button class="sidebar-backdrop" type="button" aria-label="Закрыть меню"></button>
      <main class="workspace">
        <header class="workspace-header"><button class="menu-toggle" type="button" aria-label="Открыть меню">${icons.menu}</button><div class="workspace-title"><h1 id="welcomeTitle">Добро пожаловать!</h1><p>${role === "teacher" ? "Управляйте курсами, заданиями и учебной активностью студентов." : "Ваши курсы, задания и результаты собраны в одном месте."}</p></div><div class="date-pill">${icons.calendar}<span>${prettyDate()}</span></div></header>
        <section class="overview-panel" id="dashboardOverview"><div class="stat-grid">
          <article class="stat-card"><span class="stat-icon">${icons.book}</span><span><strong class="stat-value" id="statCourses">—</strong><span class="stat-label">${role === "teacher" ? "Учебных курсов" : "Моих курсов"}</span></span></article>
          <article class="stat-card"><span class="stat-icon">${icons.users}</span><span><strong class="stat-value" id="statPeople">—</strong><span class="stat-label">${role === "teacher" ? "Заявок студентов" : "Учебная группа"}</span></span></article>
          <article class="stat-card"><span class="stat-icon">${icons.task}</span><span><strong class="stat-value" id="statTasks">—</strong><span class="stat-label">Активных заданий</span></span></article>
          <article class="stat-card"><span class="stat-icon">${icons.chart}</span><span><strong class="stat-value">100%</strong><span class="stat-label">Система доступна</span></span></article>
        </div></section>
        <div class="content-stack"></div>
      </main>`;

    const content = shell.querySelector(".content-stack");
    contentNodes.forEach((node) => content.appendChild(node));
    document.body.insertBefore(shell, document.body.firstChild);

    const closeMenu = () => document.body.classList.remove("sidebar-open");
    shell.querySelector(".menu-toggle").addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
    shell.querySelector(".sidebar-backdrop").addEventListener("click", closeMenu);
    shell.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.target);
      if (target && !target.hidden) target.scrollIntoView({ behavior:"smooth", block:"start" });
      shell.querySelectorAll(".nav-button").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      closeMenu();
    }));
    shell.querySelector("#sidebarLogout").addEventListener("click", () => document.getElementById("logoutButton")?.click());

    const updateCounts = () => {
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

  window.EduUI = { setUser };
  renderIcons(document);
  initPasswordToggles();
  if (document.body.classList.contains("dashboard-page")) initDashboard();
})();
