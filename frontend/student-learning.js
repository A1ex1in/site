"use strict";

const apiUrl = window.location.port === "3001" ? "http://127.0.0.1:3000" : window.location.origin;
const app = document.getElementById("studentApp");
const message = document.getElementById("message");
const progress = document.getElementById("learningProgress");

const state = {
  profile: null,
  courses: [],
  path: null,
  moduleIndex: 0,
  itemIndex: 0
};

const typeLabels = {
  lecture: "Лекция",
  presentation: "Презентация",
  methodical: "Методический материал",
  practical: "Практическое занятие",
  laboratory: "Лабораторная работа",
  test: "Тестирование",
  other: "Материал"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function formatDate(value, includeTime = false) {
  if (!value) return "не указан";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", includeTime
    ? { day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" }
    : { day:"2-digit", month:"long", year:"numeric" });
}

function showMessage(text) {
  message.textContent = text || "";
  if (text) window.setTimeout(() => {
    if (message.textContent === text) message.textContent = "";
  }, 5000);
}

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`,{ credentials:"include",...options });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    window.location.href = "login.html";
    throw new Error("Требуется вход");
  }
  if (!response.ok) throw new Error(data.error || "Ошибка запроса");
  return data;
}

function setProgress(value) {
  if (value == null) {
    progress.hidden = true;
    return;
  }
  progress.hidden = false;
  progress.querySelector("span").style.width = `${Math.max(2,Math.min(100,value))}%`;
}

function scrollTop() {
  window.scrollTo({ top:0, behavior:"auto" });
}

function pushView(view, details = {}) {
  window.history.pushState({ eduView:view, ...details },"",window.location.pathname);
}

function replaceView(view, details = {}) {
  window.history.replaceState({ eduView:view, ...details },"",window.location.pathname);
}

function courseTitle() {
  return state.path?.course?.discipline_name || "Учебный курс";
}

function currentModule() {
  return state.path?.modules?.[state.moduleIndex] || null;
}

function moduleItems(module = currentModule()) {
  return (module?.lessons || []).flatMap((lesson) => lesson.items.map((item) => ({ ...item, lesson })));
}

function itemStatus(item) {
  if (item.kind === "material") return { text:"Материал", className:"is-material" };
  if (item.submission_status === "graded") return { text:"Проверено", className:"is-done" };
  if (item.submission_status === "submitted") return { text:"На проверке", className:"is-waiting" };
  if (item.submission_status === "returned") return { text:"На доработке", className:"is-warning" };
  if (item.submission_status === "draft") return { text:"В работе", className:"is-progress" };
  return { text:"Задание", className:"is-assignment" };
}

function updateAssignmentStatus(assignmentId, status) {
  state.path?.modules?.forEach((module) => module.lessons.forEach((lesson) => lesson.items.forEach((item) => {
    if (item.kind === "assignment" && String(item.id) === String(assignmentId)) item.submission_status = status;
  })));
}

function bindBack(buttonId, handler) {
  document.getElementById(buttonId)?.addEventListener("click",handler);
}

function renderDashboard() {
  scrollTop();
  setProgress(null);
  const firstName = state.profile?.firstName || "студент";
  const fullName = [state.profile?.lastName,state.profile?.firstName,state.profile?.middleName].filter(Boolean).join(" ");
  const today = new Intl.DateTimeFormat("ru-RU",{ weekday:"long",day:"numeric",month:"long" }).format(new Date());
  app.className = "learning-app learning-app--dashboard";
  app.innerHTML = `
    <section class="student-hero">
      <p class="student-eyebrow">Личный кабинет</p>
      <h1>Здравствуйте, ${escapeHtml(firstName)}</h1>
      <p>Здесь собраны ваши курсы, материалы и задания.</p>
    </section>
    <section class="student-summary" aria-label="Краткая информация">
      <article class="summary-card summary-card--accent"><span class="summary-icon">↗</span><div><strong>Продолжайте обучение</strong><p>Откройте курс и вернитесь к последнему модулю.</p></div></article>
      <article class="summary-card"><div class="summary-row"><strong>Сегодня</strong><span>›</span></div><p class="summary-date">${escapeHtml(today)}</p><small>Все учебные материалы доступны в разделе курсов</small></article>
      <article class="summary-card"><span class="summary-chip">Профиль</span><strong>${escapeHtml(fullName || "Студент")}</strong><p>${escapeHtml(state.profile?.group?.name || "Группа не назначена")}</p></article>
    </section>
    <section class="courses-section" id="coursesSection">
      <div class="section-title-row"><div><p class="student-eyebrow">Учебный план</p><h2>Мои курсы</h2></div><span>${state.courses.length}</span></div>
      <div class="course-grid" id="courseGrid"></div>
    </section>`;

  const grid = document.getElementById("courseGrid");
  if (state.courses.length === 0) {
    grid.innerHTML = '<div class="learning-empty"><strong>Курсов пока нет</strong><p>Когда преподаватель назначит курс вашей группе, он появится здесь.</p></div>';
    return;
  }
  state.courses.forEach((course,index) => {
    const teacher = [course.teacher_last_name,course.teacher_first_name,course.teacher_middle_name].filter(Boolean).join(" ");
    const card = document.createElement("button");
    card.type = "button";
    card.className = `course-card course-card--${(index % 4) + 1}`;
    card.innerHTML = `
      <span class="course-art"><span>${escapeHtml((course.discipline_code || course.discipline_name).slice(0,3).toUpperCase())}</span></span>
      <span class="course-card-body"><small>${escapeHtml(course.academic_year)} · ${course.semester} семестр</small><strong>${escapeHtml(course.discipline_name)}</strong><span>${escapeHtml(teacher || "Преподаватель не указан")}</span><em>Открыть курс <b>→</b></em></span>`;
    card.addEventListener("click",() => openCourse(course.id));
    grid.appendChild(card);
  });
}

async function openCourse(courseId) {
  app.innerHTML = '<div class="learning-loader">Загружаем структуру курса…</div>';
  try {
    state.path = await request(`/api/student/courses/${courseId}/learning-path`);
    state.moduleIndex = 0;
    pushView("course",{ courseId });
    renderCourse();
  } catch (error) {
    showMessage(error.message);
    renderDashboard();
  }
}

function renderCourse() {
  scrollTop();
  setProgress(0);
  const course = state.path.course;
  const teacher = [course.teacher_last_name,course.teacher_first_name,course.teacher_middle_name].filter(Boolean).join(" ");
  app.className = "learning-app learning-app--course";
  app.innerHTML = `
    <section class="course-hero">
      <div class="learning-container">
        <button class="crumb-button" id="courseHomeButton" type="button">← Моё обучение</button>
        <p class="course-kicker">${escapeHtml(course.discipline_code || "Учебный курс")}</p>
        <h1>${escapeHtml(course.discipline_name)}</h1>
        <p>${escapeHtml(course.academic_year)} · ${course.semester} семестр · ${escapeHtml(course.group_name)}</p>
        <small>Преподаватель: ${escapeHtml(teacher || "не указан")}</small>
      </div>
    </section>
    <section class="learning-container course-content">
      <div class="course-intro-card"><div><span>Учебная траектория</span><strong>Проходите модули по порядку</strong><p>Внутри каждого модуля находятся занятия, материалы и практические задания.</p></div><div class="course-ring">${state.path.modules.length}</div></div>
      <div class="section-title-row"><div><p class="student-eyebrow">Содержание</p><h2>Модули курса</h2></div></div>
      <div class="module-grid" id="moduleGrid"></div>
    </section>`;
  bindBack("courseHomeButton",() => window.history.back());
  const grid = document.getElementById("moduleGrid");
  if (state.path.modules.length === 0) {
    grid.innerHTML = '<div class="learning-empty"><strong>Курс пока наполняется</strong><p>Преподаватель ещё не добавил модули.</p></div>';
    return;
  }
  state.path.modules.forEach((module,index) => {
    const items = moduleItems(module);
    const done = items.filter((item) => ["submitted","graded"].includes(item.submission_status)).length;
    const percent = items.length ? Math.round(done / items.length * 100) : 0;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "module-card";
    card.innerHTML = `<span class="module-number">${String(index + 1).padStart(2,"0")}</span><span class="module-card-content"><small>${module.lessons.length} ${module.lessons.length === 1 ? "занятие" : "занятий"}</small><strong>${escapeHtml(module.title)}</strong><p>${escapeHtml(module.description || "Материалы и задания учебного модуля")}</p><span class="module-meter"><i style="width:${percent}%"></i></span><em>${items.length} элементов · ${percent}% выполнено</em></span><b>→</b>`;
    card.addEventListener("click",() => {
      state.moduleIndex = index;
      pushView("module",{ moduleIndex:index });
      renderModule();
    });
    grid.appendChild(card);
  });
}

function renderModule() {
  const module = currentModule();
  if (!module) return renderCourse();
  setProgress(10);
  scrollTop();
  app.className = "learning-app learning-app--module";
  app.innerHTML = `
    <section class="module-hero">
      <div class="learning-container">
        <button class="crumb-button crumb-button--dark" id="moduleBackButton" type="button">← Модули курса</button>
        <p class="course-kicker">${escapeHtml(courseTitle())}</p>
        <h1>${escapeHtml(module.title)}</h1>
        <p>${escapeHtml(module.description || "Материалы и задания модуля")}</p>
      </div>
    </section>
    <section class="learning-container module-content">
      <button class="module-content-back" id="moduleContentBackButton" type="button">← Вернуться к модулям курса</button>
      <h2>${escapeHtml(module.title)}</h2>
      <div class="lesson-accordion" id="lessonAccordion"></div>
    </section>`;
  bindBack("moduleBackButton",() => window.history.back());
  bindBack("moduleContentBackButton",() => window.history.back());
  const accordion = document.getElementById("lessonAccordion");
  if (module.lessons.length === 0) {
    accordion.innerHTML = '<div class="learning-empty"><strong>В модуле пока нет занятий</strong></div>';
    return;
  }
  module.lessons.forEach((lesson,lessonIndex) => {
    const completed = lesson.items.filter((item) => ["submitted","graded"].includes(item.submission_status)).length;
    const section = document.createElement("section");
    section.className = "lesson-panel";
    section.innerHTML = `
      <button class="lesson-toggle" type="button" aria-expanded="${lessonIndex === 0}">
        <span><small>${escapeHtml(typeLabels[lesson.lesson_type] || lesson.lesson_type)}${lesson.lesson_date ? ` · ${escapeHtml(formatDate(lesson.lesson_date))}` : ""}</small><strong>${escapeHtml(lesson.topic || "Занятие без названия")}</strong></span>
        <span class="lesson-count">${completed}/${lesson.items.length}</span><b>⌄</b>
      </button>
      <div class="lesson-items" ${lessonIndex === 0 ? "" : "hidden"}></div>`;
    const toggle = section.querySelector(".lesson-toggle");
    const itemsContainer = section.querySelector(".lesson-items");
    toggle.addEventListener("click",() => {
      const opening = itemsContainer.hidden;
      itemsContainer.hidden = !opening;
      toggle.setAttribute("aria-expanded",String(opening));
    });
    if (lesson.items.length === 0) {
      itemsContainer.innerHTML = '<p class="lesson-empty">Материалы пока не опубликованы.</p>';
    } else {
      lesson.items.forEach((item) => {
        const status = itemStatus(item);
        const globalIndex = moduleItems(module).findIndex((candidate) => candidate.kind === item.kind && String(candidate.id) === String(item.id));
        const row = document.createElement("button");
        row.type = "button";
        row.className = "lesson-item";
        row.innerHTML = `<span class="lesson-item-icon">${item.kind === "assignment" ? "✎" : "▷"}</span><span><strong>${escapeHtml(item.title)}</strong><small>${item.kind === "assignment" ? `до ${escapeHtml(formatDate(item.deadline,true))}` : escapeHtml(typeLabels[item.material_type] || "Учебный материал")}</small></span><em class="${status.className}">${status.text}</em><b>→</b>`;
        row.addEventListener("click",() => {
          state.itemIndex = globalIndex;
          pushView("item",{ moduleIndex:state.moduleIndex, itemIndex:globalIndex });
          openCurrentItem();
        });
        itemsContainer.appendChild(row);
      });
    }
    accordion.appendChild(section);
  });
}

function itemNavigation(item) {
  const items = moduleItems();
  const percent = items.length ? Math.round((state.itemIndex + 1) / items.length * 100) : 0;
  setProgress(percent);
  return `
    <div class="item-breadcrumbs"><button id="itemModuleButton" type="button">${escapeHtml(currentModule().title)}</button><span>/</span><span>${escapeHtml(item.lesson.topic || "Занятие")}</span></div>
    <div class="item-titlebar"><button class="item-arrow" id="previousItemButton" type="button" ${state.itemIndex === 0 ? "disabled" : ""}>‹</button><h1>${escapeHtml(item.title)}</h1><button class="item-arrow" id="nextItemButton" type="button" ${state.itemIndex >= items.length - 1 ? "disabled" : ""}>›</button></div>`;
}

function bindItemNavigation() {
  bindBack("itemModuleButton",() => window.history.back());
  document.getElementById("previousItemButton")?.addEventListener("click",() => {
    if (state.itemIndex > 0) {
      state.itemIndex -= 1;
      replaceView("item",{ moduleIndex:state.moduleIndex, itemIndex:state.itemIndex });
      openCurrentItem();
    }
  });
  document.getElementById("nextItemButton")?.addEventListener("click",() => {
    if (state.itemIndex < moduleItems().length - 1) {
      state.itemIndex += 1;
      replaceView("item",{ moduleIndex:state.moduleIndex, itemIndex:state.itemIndex });
      openCurrentItem();
    }
  });
}

function openCurrentItem() {
  const item = moduleItems()[state.itemIndex];
  if (!item) return renderModule();
  if (item.kind === "assignment" && item.submission_status) renderAssignment(item);
  else if (item.kind === "assignment") renderAssignmentIntro(item);
  else renderMaterial(item);
  scrollTop();
}

async function renderMaterial(item) {
  app.className = "learning-app learning-app--item";
  app.innerHTML = `<section class="item-shell"><div class="learning-container">${itemNavigation(item)}<article class="material-view"><div class="material-stage"><span class="material-stage-icon">${item.material_type === "presentation" ? "▤" : "▷"}</span><p>${escapeHtml(typeLabels[item.material_type] || "Учебный материал")}</p><h2>${escapeHtml(item.title)}</h2></div><div class="material-body"><p>${escapeHtml(item.description || "Описание материала не добавлено.")}</p><div class="download-list" id="materialDownloads"><span>Загружаем файлы…</span></div><section class="notes-card"><label for="studentNote">Личная заметка</label><div><textarea id="studentNote" placeholder="Что важно запомнить?"></textarea><button id="saveNoteButton" type="button">Сохранить</button></div><small>Заметка хранится только в этом браузере.</small></section></div></article></div></section>`;
  bindItemNavigation();
  const noteKey = `edu-note-${item.id}`;
  const note = document.getElementById("studentNote");
  note.value = localStorage.getItem(noteKey) || "";
  document.getElementById("saveNoteButton").addEventListener("click",() => {
    localStorage.setItem(noteKey,note.value);
    showMessage("Заметка сохранена");
  });
  try {
    const files = await request(`/api/student/materials/${item.id}/files`);
    const container = document.getElementById("materialDownloads");
    container.innerHTML = files.length ? files.map((file) => `<a href="${apiUrl}/api/student/files/${file.id}/download">↓ ${escapeHtml(file.original_name)}</a>`).join("") : "<span>Прикреплённых файлов нет.</span>";
  } catch (error) {
    document.getElementById("materialDownloads").textContent = error.message;
  }
}

function renderAssignmentIntro(item) {
  app.className = "learning-app learning-app--item";
  app.innerHTML = `<section class="item-shell"><div class="learning-container">${itemNavigation(item)}<article class="assignment-intro"><div class="assignment-illustration"><span>✓</span><i></i><i></i><i></i></div><div><p class="student-eyebrow">Практическое задание</p><h2>Время для практики!</h2><p>${escapeHtml(item.description || "Ознакомьтесь с заданием, подготовьте решение и отправьте его преподавателю.")}</p><dl><div><dt>Максимальный балл</dt><dd>${escapeHtml(item.max_score)}</dd></div><div><dt>Срок выполнения</dt><dd>${escapeHtml(formatDate(item.deadline,true))}</dd></div></dl><button class="learning-primary" id="startAssignmentButton" type="button">Приступить к заданию</button></div></article></div></section>`;
  bindItemNavigation();
  document.getElementById("startAssignmentButton").addEventListener("click",async () => {
    const button = document.getElementById("startAssignmentButton");
    button.disabled = true;
    try {
      const current = await request(`/api/student/assignments/${item.id}/submission`);
      if (!current.submission) {
        const data = await request(`/api/student/assignments/${item.id}/submission`,{
          method:"PUT",
          headers:{ "Content-Type":"application/json" },
          body:JSON.stringify({ studentComment:"" })
        });
        updateAssignmentStatus(item.id,data.submission.status);
        showMessage("Вы приступили к заданию — создан черновик работы");
      } else {
        updateAssignmentStatus(item.id,current.submission.status);
      }
      replaceView("assignment",{ moduleIndex:state.moduleIndex, itemIndex:state.itemIndex });
      renderAssignment({ ...item, submission_status:current.submission?.status || "draft" });
    } catch (error) {
      showMessage(error.message);
      button.disabled = false;
    }
  });
}

async function renderAssignment(item) {
  app.className = "learning-app learning-app--item";
  app.innerHTML = `<section class="item-shell"><div class="learning-container">${itemNavigation(item)}<article class="assignment-page"><header><p class="student-eyebrow">Задание</p><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description || "Описание задания не добавлено.")}</p><div class="assignment-meta"><span>Максимум: <strong>${escapeHtml(item.max_score)}</strong></span><span>Срок: <strong>${escapeHtml(formatDate(item.deadline,true))}</strong></span></div></header><section class="assignment-callout"><strong>Отправьте решение преподавателю</strong><p>Добавьте пояснение, ссылку или файл. До отправки работу можно сохранять как черновик.</p></section><div class="download-list" id="assignmentDownloads"><span>Загружаем файлы задания…</span></div><section class="submission-card" id="submissionCard"><div class="learning-loader">Загружаем вашу работу…</div></section></article></div></section>`;
  bindItemNavigation();
  try {
    const [submissionData,files,submissionFiles] = await Promise.all([
      request(`/api/student/assignments/${item.id}/submission`),
      request(`/api/student/assignments/${item.id}/files`),
      request(`/api/student/assignments/${item.id}/submission/files`)
    ]);
    renderAssignmentDownloads(item,files);
    renderSubmissionEditor(item,submissionData.submission,submissionFiles);
  } catch (error) {
    showMessage(error.message);
    document.getElementById("submissionCard").textContent = error.message;
  }
}

function renderAssignmentDownloads(item,files) {
  const container = document.getElementById("assignmentDownloads");
  container.innerHTML = files.length ? files.map((file) => `<a href="${apiUrl}/api/student/assignments/${item.id}/files/${file.source}/${file.id}/download">↓ ${escapeHtml(file.original_name)}${file.material_title ? ` · ${escapeHtml(file.material_title)}` : ""}</a>`).join("") : "<span>Файлов к заданию нет.</span>";
}

function submissionLabel(status) {
  return ({ draft:"В работе",submitted:"На проверке",returned:"Возвращено на доработку",graded:"Проверено" })[status] || "Не начато";
}

function renderSubmissionEditor(item,submission,files) {
  const editable = !submission || ["draft","returned"].includes(submission.status);
  const card = document.getElementById("submissionCard");
  card.innerHTML = `
    <div class="submission-heading"><div><p class="student-eyebrow">Моя работа</p><h3>Отправка задания</h3></div><span class="submission-status">${escapeHtml(submissionLabel(submission?.status))}</span></div>
    ${submission?.teacher_comment || submission?.score != null ? `<div class="teacher-feedback"><strong>Ответ преподавателя${submission.score != null ? ` · ${escapeHtml(submission.score)} балла` : ""}</strong><p>${escapeHtml(submission.teacher_comment || "Работа проверена")}</p></div>` : ""}
    <form id="submissionEditor">
      <label>Комментарий или ссылка<textarea id="submissionComment" ${editable ? "" : "disabled"} placeholder="Расскажите о решении или добавьте ссылку">${escapeHtml(submission?.student_comment || "")}</textarea></label>
      <div class="submission-actions"><button class="learning-secondary" type="submit" ${editable ? "" : "disabled"}>Сохранить черновик</button><label class="file-button ${editable ? "" : "is-disabled"}">Прикрепить файл<input id="submissionFile" type="file" ${editable ? "" : "disabled"}></label><button class="learning-primary" id="submitWorkButton" type="button" ${editable && submission ? "" : "disabled"}>Отправить работу</button></div>
    </form>
    <div class="submission-files" id="submissionFiles"></div>
    ${submission?.submitted_at ? `<small>Отправлено ${escapeHtml(formatDate(submission.submitted_at,true))}</small>` : ""}`;
  renderSubmissionFiles(item,files,editable);

  document.getElementById("submissionEditor").addEventListener("submit",async (event) => {
    event.preventDefault();
    try {
      const data = await request(`/api/student/assignments/${item.id}/submission`,{
        method:"PUT",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ studentComment:document.getElementById("submissionComment").value })
      });
      showMessage(data.message);
      await refreshSubmission(item);
    } catch (error) { showMessage(error.message); }
  });

  document.getElementById("submissionFile").addEventListener("change",async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (!submission) {
        await request(`/api/student/assignments/${item.id}/submission`,{
          method:"PUT",headers:{ "Content-Type":"application/json" },body:JSON.stringify({ studentComment:document.getElementById("submissionComment").value })
        });
      }
      const body = new FormData();
      body.append("file",file);
      const data = await request(`/api/student/assignments/${item.id}/submission/files`,{ method:"POST",body });
      showMessage(data.message);
      await refreshSubmission(item);
    } catch (error) { showMessage(error.message); }
  });

  document.getElementById("submitWorkButton").addEventListener("click",async () => {
    if (!confirm("Отправить работу преподавателю? После отправки изменить её будет нельзя.")) return;
    try {
      const data = await request(`/api/student/assignments/${item.id}/submission/submit`,{ method:"POST" });
      showMessage(data.message);
      await refreshSubmission(item);
    } catch (error) { showMessage(error.message); }
  });
}

function renderSubmissionFiles(item,files,editable) {
  const container = document.getElementById("submissionFiles");
  if (!files.length) {
    container.innerHTML = "<span>Файлы решения пока не добавлены.</span>";
    return;
  }
  files.forEach((file) => {
    const row = document.createElement("div");
    row.innerHTML = `<a href="${apiUrl}/api/student/submission-files/${file.id}/download">${escapeHtml(file.original_name)}</a>`;
    if (editable) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Удалить";
      button.addEventListener("click",async () => {
        try {
          const data = await request(`/api/student/submission-files/${file.id}`,{ method:"DELETE" });
          showMessage(data.message);
          await refreshSubmission(item);
        } catch (error) { showMessage(error.message); }
      });
      row.appendChild(button);
    }
    container.appendChild(row);
  });
}

async function refreshSubmission(item) {
  const [submissionData,files] = await Promise.all([
    request(`/api/student/assignments/${item.id}/submission`),
    request(`/api/student/assignments/${item.id}/submission/files`)
  ]);
  renderSubmissionEditor(item,submissionData.submission,files);
}

function renderProfile() {
  scrollTop();
  setProgress(null);
  const student = state.profile;
  const fullName = [student.lastName,student.firstName,student.middleName].filter(Boolean).join(" ");
  app.className = "learning-app";
  app.innerHTML = `<section class="learning-container profile-page"><button class="crumb-button" id="profileBackButton" type="button">← Моё обучение</button><div class="profile-card"><span class="profile-avatar">${escapeHtml((student.firstName?.[0] || "С") + (student.lastName?.[0] || ""))}</span><div><p class="student-eyebrow">Профиль студента</p><h1>${escapeHtml(fullName)}</h1><dl><div><dt>E-mail</dt><dd>${escapeHtml(student.email)}</dd></div><div><dt>Учебная группа</dt><dd>${escapeHtml(student.group?.name || "Не назначена")}</dd></div><div><dt>Номер студента</dt><dd>${escapeHtml(student.studentNumber || "Не указан")}</dd></div></dl></div></div></section>`;
  bindBack("profileBackButton",() => window.history.back());
}

async function logout() {
  try {
    await request("/api/auth/logout",{ method:"POST" });
  } catch (error) {
    console.error(error);
  }
  window.location.href = "login.html";
}

function goToDashboard() {
  pushView("dashboard");
  renderDashboard();
}

function goToProfile() {
  pushView("profile");
  renderProfile();
}

document.getElementById("homeLink").addEventListener("click",(event) => { event.preventDefault(); goToDashboard(); });
document.getElementById("coursesNavButton").addEventListener("click",goToDashboard);
document.getElementById("profileNavButton").addEventListener("click",goToProfile);
document.getElementById("avatarButton").addEventListener("click",goToProfile);
document.getElementById("logoutButton").addEventListener("click",logout);
message.addEventListener("click",() => { message.textContent = ""; });

async function init() {
  try {
    const [profileData,courses] = await Promise.all([
      request("/api/student/profile"),
      request("/api/student/courses")
    ]);
    state.profile = profileData.student;
    state.courses = courses;
    const initials = `${state.profile.firstName?.[0] || "С"}${state.profile.lastName?.[0] || ""}`.toUpperCase();
    document.getElementById("avatarButton").textContent = initials;
    window.history.replaceState({ eduView:"dashboard", base:true },"",window.location.pathname);
    window.history.pushState({ eduView:"dashboard", guard:true },"",window.location.pathname);
    renderDashboard();
  } catch (error) {
    app.innerHTML = `<div class="learning-empty"><strong>Не удалось открыть кабинет</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

window.addEventListener("popstate",(event) => {
  const view = event.state?.eduView || "dashboard";
  if (view === "course" && state.path) {
    renderCourse();
    return;
  }
  if (view === "module" && state.path) {
    state.moduleIndex = Number(event.state.moduleIndex) || 0;
    renderModule();
    return;
  }
  if ((view === "item" || view === "assignment") && state.path) {
    state.moduleIndex = Number(event.state.moduleIndex) || 0;
    state.itemIndex = Number(event.state.itemIndex) || 0;
    const item = moduleItems()[state.itemIndex];
    if (!item) return renderModule();
    if (view === "assignment") renderAssignment(item);
    else openCurrentItem();
    return;
  }
  if (view === "profile") {
    renderProfile();
    return;
  }
  renderDashboard();
  if (event.state?.base) {
    window.history.pushState({ eduView:"dashboard", guard:true },"",window.location.pathname);
  }
});

init();
