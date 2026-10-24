(function () {
  "use strict";

  const content = document.querySelector(".content-stack");
  if (!content || document.body.dataset.role !== "teacher") return;

  const byId = (id) => document.getElementById(id);
  const element = (tag,className) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  };

  content.querySelectorAll(":scope > h2").forEach((heading) => heading.remove());

  function sectionHeading(kicker,title,description) {
    const heading = element("div","teacher-section-heading");
    heading.innerHTML = `<div><span>${kicker}</span><h2>${title}</h2></div><p>${description}</p>`;
    return heading;
  }

  function blockHeading(kicker,title,description = "") {
    const heading = element("div","teacher-block-heading");
    heading.innerHTML = `<div><span>${kicker}</span><h3>${title}</h3></div>${description ? `<p>${description}</p>` : ""}`;
    return heading;
  }

  function createPanel(title,subtitle,nodes) {
    const details = element("details","teacher-create-panel");
    const summary = document.createElement("summary");
    summary.innerHTML = `<span><b>${title}</b><small>${subtitle}</small></span><i>＋</i>`;
    details.appendChild(summary);
    nodes.filter(Boolean).forEach((node) => details.appendChild(node));
    return details;
  }

  const homeView = element("section","teacher-view");
  homeView.id = "teacherHomeView";
  homeView.appendChild(sectionHeading("Проверка работ","Присланные задания","Работы студентов, которые ожидают вашей проверки."));
  const submissionInbox = element("section","teacher-submission-inbox");
  submissionInbox.id = "teacherSubmissionInbox";
  submissionInbox.innerHTML = '<p class="teacher-inbox-empty">Загрузка присланных работ…</p>';
  homeView.appendChild(submissionInbox);
  homeView.appendChild(sectionHeading("Рабочий процесс","С чего начать","Три шага от пустой дисциплины до готового задания для студентов."));
  const steps = element("div","teacher-steps");
  steps.innerHTML = `
    <article><b>1</b><div><strong>Выберите дисциплину</strong><p>Откройте «Дисциплина/МДК» и выберите нужную карточку.</p></div></article>
    <article><b>2</b><div><strong>Соберите структуру</strong><p>Создайте разделы и темы в нужном порядке.</p></div></article>
    <article><b>3</b><div><strong>Добавьте содержимое</strong><p>Привяжите материалы и задания, затем опубликуйте их.</p></div></article>`;
  homeView.appendChild(steps);
  const homeActions = element("div","teacher-home-actions");
  homeActions.innerHTML = '<button type="button" data-open-teacher-view="#teacherCoursesView">Перейти к дисциплинам</button><button type="button" data-open-teacher-view="#teacherStudentsView">Открыть студентов</button>';
  homeView.appendChild(homeActions);

  const coursesView = element("section","teacher-view");
  coursesView.id = "teacherCoursesView";
  coursesView.hidden = true;
  coursesView.appendChild(sectionHeading("Обучение","Дисциплина/МДК","Выберите дисциплину — после этого появятся четыре последовательных раздела работы."));
  const creationGrid = element("div","teacher-create-grid");
  creationGrid.appendChild(createPanel("Новая дисциплина","Название и короткий код предмета",[byId("disciplineForm"),byId("disciplinesList")]));
  creationGrid.appendChild(createPanel("Новая группа","Дисциплина, учебная группа, учебный год и семестр",[byId("courseForm")]));
  coursesView.appendChild(creationGrid);
  coursesView.appendChild(blockHeading("Ваши дисциплины","Выберите дисциплину для работы","Все действия с содержимым откроются внутри выбранной дисциплины."));
  coursesView.appendChild(byId("coursesList"));

  const workspace = element("section","teacher-course-workspace");
  workspace.id = "teacherCourseWorkspace";
  workspace.hidden = true;
  const workspaceHeader = element("header","teacher-course-header");
  workspaceHeader.innerHTML = '<button id="closeCourseWorkspaceButton" type="button">← Все дисциплины/МДК</button><span>Выбранная дисциплина</span><h2 id="teacherCourseWorkspaceTitle">Дисциплина</h2><p>Работайте по порядку: структура → материалы → задания → журнал.</p>';
  workspace.appendChild(workspaceHeader);
  const tabs = element("nav","teacher-course-tabs");
  tabs.setAttribute("aria-label","Разделы дисциплины");
  tabs.innerHTML = '<button type="button" data-course-panel="courseLessonsSection">1. Структура</button><button type="button" data-course-panel="courseMaterialsSection">2. Материалы</button><button type="button" data-course-panel="courseAssignmentsSection">3. Задания</button><button type="button" data-course-panel="journalSection">4. Журнал</button>';
  workspace.appendChild(tabs);

  const mainCoursePanelIds = ["courseLessonsSection","courseMaterialsSection","courseAssignmentsSection","journalSection"];
  const detailPanelIds = ["attendanceEditorSection","gradeItemsSection","materialFilesSection","assignmentFilesSection","submissionsSection","submissionDetailsSection"];
  mainCoursePanelIds.forEach((id) => {
    const panel = byId(id);
    if (panel) workspace.appendChild(panel);
  });
  detailPanelIds.forEach((id) => {
    const panel = byId(id);
    if (panel) document.body.appendChild(panel);
  });

  function collapseCourseForm(sectionId,formId,listId,title,subtitle,listTitle = "") {
    const section = workspace.querySelector(`#${sectionId}`) || byId(sectionId);
    const form = section?.querySelector(`#${formId}`) || byId(formId);
    const list = section?.querySelector(`#${listId}`) || byId(listId);
    if (!section || !form || !list) return;
    section.querySelectorAll(":scope > h3:not(.teacher-list-title), :scope > h4").forEach((heading) => heading.remove());
    const panel = createPanel(title,subtitle,[form]);
    panel.classList.add("teacher-create-panel--inner");
    section.insertBefore(panel,list);
    if (listTitle) {
      const heading = document.createElement("h3");
      heading.className = "teacher-list-title";
      heading.textContent = listTitle;
      section.insertBefore(heading,list);
    }
  }

  collapseCourseForm("courseLessonsSection","moduleForm","modulesList","Добавить раздел","Крупный раздел дисциплины","Модули дисциплины");
  collapseCourseForm("courseLessonsSection","lessonForm","lessonsList","Добавить тему","Лекция, практика или лабораторная","Темы дисциплины");
  collapseCourseForm("courseMaterialsSection","materialForm","materialsList","Добавить вид материала","Конспект, презентация, методичка или самостоятельная работа");
  collapseCourseForm("courseAssignmentsSection","assignmentForm","assignmentsList","Добавить задание","Практика или проверочная работа");
  collapseCourseForm("gradeItemsSection","gradeItemForm","gradeItemsList","Добавить оценивание","Ответ, работа или тест");
  coursesView.appendChild(workspace);

  const studentsView = element("section","teacher-view");
  studentsView.id = "teacherStudentsView";
  studentsView.hidden = true;
  studentsView.appendChild(sectionHeading("Учащиеся","Студенты и группы","Подтвердите новые заявки, затем откройте группу и карточку студента."));

  const studentTabs = element("nav","teacher-student-tabs");
  studentTabs.setAttribute("aria-label","Разделы студентов");
  studentTabs.innerHTML = '<button type="button" class="is-active" data-student-panel="teacherGroupsPanel">Группы</button><button type="button" data-student-panel="teacherRequestsPanel">Заявки на регистрацию</button>';
  studentsView.appendChild(studentTabs);

  const groupsPanel = element("div","teacher-students-panel");
  groupsPanel.id = "teacherGroupsPanel";
  groupsPanel.appendChild(createPanel("Добавить группу","Создание новой учебной группы",[byId("groupForm")]));
  const groupsSurface = element("section","teacher-surface");
  groupsSurface.appendChild(blockHeading("Список","Учебные группы","Откройте группу, чтобы увидеть её студентов."));
  groupsSurface.appendChild(byId("groupsList"));
  groupsPanel.appendChild(groupsSurface);

  const requestsPanel = element("div","teacher-students-panel");
  requestsPanel.id = "teacherRequestsPanel";
  requestsPanel.hidden = true;
  const pendingSurface = element("section","teacher-surface");
  pendingSurface.appendChild(blockHeading("Новые","Заявки на регистрацию"));
  pendingSurface.appendChild(byId("studentsList"));
  requestsPanel.appendChild(pendingSurface);
  studentsView.append(groupsPanel,requestsPanel);

  ["groupStudentsSection","studentDetailsSection"].forEach((id) => {
    const panel = byId(id);
    if (panel) {
      panel.classList.add("teacher-surface","teacher-drilldown");
      studentsView.appendChild(panel);
    }
  });

  const groupSection = studentsView.querySelector("#groupStudentsSection");
  const groupTitle = groupSection?.querySelector("#selectedGroupName");
  const groupHeader = element("header","teacher-drilldown-header");
  const groupBackButton = document.createElement("button");
  groupBackButton.type = "button";
  groupBackButton.textContent = "← К группам";
  if (groupTitle) groupHeader.append(groupBackButton,groupTitle);
  if (groupSection) groupSection.prepend(groupHeader);

  const studentSection = studentsView.querySelector("#studentDetailsSection");
  const studentTitle = studentSection?.querySelector(":scope > h3");
  studentSection?.querySelector(":scope > h4")?.classList.add("teacher-subheading");
  const studentHeader = element("header","teacher-drilldown-header");
  const studentBackButton = document.createElement("button");
  studentBackButton.type = "button";
  studentBackButton.textContent = "← К студентам группы";
  if (studentTitle) studentHeader.append(studentBackButton,studentTitle);
  if (studentSection) studentSection.prepend(studentHeader);

  content.append(homeView,coursesView,studentsView);

  let activeCourse = null;

  const drawerBackdrop = element("div","teacher-drawer-backdrop");
  drawerBackdrop.hidden = true;
  document.body.appendChild(drawerBackdrop);
  detailPanelIds.forEach((id) => {
    const panel = byId(id);
    if (!panel) return;
    panel.classList.add("teacher-course-drawer");
    panel.setAttribute("role","dialog");
    panel.setAttribute("aria-modal","true");
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "teacher-drawer-close";
    closeButton.textContent = id === "submissionDetailsSection" ? "← К работам студентов" : "Закрыть ×";
    closeButton.addEventListener("click",() => {
      if (id === "submissionDetailsSection") openCourseDetail("submissionsSection");
      else closeCourseDetail();
    });
    panel.prepend(closeButton);
  });

  function showStudentPanel(panelId) {
    [groupsPanel,requestsPanel].forEach((panel) => { panel.hidden = panel.id !== panelId; });
    if (groupSection) groupSection.hidden = true;
    if (studentSection) studentSection.hidden = true;
    studentTabs.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-active",button.dataset.studentPanel === panelId);
    });
  }

  function openGroupDetails() {
    groupsPanel.hidden = true;
    requestsPanel.hidden = true;
    if (studentSection) studentSection.hidden = true;
    if (!groupSection) return;
    groupSection.hidden = false;
    groupSection.scrollIntoView({ behavior:"smooth",block:"start" });
  }

  function openStudentDetails() {
    groupsPanel.hidden = true;
    requestsPanel.hidden = true;
    if (groupSection) groupSection.hidden = true;
    if (!studentSection) return;
    studentSection.hidden = false;
    studentSection.scrollIntoView({ behavior:"smooth",block:"start" });
  }

  function closeCourseDetail() {
    detailPanelIds.forEach((id) => {
      const panel = byId(id);
      if (panel) panel.hidden = true;
    });
    drawerBackdrop.hidden = true;
    document.body.classList.remove("teacher-drawer-open");
  }

  function openCourseDetail(panelId) {
    detailPanelIds.forEach((id) => {
      const panel = byId(id);
      if (panel) panel.hidden = id !== panelId;
    });
    const panel = byId(panelId);
    if (!panel) return;
    drawerBackdrop.hidden = false;
    document.body.classList.add("teacher-drawer-open");
    panel.scrollTop = 0;
    panel.querySelector(".teacher-drawer-close")?.focus();
  }

  function activateView(target) {
    const view = typeof target === "string" ? document.querySelector(target) : target;
    if (!view?.classList.contains("teacher-view")) return;
    const overview = byId("dashboardOverview");
    if (overview) overview.hidden = view !== homeView;
    document.querySelectorAll(".teacher-view").forEach((item) => { item.hidden = item !== view; });
    document.querySelectorAll(".nav-button").forEach((button) => {
      button.classList.toggle("is-active",button.dataset.target === `#${view.id}`);
    });
    view.scrollIntoView({ behavior:"smooth",block:"start" });
  }

  function setCoursePanel(panelId) {
    mainCoursePanelIds.forEach((id) => {
      const panel = byId(id);
      if (panel) panel.hidden = id !== panelId;
    });
    closeCourseDetail();
    tabs.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-active",button.dataset.coursePanel === panelId);
    });
  }

  async function loadCoursePanel(panelId) {
    if (!activeCourse) return;
    setCoursePanel(panelId);
    const args = [activeCourse.id,activeCourse.name];
    if (panelId === "courseLessonsSection") await window.loadLessons?.(...args);
    if (panelId === "courseMaterialsSection") await window.loadMaterials?.(...args);
    if (panelId === "courseAssignmentsSection") await window.loadAssignments?.(...args);
    if (panelId === "journalSection") await window.loadJournal?.(...args);
    workspace.scrollIntoView({ behavior:"smooth",block:"start" });
  }

  async function openCourse(course) {
    activeCourse = course;
    byId("teacherCourseWorkspaceTitle").textContent = course.name;
    workspace.hidden = false;
    await loadCoursePanel("courseLessonsSection");
  }

  tabs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click",() => loadCoursePanel(button.dataset.coursePanel));
  });
  byId("closeCourseWorkspaceButton").addEventListener("click",() => {
    workspace.hidden = true;
    byId("coursesList").scrollIntoView({ behavior:"smooth",block:"start" });
  });
  document.querySelectorAll("[data-open-teacher-view]").forEach((button) => {
    button.addEventListener("click",() => activateView(button.dataset.openTeacherView));
  });

  studentTabs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click",() => showStudentPanel(button.dataset.studentPanel));
  });
  if (groupSection) groupBackButton.addEventListener("click",() => showStudentPanel("teacherGroupsPanel"));
  if (studentSection) studentBackButton.addEventListener("click",openGroupDetails);
  drawerBackdrop.addEventListener("click",closeCourseDetail);
  document.addEventListener("keydown",(event) => {
    if (event.key === "Escape" && !drawerBackdrop.hidden) closeCourseDetail();
  });

  window.TeacherUI = {
    activateView,
    openCourse,
    setCoursePanel,
    openCourseDetail,
    closeCourseDetail,
    openGroupDetails,
    openStudentDetails
  };
})();
