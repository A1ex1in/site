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
  homeView.appendChild(sectionHeading("Рабочий процесс","С чего начать","Три шага от пустого курса до готового задания для студентов."));
  const steps = element("div","teacher-steps");
  steps.innerHTML = `
    <article><b>1</b><div><strong>Выберите курс</strong><p>Откройте «Курсы» и нажмите на нужную карточку.</p></div></article>
    <article><b>2</b><div><strong>Соберите структуру</strong><p>Создайте модули и занятия в нужном порядке.</p></div></article>
    <article><b>3</b><div><strong>Добавьте содержимое</strong><p>Привяжите материалы и задания, затем опубликуйте их.</p></div></article>`;
  homeView.appendChild(steps);
  const homeActions = element("div","teacher-home-actions");
  homeActions.innerHTML = '<button type="button" data-open-teacher-view="#teacherCoursesView">Перейти к курсам</button><button type="button" data-open-teacher-view="#teacherStudentsView">Открыть студентов</button>';
  homeView.appendChild(homeActions);

  const coursesView = element("section","teacher-view");
  coursesView.id = "teacherCoursesView";
  coursesView.hidden = true;
  coursesView.appendChild(sectionHeading("Обучение","Учебные курсы","Выберите курс — после этого появятся четыре последовательных раздела работы."));
  const creationGrid = element("div","teacher-create-grid");
  creationGrid.appendChild(createPanel("Новая дисциплина","Название и короткий код предмета",[byId("disciplineForm"),byId("disciplinesList")]));
  creationGrid.appendChild(createPanel("Новый курс","Дисциплина, группа, учебный год и семестр",[byId("courseForm")]));
  coursesView.appendChild(creationGrid);
  coursesView.appendChild(blockHeading("Ваши курсы","Выберите курс для работы","Все действия с содержимым откроются внутри выбранного курса."));
  coursesView.appendChild(byId("coursesList"));

  const workspace = element("section","teacher-course-workspace");
  workspace.id = "teacherCourseWorkspace";
  workspace.hidden = true;
  const workspaceHeader = element("header","teacher-course-header");
  workspaceHeader.innerHTML = '<button id="closeCourseWorkspaceButton" type="button">← Все курсы</button><span>Выбранный курс</span><h2 id="teacherCourseWorkspaceTitle">Курс</h2><p>Работайте по порядку: структура → материалы → задания → журнал.</p>';
  workspace.appendChild(workspaceHeader);
  const tabs = element("nav","teacher-course-tabs");
  tabs.setAttribute("aria-label","Разделы курса");
  tabs.innerHTML = '<button type="button" data-course-panel="courseLessonsSection">1. Структура</button><button type="button" data-course-panel="courseMaterialsSection">2. Материалы</button><button type="button" data-course-panel="courseAssignmentsSection">3. Задания</button><button type="button" data-course-panel="journalSection">4. Журнал</button>';
  workspace.appendChild(tabs);

  const mainCoursePanelIds = ["courseLessonsSection","courseMaterialsSection","courseAssignmentsSection","journalSection"];
  const detailPanelIds = ["attendanceEditorSection","gradeItemsSection","materialFilesSection","assignmentFilesSection","submissionsSection","submissionDetailsSection"];
  [...mainCoursePanelIds,...detailPanelIds].forEach((id) => {
    const panel = byId(id);
    if (panel) workspace.appendChild(panel);
  });

  function collapseCourseForm(sectionId,formId,listId,title,subtitle,listTitle = "") {
    const section = byId(sectionId);
    const form = byId(formId);
    const list = byId(listId);
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

  collapseCourseForm("courseLessonsSection","moduleForm","modulesList","Добавить модуль","Крупный раздел курса","Модули курса");
  collapseCourseForm("courseLessonsSection","lessonForm","lessonsList","Добавить занятие","Лекция, практика или лабораторная","Занятия курса");
  collapseCourseForm("courseMaterialsSection","materialForm","materialsList","Добавить материал","Конспект, презентация или методичка");
  collapseCourseForm("courseAssignmentsSection","assignmentForm","assignmentsList","Добавить задание","Практика или проверочная работа");
  collapseCourseForm("gradeItemsSection","gradeItemForm","gradeItemsList","Добавить оценивание","Ответ, работа или тест");
  coursesView.appendChild(workspace);

  const studentsView = element("section","teacher-view");
  studentsView.id = "teacherStudentsView";
  studentsView.hidden = true;
  studentsView.appendChild(sectionHeading("Учащиеся","Студенты и группы","Подтвердите новые заявки, затем откройте группу и карточку студента."));
  const studentsGrid = element("div","teacher-student-grid");
  const pendingSurface = element("section","teacher-surface");
  pendingSurface.appendChild(blockHeading("Новые","Заявки на регистрацию"));
  pendingSurface.appendChild(byId("studentsList"));
  studentsGrid.appendChild(pendingSurface);
  studentsGrid.appendChild(createPanel("Добавить группу","Создание новой учебной группы",[byId("groupForm")]));
  studentsView.appendChild(studentsGrid);
  const groupsSurface = element("section","teacher-surface");
  groupsSurface.appendChild(blockHeading("Список","Учебные группы","Откройте группу, чтобы увидеть её студентов."));
  groupsSurface.appendChild(byId("groupsList"));
  studentsView.appendChild(groupsSurface);
  ["groupStudentsSection","studentDetailsSection"].forEach((id) => {
    const panel = byId(id);
    if (panel) {
      panel.classList.add("teacher-surface");
      studentsView.appendChild(panel);
    }
  });

  content.append(homeView,coursesView,studentsView);

  let activeCourse = null;

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
    detailPanelIds.forEach((id) => {
      const panel = byId(id);
      if (panel) panel.hidden = true;
    });
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

  window.TeacherUI = { activateView,openCourse,setCoursePanel,getActiveCourse:() => activeCourse };
})();
