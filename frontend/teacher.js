const apiUrl = window.location.port === "3001" ? "http://127.0.0.1:3000" : window.location.origin;
const studentsList = document.getElementById("studentsList");
const message = document.getElementById("message");
const logoutButton = document.getElementById("logoutButton");
const groupForm = document.getElementById("groupForm");
const groupNameInput = document.getElementById("groupName");
const groupDescriptionInput = document.getElementById("groupDescription");
const groupsList = document.getElementById("groupsList");
const groupStudentsSection = document.getElementById("groupStudentsSection");
const selectedGroupName = document.getElementById("selectedGroupName");
const groupStudentsList = document.getElementById("groupStudentsList");
const studentDetailsSection = document.getElementById("studentDetailsSection");
const studentDetails = document.getElementById("studentDetails");
const changeGroupForm = document.getElementById("changeGroupForm");
const studentGroupSelect = document.getElementById("studentGroupSelect");
const studentStatusButton = document.getElementById("studentStatusButton");
const disciplineForm = document.getElementById("disciplineForm");
const disciplineNameInput = document.getElementById("disciplineName");
const disciplineCodeInput = document.getElementById("disciplineCode");
const disciplineDescriptionInput = document.getElementById("disciplineDescription");
const disciplinesList = document.getElementById("disciplinesList");
const courseForm = document.getElementById("courseForm");
const courseDiscipline = document.getElementById("courseDiscipline");
const courseGroup = document.getElementById("courseGroup");
const courseAcademicYear = document.getElementById("courseAcademicYear");
const courseSemester = document.getElementById("courseSemester");
const coursesList = document.getElementById("coursesList");
const courseMaterialsSection = document.getElementById("courseMaterialsSection");
const courseMaterialsTitle = document.getElementById("courseMaterialsTitle");
const materialForm = document.getElementById("materialForm");
const materialTitle = document.getElementById("materialTitle");
const materialType = document.getElementById("materialType");
const materialLesson = document.getElementById("materialLesson");
const materialDescription = document.getElementById("materialDescription");
const materialsList = document.getElementById("materialsList");
const materialFilesSection = document.getElementById("materialFilesSection");
const materialFilesTitle = document.getElementById("materialFilesTitle");
const materialFileForm = document.getElementById("materialFileForm");
const materialFileInput = document.getElementById("materialFileInput");
const materialFilesList = document.getElementById("materialFilesList");
const courseAssignmentsSection = document.getElementById("courseAssignmentsSection");
const courseAssignmentsTitle = document.getElementById("courseAssignmentsTitle");
const assignmentForm = document.getElementById("assignmentForm");
const assignmentTitle = document.getElementById("assignmentTitle");
const assignmentDescription = document.getElementById("assignmentDescription");
const assignmentLesson = document.getElementById("assignmentLesson");
const assignmentDeadline = document.getElementById("assignmentDeadline");
const assignmentMaxScore = document.getElementById("assignmentMaxScore");
const assignmentsList = document.getElementById("assignmentsList");
const assignmentFilesSection = document.getElementById("assignmentFilesSection");
const assignmentFilesTitle = document.getElementById("assignmentFilesTitle");
const assignmentFileForm = document.getElementById("assignmentFileForm");
const assignmentFileInput = document.getElementById("assignmentFileInput");
const assignmentFilesList = document.getElementById("assignmentFilesList");
const assignmentMaterialFilesList = document.getElementById("assignmentMaterialFilesList");
const submissionsSection = document.getElementById("submissionsSection");
const submissionsTitle = document.getElementById("submissionsTitle");
const submissionsList = document.getElementById("submissionsList");
const submissionDetailsSection = document.getElementById("submissionDetailsSection");
const submissionDetailsTitle = document.getElementById("submissionDetailsTitle");
const submissionStudent = document.getElementById("submissionStudent");
const submissionStatus = document.getElementById("submissionStatus");
const submissionComment = document.getElementById("submissionComment");
const submissionSubmittedAt = document.getElementById("submissionSubmittedAt");
const submissionLate = document.getElementById("submissionLate");
const submissionFilesList = document.getElementById("submissionFilesList");
const teacherSubmissionComment = document.getElementById("teacherSubmissionComment");
const submissionScoreInput = document.getElementById("submissionScoreInput");
const submissionMaxScore = document.getElementById("submissionMaxScore");
const returnSubmissionButton = document.getElementById("returnSubmissionButton");
const gradeSubmissionButton = document.getElementById("gradeSubmissionButton");
const journalSection = document.getElementById("journalSection");
const journalTitle = document.getElementById("journalTitle");
const journalContainer = document.getElementById("journalContainer");
const courseLessonsSection = document.getElementById("courseLessonsSection");
const courseLessonsTitle = document.getElementById("courseLessonsTitle");
const lessonForm = document.getElementById("lessonForm");
const moduleForm = document.getElementById("moduleForm");
const moduleTitle = document.getElementById("moduleTitle");
const moduleDescription = document.getElementById("moduleDescription");
const modulesList = document.getElementById("modulesList");
const lessonModule = document.getElementById("lessonModule");
const lessonDate = document.getElementById("lessonDate");
const lessonType = document.getElementById("lessonType");
const lessonTopic = document.getElementById("lessonTopic");
const lessonsList = document.getElementById("lessonsList");
const attendanceEditorSection = document.getElementById("attendanceEditorSection");
const attendanceEditorTitle = document.getElementById("attendanceEditorTitle");
const attendanceForm = document.getElementById("attendanceForm");
const attendanceStudentsList = document.getElementById("attendanceStudentsList");
const gradeItemsSection = document.getElementById("gradeItemsSection");
const gradeItemsTitle = document.getElementById("gradeItemsTitle");
const gradeItemForm = document.getElementById("gradeItemForm");
const gradeItemTitle = document.getElementById("gradeItemTitle");
const gradeItemType = document.getElementById("gradeItemType");
const gradeItemMaxScore = document.getElementById("gradeItemMaxScore");
const gradeItemsList = document.getElementById("gradeItemsList");
const assignmentGradeDate = document.getElementById("assignmentGradeDate");

let selectedSubmissionId = null;
let selectedSubmissionMaxScore = null;
let selectedMaterialId = null;
let selectedMaterialTitle = "";
let selectedCourseId = null;
let selectedCourseName = "";
let selectedStudentId = null;
let selectedGroupId = null;
let selectedStudentStatus = null;
let selectedAssignmentCourseId = null;
let selectedAssignmentCourseName = "";
let selectedAssignmentId = null;
let selectedAssignmentTitle = "";
let selectedSubmissionsAssignmentId = null;
let selectedSubmissionsAssignmentTitle = "";
let selectedLessonsCourseId = null;
let selectedLessonsCourseName = "";
let selectedLessonId = null;
let selectedAttendanceLessonId = null;
let selectedLessonTitle = "";

materialForm.addEventListener("submit",async (event) => {
  event.preventDefault();
  if (!selectedCourseId) {
    message.textContent = "Сначала выберите учебный курс.";
    return;
  }
  const title = materialTitle.value.trim();
  const description = materialDescription.value.trim();
  if (!title) {
    message.textContent = "Введите название материала.";
    return;
  }
  try {
    const response = await fetch(`${apiUrl}/api/teacher/courses/${selectedCourseId}/materials`,{
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        title,
        description,
        materialType: materialType.value,
        lessonId: materialLesson.value || null
      })
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка создания материала.";
      return;
    }
    message.textContent = data.message;
    materialForm.reset();
    await loadMaterials(selectedCourseId,selectedCourseName);
  } catch (error) {
    console.error("Ошибка создания материала:", error);
    message.textContent = "Не удалось создать материал.";
  }
});

courseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const disciplineId = courseDiscipline.value;
  const groupId = courseGroup.value;
  const academicYear = courseAcademicYear.value.trim();
  const semester = courseSemester.value;
  try {
    const response = await fetch(`${apiUrl}/api/teacher/courses`,{
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        disciplineId,
        groupId,
        academicYear,
        semester
      })
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка создания учебного курса.";
      return;
    }
    message.textContent = data.message;
    courseAcademicYear.value = "";
    courseSemester.value = "1";
    await loadCourses();
  } catch (error) {
    console.error("Ошибка создания учебного курса:", error);
    message.textContent = "Не удалось создать учебный курс.";
  }
});

logoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/logout`,
        {
          method: "POST",
          credentials: "include"
        }
      );
      if (!response.ok) {
        const data = await response.json();
        message.textContent = data.error || "Ошибка выхода.";
        return;
      }
      window.location.href = "login.html";
    } catch (error) {
      console.error(error);
      message.textContent = "Не удалось выйти из системы.";
    }
  }
);

groupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = groupNameInput.value.trim();
    const description = groupDescriptionInput.value.trim();
    if (!name) {
      message.textContent = "Введите название группы.";
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/api/teacher/groups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ name, description })
        }
      );
      const data = await response.json();
      if (!response.ok) {
        message.textContent = data.error || "Ошибка создания группы.";
        return;
      }
      message.textContent = data.message;
      groupForm.reset();
      await loadGroups();
    } catch (error) {
      console.error("Ошибка создания группы:", error);
      message.textContent = "Не удалось создать группу.";
    }
  }
);

changeGroupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedStudentId) {
      return;
    }
    const groupId = studentGroupSelect.value;
    try {
      const response = await fetch(`${apiUrl}/api/teacher/students/${selectedStudentId}/group`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            groupId
          })
        }
      );
      const data = await response.json();
      if (!response.ok) {
        message.textContent = data.error || "Ошибка изменения группы.";
        return;
      }
      message.textContent = data.message;
      await loadStudentDetails(selectedStudentId);
      await loadGroups();
      if (selectedGroupId) {
        await loadGroupStudents(selectedGroupId);
      }
    } catch (error) {
      console.error("Ошибка изменения группы:", error);
      message.textContent = "Не удалось изменить группу.";
    }
  }
);

studentStatusButton.addEventListener("click", async () => {
    if (!selectedStudentId) {
      return;
    }
    const newStatus = selectedStudentStatus === "blocked" ? "active" : "blocked";
    try {
      const response = await fetch(`${apiUrl}/api/teacher/students/${selectedStudentId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            status: newStatus
          })
        }
      );
      const data = await response.json();
      if (!response.ok) {
        message.textContent = data.error || "Ошибка изменения статуса.";
        return;
      }
      message.textContent = data.message;
      await loadStudentDetails(
        selectedStudentId
      );
      await loadGroups();
      if (selectedGroupId) {
        await loadGroupStudents(selectedGroupId);
      }
    } catch (error) {
      console.error("Ошибка изменения статуса:", error);
      message.textContent = "Не удалось изменить статус студента.";
    }
  }
);

disciplineForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = disciplineNameInput.value.trim();
    const code = disciplineCodeInput.value.trim();
    const description = disciplineDescriptionInput.value.trim();
    if (!name) {
      message.textContent = "Введите название дисциплины.";
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/api/teacher/disciplines`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name,
            code,
            description
          })
        }
      );
      const data = await response.json();
      if (!response.ok) {
        message.textContent = data.error || "Ошибка создания дисциплины.";
        return;
      }
      message.textContent = data.message;
      disciplineForm.reset();
      await loadDisciplines();
    } catch (error) {
      console.error("Ошибка создания дисциплины:", error);
      message.textContent = "Не удалось создать дисциплину.";
    }
  }
);

materialFileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedMaterialId) {
    message.textContent = "Сначала выберите учебный материал.";
    return;
  }
  const file = materialFileInput.files[0];
  if (!file) {
    message.textContent = "Выберите файл.";
    return;
  }
  const formData = new FormData();
  formData.append("file", file);
  try {
    const response = await fetch(`${apiUrl}/api/teacher/materials/${selectedMaterialId}/files`,{
      method: "POST",
      credentials: "include",
      body: formData
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка загрузки файла.";
      return;
    }
    message.textContent = data.message;
    materialFileForm.reset();
    await loadMaterialFiles(selectedMaterialId, selectedMaterialTitle);
  } catch (error) {
    console.error("Ошибка загрузки файла:", error);
    message.textContent = "Не удалось загрузить файл.";
  }
});

assignmentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedAssignmentCourseId) {
    message.textContent = "Сначала выберите учебный курс.";
    return;
  }
  const deadline = assignmentDeadline.value ? new Date(assignmentDeadline.value).toISOString() : null;
  try {
    const response = await fetch(`${apiUrl}/api/teacher/courses/${selectedAssignmentCourseId}/assignments`,{
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        title: assignmentTitle.value,
        description: assignmentDescription.value,
        gradeDate: assignmentGradeDate.value,
        deadline,
        maxScore: assignmentMaxScore.value,
        lessonId: assignmentLesson.value || null
      })
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка создания задания.";
      return;
    }
    message.textContent = data.message;
    assignmentForm.reset();
    assignmentMaxScore.value = "5";
    await loadAssignments(selectedAssignmentCourseId,selectedAssignmentCourseName);
  } catch (error) {
    console.error("Ошибка создания задания:", error);
    message.textContent = "Не удалось создать задание.";
  }
});

assignmentFileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedAssignmentId) {
    message.textContent = "Сначала выберите задание.";
    return;
  }
  const file = assignmentFileInput.files[0];
  if (!file) {
    message.textContent = "Выберите файл.";
    return;
  }
  const formData = new FormData();
  formData.append("file",file);
  try {
    const response = await fetch(`${apiUrl}/api/teacher/assignments/${selectedAssignmentId}/files`,{
      method: "POST",
      credentials: "include",
      body: formData
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка загрузки файла задания.";
      return;
    }
    message.textContent = data.message;
    assignmentFileForm.reset();
    await loadAssignmentFiles(selectedAssignmentId,selectedAssignmentTitle);
  } catch (error) {
    console.error("Ошибка загрузки файла задания:", error);
    message.textContent = "Не удалось загрузить файл задания.";
  }
});

returnSubmissionButton.addEventListener("click", async () => {
  if (!selectedSubmissionId) return;
  const teacherComment = teacherSubmissionComment.value.trim();
  if (!teacherComment) {
    message.textContent = "Укажите причину возврата работы.";
    return;
  }
  const confirmed = confirm("Вернуть работу студенту на доработку?");
  if (!confirmed) return;
  try {
    const response = await fetch(`${apiUrl}/api/teacher/submissions/${selectedSubmissionId}/return`,{
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ teacherComment })
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка возврата работы.";
      return;
    }
    message.textContent = data.message;
    submissionDetailsSection.hidden = true;
    await loadSubmissions(selectedSubmissionsAssignmentId,selectedSubmissionsAssignmentTitle);
  } catch (error) {
    console.error("Ошибка возврата работы:", error);
    message.textContent = "Не удалось вернуть работу.";
  }
});

gradeSubmissionButton.addEventListener("click", async () => {
  if (!selectedSubmissionId) return;
  const score = Number(submissionScoreInput.value);
  if (!Number.isFinite(score) || score < 0) {
    message.textContent = "Укажите корректный балл.";
    return;
  }
  if (score > selectedSubmissionMaxScore) {
    message.textContent = `Балл не может превышать ${selectedSubmissionMaxScore}.`;
    return;
  }
  try {
    const response = await fetch(`${apiUrl}/api/teacher/submissions/${selectedSubmissionId}/grade`,{
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        score,
        teacherComment: teacherSubmissionComment.value
      })
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка оценивания работы.";
      return;
    }
    message.textContent = data.message;
    await loadSubmissions(selectedSubmissionsAssignmentId,selectedSubmissionsAssignmentTitle);
  } catch (error) {
    console.error("Ошибка оценивания работы:", error);
    message.textContent = "Не удалось оценить работу.";
  }
});

lessonForm.addEventListener("submit",async (event) => {
  event.preventDefault();

  if (!selectedLessonsCourseId) {
    message.textContent = "Сначала выберите учебный курс.";
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/api/teacher/courses/${selectedLessonsCourseId}/lessons`,{
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        moduleId: lessonModule.value || null,
        lessonDate: lessonDate.value,
        lessonType: lessonType.value,
        topic: lessonTopic.value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      message.textContent = data.error || "Ошибка создания занятия.";
      return;
    }

    message.textContent = data.message;

    lessonForm.reset();

    await loadLessons(selectedLessonsCourseId,selectedLessonsCourseName);
  } catch (error) {
    console.error("Ошибка создания занятия:", error);
    message.textContent = "Не удалось создать занятие.";
  }
});

moduleForm.addEventListener("submit",async (event) => {
  event.preventDefault();
  if (!selectedLessonsCourseId) {
    message.textContent = "Сначала выберите учебный курс.";
    return;
  }
  try {
    const response = await fetch(`${apiUrl}/api/teacher/courses/${selectedLessonsCourseId}/modules`,{
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        title: moduleTitle.value,
        description: moduleDescription.value
      })
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка создания модуля.";
      return;
    }
    moduleForm.reset();
    message.textContent = data.message;
    await loadModules(selectedLessonsCourseId);
  } catch (error) {
    console.error("Ошибка создания модуля:", error);
    message.textContent = "Не удалось создать модуль.";
  }
});

gradeItemForm.addEventListener("submit",async (event) => {
  event.preventDefault();

  if (!selectedLessonId) {
    message.textContent = "Сначала выберите занятие.";
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/api/teacher/lessons/${selectedLessonId}/grade-items`,{
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        title: gradeItemTitle.value,
        itemType: gradeItemType.value,
        maxScore: Number(gradeItemMaxScore.value)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      message.textContent = data.error || "Ошибка создания оценивания.";
      return;
    }

    message.textContent = data.message;

    gradeItemForm.reset();
    gradeItemMaxScore.value = "5";

    await loadGradeItems(selectedLessonId,selectedLessonTitle);
  } catch (error) {
    console.error("Ошибка создания оценивания:", error);
    message.textContent = "Не удалось создать оценивание.";
  }
});

function fillLessonSelect(select, lessons, emptyLabel) {
  select.innerHTML = "";
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = emptyLabel;
  select.appendChild(emptyOption);
  lessons.forEach((lesson) => {
    const option = document.createElement("option");
    option.value = lesson.id;
    const modulePrefix = lesson.module_title ? `${lesson.module_title} · ` : "";
    option.textContent = `${modulePrefix}${lesson.topic || "Без темы"} · ${lesson.lesson_date.split("-").reverse().join(".")}`;
    select.appendChild(option);
  });
}

async function loadCourseLessonOptions(courseId, select, emptyLabel) {
  const response = await fetch(`${apiUrl}/api/teacher/courses/${courseId}/lessons`,{ credentials:"include" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Ошибка получения занятий");
  fillLessonSelect(select,data,emptyLabel);
  return data;
}

async function loadMaterials(courseId, courseName = "") {
  try {
    await loadCourseLessonOptions(courseId,materialLesson,"Общий материал курса");
    const response = await fetch(`${apiUrl}/api/teacher/courses/${courseId}/materials`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения материалов.";
      return;
    }
    selectedCourseId = courseId;
    selectedCourseName = courseName;
    window.TeacherUI?.setCoursePanel("courseMaterialsSection");
    courseMaterialsSection.hidden = false;
    courseMaterialsTitle.textContent = courseName ? `Материалы курса: ${courseName}` : "Материалы курса";
    materialsList.innerHTML = "";
    if (data.length === 0) {
      materialsList.textContent = "Материалы пока не созданы.";
      return;
    }
    for (const material of data) {
      const container = document.createElement("div");
      container.className = "entity-row";
      const titleElement = document.createElement("strong");
      titleElement.textContent = material.title;
      const infoElement = document.createElement("span");
      infoElement.textContent = ` — ${material.material_type} — ${material.is_published ? "опубликован" : "черновик"}`;
      if (material.lesson_topic) infoElement.textContent += ` — ${material.module_title ? `${material.module_title}: ` : ""}${material.lesson_topic}`;
      const filesButton = document.createElement("button");
      filesButton.textContent = "Файлы";
      filesButton.addEventListener("click",async () => { await loadMaterialFiles(material.id, material.title); });
      const publicationButton = document.createElement("button");
      publicationButton.textContent = material.is_published ? "Снять с публикации" : "Опубликовать";
      publicationButton.addEventListener("click",async () => { await changeMaterialPublication(material.id,!material.is_published); });
      if (material.description) {
        infoElement.textContent += ` — ${material.description}`;
      }
      container.appendChild(titleElement);
      container.appendChild(infoElement);
      container.appendChild(window.EduUI.createActionGroup(filesButton, publicationButton));
      materialsList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки материалов:", error);
    message.textContent = "Не удалось загрузить материалы.";
  }
}

async function loadCourses() {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/courses`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения учебных курсов.";
      return;
    }
    coursesList.innerHTML = "";
    if (data.length === 0) {
      coursesList.textContent = "Учебные курсы пока не созданы.";
      return;
    }
    for (const course of data) {
      const container = document.createElement("div");
      container.className = "entity-row";

      const disciplineElement = document.createElement("strong");
      disciplineElement.textContent = course.discipline_name;

      const infoElement = document.createElement("span");
      infoElement.textContent = ` — ${course.group_name}` + ` — ${course.academic_year}` + ` — ${course.semester} семестр`;

      const courseName = `${course.discipline_name} — ${course.group_name} — ${course.academic_year} — ${course.semester} семестр`;
      const openButton = document.createElement("button");
      openButton.textContent = "Открыть курс";
      openButton.className = "teacher-open-course";
      openButton.addEventListener("click",async () => {
        if (window.TeacherUI) await window.TeacherUI.openCourse({ id:course.id,name:courseName });
        else await loadLessons(course.id,courseName);
      });

      container.appendChild(disciplineElement);
      container.appendChild(infoElement);
      container.appendChild(window.EduUI.createActionGroup(openButton));
      coursesList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки учебных курсов:", error);
    message.textContent = "Не удалось загрузить учебные курсы.";
  }
}

async function loadAssignments(courseId, courseName = "") {
  try {
    await loadCourseLessonOptions(courseId,assignmentLesson,"Общее задание курса");
    const response = await fetch(`${apiUrl}/api/teacher/courses/${courseId}/assignments`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения заданий курса.";
      return;
    }
    selectedAssignmentCourseId = courseId;
    selectedAssignmentCourseName = courseName;
    window.TeacherUI?.setCoursePanel("courseAssignmentsSection");
    courseAssignmentsSection.hidden = false;
    courseAssignmentsTitle.textContent = `Задания курса: ${courseName}`;
    assignmentsList.innerHTML = "";
    assignmentFilesSection.hidden = true;
    selectedAssignmentId = null;
    selectedAssignmentTitle = "";
    window.EduUI?.setCalendarEvents(`teacher-assignments-${courseId}`, data.flatMap((assignment) => [
      assignment.deadline ? { date: assignment.deadline, title: `Срок: ${assignment.title}`, type: "assignment" } : null,
      assignment.grade_date ? { date: assignment.grade_date, title: `В журнале: ${assignment.title}`, type: "assignment" } : null
    ].filter(Boolean)));
    if (data.length === 0) {
      assignmentsList.textContent = "Задания пока не созданы.";
      return;
    }
    for (const assignment of data) {
      const container = document.createElement("div");
      container.className = "entity-card";

      const titleElement = document.createElement("strong");
      titleElement.textContent = assignment.title;

      const statusElement = document.createElement("span");
      statusElement.textContent = assignment.is_published ? " — опубликовано" : " — черновик";
      if (assignment.lesson_topic) statusElement.textContent += ` — ${assignment.module_title ? `${assignment.module_title}: ` : ""}${assignment.lesson_topic}`;

      const scoreElement = document.createElement("span");
      scoreElement.textContent = ` — максимум: ${assignment.max_score}`;

      const descriptionElement = document.createElement("p");
      descriptionElement.textContent = assignment.description || "Описание отсутствует.";

      const deadlineElement = document.createElement("p");
      deadlineElement.textContent = assignment.deadline ? `Срок выполнения: ${new Date(assignment.deadline).toLocaleString("ru-RU")}` : "Срок выполнения: не установлен";

      const publicationButton = document.createElement("button");
      publicationButton.textContent = assignment.is_published ? "Снять с публикации" : "Опубликовать";
      publicationButton.addEventListener("click",async () => { await changeAssignmentPublication(assignment.id,!assignment.is_published); });

      const filesButton = document.createElement("button");
      filesButton.textContent = "Файлы";
      filesButton.addEventListener("click", async () => { await loadAssignmentFiles(assignment.id, assignment.title); });

      const submissionsButton = document.createElement("button");
      submissionsButton.textContent = "Работы студентов";
      submissionsButton.addEventListener("click", async () => { await loadSubmissions(assignment.id, assignment.title); });

      const gradeDateElement = document.createElement("p");
      gradeDateElement.textContent = assignment.grade_date ? `Дата в журнале: ${assignment.grade_date.split("-").reverse().join(".")}` : "Дата в журнале: не назначена";

      container.appendChild(titleElement);
      container.appendChild(statusElement);
      container.appendChild(scoreElement);
      container.appendChild(descriptionElement);
      container.appendChild(deadlineElement);
      container.appendChild(gradeDateElement);
      container.appendChild(window.EduUI.createActionGroup(publicationButton, filesButton, submissionsButton));
      assignmentsList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки заданий курса:", error);
    message.textContent = "Не удалось загрузить задания курса.";
  }
}

async function loadAssignmentFiles(assignmentId, assignmentTitle) {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/assignments/${assignmentId}/files`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения файлов задания.";
      return;
    }
    selectedAssignmentId = assignmentId;
    selectedAssignmentTitle = assignmentTitle;
    assignmentFilesSection.hidden = false;
    assignmentFilesTitle.textContent = `Файлы задания: ${assignmentTitle}`;
    assignmentFilesList.innerHTML = "";
    await loadAssignmentMaterialFiles(assignmentId);
    if (data.length === 0) {
      assignmentFilesList.textContent = "Файлы пока не загружены.";
      return;
    }
    for (const file of data) {
      const container = document.createElement("div");
      const downloadButton = document.createElement("button");
      downloadButton.textContent = file.original_name;
      downloadButton.addEventListener("click",async () => {
        await downloadAssignmentFile(file.id,file.original_name);
      });
      const infoElement = document.createElement("span");
      infoElement.textContent = ` — ${formatFileSize(file.size_bytes)} — ${file.mime_type}`;
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Удалить";
      deleteButton.addEventListener("click",async () => {
        await deleteAssignmentFile(file.id,file.original_name);
      });
      container.appendChild(downloadButton);
      container.appendChild(infoElement);
      container.appendChild(deleteButton);
      assignmentFilesList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки файлов задания:", error);
    message.textContent = "Не удалось загрузить файлы задания.";
  }
}

async function loadCourseOptions() {
  try {
    const [groupsResponse, disciplinesResponse] = await Promise.all([
      fetch(`${apiUrl}/api/teacher/groups`,{ credentials: "include" }),
      fetch(`${apiUrl}/api/teacher/disciplines`,{ credentials: "include" })
    ]);
    const groups = await groupsResponse.json();
    const disciplines = await disciplinesResponse.json();
    if (!groupsResponse.ok || !disciplinesResponse.ok) {
      message.textContent = "Ошибка загрузки данных для создания курса.";
      return;
    }
    courseGroup.innerHTML = "";
    courseDiscipline.innerHTML = "";
    for (const group of groups) {
      if (!group.is_active) continue;
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.name;
      courseGroup.appendChild(option);
    }
    for (const discipline of disciplines) {
      if (!discipline.is_active) continue;
      const option = document.createElement("option");
      option.value = discipline.id;
      option.textContent = discipline.code ? `${discipline.name} (${discipline.code})` : discipline.name;
      courseDiscipline.appendChild(option);
    }
  } catch (error) {
    console.error("Ошибка загрузки данных курса:", error);
    message.textContent = "Не удалось загрузить данные для создания курса.";
  }
}

async function loadDisciplines() {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/disciplines`,
      {
        credentials: "include"
      }
    );
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения дисциплин.";
      return;
    }
    disciplinesList.innerHTML = "";
    if (data.length === 0) {
      disciplinesList.textContent = "Дисциплины пока не созданы.";
      return;
    }
    for (const discipline of data) {
      const container = document.createElement("div");
      const nameElement = document.createElement("strong");
      nameElement.textContent = discipline.name;
      const codeElement = document.createElement("span");
      codeElement.textContent = discipline.code ? ` — ${discipline.code}` : "";
      const descriptionElement = document.createElement("span");
      descriptionElement.textContent = discipline.description ? ` — ${discipline.description}` : "";
      container.appendChild(nameElement);
      container.appendChild(codeElement);
      container.appendChild(descriptionElement);
      disciplinesList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки дисциплин:", error);
    message.textContent = "Не удалось загрузить список дисциплин.";
  }
}

async function loadPendingStudents() {
  try {
    const response = await fetch(`${apiUrl}/api/students/pending`,
      {
        credentials: "include"
      }
    );
    if (!response.ok) {
      throw new Error("Не удалось получить список студентов");
    }
    const students = await response.json();
    studentsList.innerHTML = "";
    if (students.length === 0) {
      studentsList.textContent = "Нет заявок на подтверждение.";
      return;
    }
    for (const student of students) {
      const container = document.createElement("div");
      container.className = "entity-row";
      const fullName = [student.last_name, student.first_name, student.middle_name].filter(Boolean).join(" ");
      const info = document.createElement("span");
      info.textContent = `${fullName} | ` + `${student.group_name ?? "Без группы"} | ` + `${student.email} `;
      const approveButton = document.createElement("button");
      approveButton.textContent = "Подтвердить";
      approveButton.addEventListener("click",async () => {
          await approveStudent(
            student.id
          );
        }
      );
      const rejectButton = document.createElement("button");
      rejectButton.textContent = "Отклонить";
      rejectButton.addEventListener("click", async () => {
          await rejectStudent(
            student.id
          );
        }
      );
      container.appendChild(info);
      container.appendChild(window.EduUI.createActionGroup(approveButton, rejectButton));
      studentsList.appendChild(container);
    }
  } catch (error) {
    console.error(error);
    message.textContent = "Ошибка загрузки списка студентов.";
  }
}

async function loadGroups() {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/groups`,
      {
        credentials: "include"
      }
    );
    const data = await response.json();
    if (!response.ok) {
        message.textContent = data.error || "Ошибка получения групп.";
        return;
    }
    groupsList.innerHTML = "";
    if (data.length === 0) {
        groupsList.textContent = "Учебные группы пока не созданы.";
        return;
    }
    for (const group of data) {
      const container = document.createElement("div");
      container.className = "entity-row";
      const nameElement = document.createElement("strong");
      nameElement.textContent = group.name;
      const descriptionElement = document.createElement("span");
      descriptionElement.textContent = group.description ? ` — ${group.description}` : "";
      const countElement = document.createElement("span");
      countElement.textContent = ` — студентов: ${group.student_count}`;
      container.appendChild(nameElement);
      container.appendChild(descriptionElement);
      container.appendChild(countElement);
      const openButton = document.createElement("button");
      openButton.textContent = "Открыть";
      openButton.addEventListener("click",async () => {
          await loadGroupStudents(
            group.id
          );
        }
      );
      container.appendChild(window.EduUI.createActionGroup(openButton));
      groupsList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки групп:", error);
    message.textContent = "Не удалось загрузить список групп.";
  }
}

async function loadGroupStudents(groupId) {
  selectedGroupId = groupId;
  try {
    const response = await fetch(`${apiUrl}/api/teacher/groups/${groupId}/students`,
      {
        credentials: "include"
      }
    );
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения студентов группы.";
      return;
    }
    selectedGroupName.textContent = `Студенты группы ${data.group.name}`;
    groupStudentsList.innerHTML = "";
    groupStudentsSection.hidden = false;
    if (data.students.length === 0) {
      groupStudentsList.textContent = "В этой группе пока нет студентов.";
      return;
    }
    for (const student of data.students) {
      const container = document.createElement("div");
      container.className = "entity-row";
      const fullName = [student.last_name, student.first_name, student.middle_name].filter(Boolean).join(" ");
      const nameElement = document.createElement("strong");
      nameElement.textContent = fullName;
      const infoElement = document.createElement("span");
      infoElement.textContent = ` — ${student.email}`;
      if (student.student_number) {
          infoElement.textContent += ` — № ${student.student_number}`;
      }
      infoElement.textContent += ` — статус: ${student.status}`;
      const openButton = document.createElement("button");
      openButton.textContent = "Открыть";
      openButton.addEventListener("click", async () => {
        await loadStudentDetails(
            student.id
          );
        }
      );
      container.appendChild(nameElement);
      container.appendChild(infoElement);
      container.appendChild(window.EduUI.createActionGroup(openButton));
      groupStudentsList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки студентов группы:", error);
    message.textContent = "Не удалось загрузить студентов группы.";
  }
}

async function loadStudentDetails(studentId) {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/students/${studentId}`,
      {
        credentials: "include"
      }
    );
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения студента.";
      return;
    }
    const student = data.student;
    selectedStudentId = student.id;
    selectedStudentStatus = student.status;
    const fullName = [student.last_name, student.first_name, student.middle_name].filter(Boolean).join(" ");

    studentDetails.innerHTML = "";

    const nameElement = document.createElement("p");
    nameElement.textContent = `ФИО: ${fullName}`;

    const emailElement = document.createElement("p");
    emailElement.textContent = `Email: ${student.email}`;

    const numberElement = document.createElement("p");
    numberElement.textContent = `Номер студента: ${student.student_number ?? "Не указан"}`;

    const statusElement = document.createElement("p");
    statusElement.textContent = `Статус: ${student.status}`;

    const groupElement = document.createElement("p");
    groupElement.textContent = `Группа: ${student.group_name ?? "Не назначена"}`;

    studentDetails.appendChild(nameElement);
    studentDetails.appendChild(emailElement);
    studentDetails.appendChild(numberElement);
    studentDetails.appendChild(statusElement);
    studentDetails.appendChild(groupElement);
    await loadGroupsForStudent(student.group_id);
    if (student.status === "blocked") {
      studentStatusButton.textContent = "Разблокировать";
    } else {
      studentStatusButton.textContent = "Заблокировать";
    }
    studentDetailsSection.hidden = false;
  } catch (error) {
    console.error("Ошибка загрузки студента:", error);
    message.textContent = "Не удалось загрузить данные студента.";
  }
}

async function loadGroupsForStudent(currentGroupId) {
  const response = await fetch(`${apiUrl}/api/teacher/groups`,
    {
      credentials: "include"
    }
  );
  const groups = await response.json();
  if (!response.ok) {
    message.textContent = groups.error || "Ошибка получения групп.";
    return;
  }
  studentGroupSelect.innerHTML = "";
  for (const group of groups) {
    if (!group.is_active) {
      continue;
    }
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    if (String(group.id) === String(currentGroupId)) {
      option.selected = true;
    }
    studentGroupSelect.appendChild(option);
  }
}

async function loadMaterialFiles(materialId, materialTitle) {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/materials/${materialId}/files`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения файлов материала.";
      return;
    }
    selectedMaterialId = materialId;
    selectedMaterialTitle = materialTitle;
    materialFilesSection.hidden = false;
    materialFilesTitle.textContent = `Файлы материала: ${materialTitle}`;
    materialFilesList.innerHTML = "";
    if (data.length === 0) {
      materialFilesList.textContent = "Файлы пока не загружены.";
      return;
    }
    for (const file of data) {
      const container = document.createElement("div");
      const downloadButton = document.createElement("button");
      downloadButton.textContent = file.original_name;
      downloadButton.addEventListener("click",async () => {
        await downloadMaterialFile(file.id,file.original_name);
      });
      const infoElement = document.createElement("span");
      infoElement.textContent = ` — ${formatFileSize(file.size_bytes)} — ${file.mime_type}`;
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Удалить";
      deleteButton.addEventListener("click",async () => {
        await deleteMaterialFile(file.id,file.original_name);
      });
      container.appendChild(downloadButton);
      container.appendChild(infoElement);
      container.appendChild(deleteButton);
      materialFilesList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки файлов материала:", error);
    message.textContent = "Не удалось загрузить файлы материала.";
  }
}

async function loadAssignmentMaterialFiles(assignmentId) {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/assignments/${assignmentId}/material-files`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения файлов материалов.";
      return;
    }
    assignmentMaterialFilesList.innerHTML = "";
    if (data.length === 0) {
      assignmentMaterialFilesList.textContent = "В материалах этого курса файлов пока нет.";
      return;
    }
    for (const file of data) {
      const container = document.createElement("div");

      const downloadButton = document.createElement("button");
      downloadButton.textContent = file.original_name;
      downloadButton.addEventListener("click",async () => { await downloadMaterialFile(file.id,file.original_name); });

      const infoElement = document.createElement("span");
      infoElement.textContent = ` — ${file.material_title} — ${formatFileSize(file.size_bytes)}`;

      const attachButton = document.createElement("button");
      attachButton.textContent = file.is_attached ? "Убрать" : "Добавить";
      attachButton.addEventListener("click",async () => { await changeAssignmentMaterialFile(assignmentId,file.id,!file.is_attached); });

      container.appendChild(downloadButton);
      container.appendChild(infoElement);
      container.appendChild(attachButton);
      assignmentMaterialFilesList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки файлов материалов курса:", error);
    message.textContent = "Не удалось загрузить файлы материалов.";
  }
}

async function loadSubmissions(assignmentId, assignmentTitle) {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/assignments/${assignmentId}/submissions`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения работ студентов.";
      return;
    }
    selectedSubmissionsAssignmentId = assignmentId;
    selectedSubmissionsAssignmentTitle = assignmentTitle;
    submissionsSection.hidden = false;
    submissionDetailsSection.hidden = true;
    submissionsTitle.textContent = `Работы студентов: ${assignmentTitle}`;
    submissionsList.innerHTML = "";
    if (data.length === 0) {
      submissionsList.textContent = "Работы студентов пока отсутствуют.";
      return;
    }
    for (const submission of data) {
      const container = document.createElement("div");
      const fullName = [
        submission.last_name,
        submission.first_name,
        submission.middle_name
      ].filter(Boolean).join(" ");
      const studentElement = document.createElement("strong");
      studentElement.textContent = fullName;
      const statusElement = document.createElement("span");
      statusElement.textContent = ` — ${getSubmissionStatusLabel(submission.status)}`;
      const numberElement = document.createElement("span");
      numberElement.textContent = submission.student_number ? ` — ${submission.student_number}` : "";
      const lateElement = document.createElement("span");
      lateElement.textContent = submission.is_late ? " — просрочено" : "";
      const openButton = document.createElement("button");
      openButton.textContent = "Открыть";
      openButton.addEventListener("click",async () => {
        await openSubmission(submission);
      });
      container.appendChild(studentElement);
      container.appendChild(numberElement);
      container.appendChild(statusElement);
      container.appendChild(lateElement);
      container.appendChild(openButton);
      submissionsList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки работ студентов:", error);
    message.textContent = "Не удалось загрузить работы студентов.";
  }
}

async function loadTeacherSubmissionFiles(submissionId) {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/submissions/${submissionId}/files`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения файлов работы.";
      return;
    }
    submissionFilesList.innerHTML = "";
    if (data.length === 0) {
      submissionFilesList.textContent = "Файлы к работе не приложены.";
      return;
    }
    for (const file of data) {
      const container = document.createElement("div");
      const downloadButton = document.createElement("button");
      downloadButton.textContent = file.original_name;
      downloadButton.addEventListener("click",async () => { await downloadTeacherSubmissionFile(file.id,file.original_name); });
      const infoElement = document.createElement("span");
      infoElement.textContent = ` — ${formatFileSize(file.size_bytes)} — ${file.mime_type}`;
      container.appendChild(downloadButton);
      container.appendChild(infoElement);
      submissionFilesList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки файлов работы:", error);
    message.textContent = "Не удалось загрузить файлы работы.";
  }
}

async function loadJournal(courseId, courseName = "") {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/courses/${courseId}/journal`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения электронного журнала.";
      return;
    }
    submissionsSection.hidden = true;
    submissionDetailsSection.hidden = true;
    window.TeacherUI?.setCoursePanel("journalSection");
    journalSection.hidden = false;
    journalTitle.textContent = `Электронный журнал: ${courseName}`;
    journalContainer.innerHTML = "";
    const manualGradeItems = data.gradeItems.filter(item => item.assignment_id === null);

    const gradesByStudent = new Map();

    for (const grade of data.grades) {
      gradesByStudent.set(`${grade.student_id}:${grade.grade_item_id}`,grade);
    }
    if (data.students.length === 0) {
      journalContainer.textContent = "В группе пока нет студентов.";
      return;
    }
    if (data.assignments.length === 0 && manualGradeItems.length === 0) {
      journalContainer.textContent = "В учебном курсе пока нет оцениваний.";
      return;
    }
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const studentHeader = document.createElement("th");
    studentHeader.textContent = "Студент";
    const numberHeader = document.createElement("th");
    numberHeader.textContent = "Номер";
    headerRow.appendChild(studentHeader);
    headerRow.appendChild(numberHeader);
    for (const assignment of data.assignments) {
      const assignmentHeader = document.createElement("th");
      const titleElement = document.createElement("div");
      titleElement.textContent = assignment.title;
      const maxScoreElement = document.createElement("small");
      maxScoreElement.textContent = `Макс.: ${assignment.max_score}`;
      assignmentHeader.appendChild(titleElement);
      assignmentHeader.appendChild(maxScoreElement);
      if (!assignment.is_published) {
        const draftElement = document.createElement("div");
        draftElement.textContent = "Черновик";
        assignmentHeader.appendChild(draftElement);
      }
      headerRow.appendChild(assignmentHeader);
    }
    for (const item of manualGradeItems) {
      const itemHeader = document.createElement("th");

      const dateElement = document.createElement("div");
      dateElement.textContent = item.grade_date.split("-").reverse().join(".");

      const titleElement = document.createElement("div");
      titleElement.textContent = item.title;

      const maxScoreElement = document.createElement("small");
      maxScoreElement.textContent = `Макс.: ${item.max_score}`;

      itemHeader.appendChild(dateElement);
      itemHeader.appendChild(titleElement);
      itemHeader.appendChild(maxScoreElement);

      headerRow.appendChild(itemHeader);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (const student of data.students) {
      const row = document.createElement("tr");
      const fullName = [
        student.last_name,
        student.first_name,
        student.middle_name
      ].filter(Boolean).join(" ");
      const studentCell = document.createElement("td");
      studentCell.textContent = fullName;
      const numberCell = document.createElement("td");
      numberCell.textContent = student.student_number || "—";
      row.appendChild(studentCell);
      row.appendChild(numberCell);
      for (const assignment of data.assignments) {
        const cell = document.createElement("td");
        const submission = student.submissions[assignment.id];
        cell.textContent = getJournalCellText(submission,assignment);
        row.appendChild(cell);
      }
      for (const item of manualGradeItems) {
        const cell = document.createElement("td");

        const grade = gradesByStudent.get(`${student.id}:${item.id}`);

        cell.textContent = grade ? `${grade.score} / ${item.max_score}` : "—";

        if (grade?.comment) {
          cell.title = grade.comment;
        }

        row.appendChild(cell);
      }
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    journalContainer.appendChild(table);
  } catch (error) {
    console.error("Ошибка загрузки электронного журнала:", error);
    message.textContent = "Не удалось загрузить электронный журнал.";
  }
}

async function loadModules(courseId) {
  const response = await fetch(`${apiUrl}/api/teacher/courses/${courseId}/modules`,{ credentials:"include" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Ошибка получения модулей");

  modulesList.innerHTML = "";
  lessonModule.innerHTML = '<option value="">Без модуля</option>';
  data.forEach((module) => {
    const option = document.createElement("option");
    option.value = module.id;
    option.textContent = module.title;
    lessonModule.appendChild(option);

    const row = document.createElement("div");
    row.className = "entity-row";
    const title = document.createElement("strong");
    title.textContent = module.title;
    const info = document.createElement("span");
    info.textContent = ` — занятий: ${module.lessons_count}`;
    if (module.description) info.textContent += ` — ${module.description}`;
    row.append(title,info);
    if (module.lessons_count === 0) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Удалить";
      deleteButton.addEventListener("click",async () => {
        if (!confirm(`Удалить модуль «${module.title}»?`)) return;
        const deleteResponse = await fetch(`${apiUrl}/api/teacher/modules/${module.id}`,{
          method:"DELETE",
          credentials:"include"
        });
        const result = await deleteResponse.json();
        message.textContent = deleteResponse.ok ? result.message : result.error || "Ошибка удаления модуля.";
        if (deleteResponse.ok) await loadModules(courseId);
      });
      row.appendChild(window.EduUI.createActionGroup(deleteButton));
    }
    modulesList.appendChild(row);
  });
  if (data.length === 0) modulesList.textContent = "Модули пока не созданы.";
  return data;
}

async function loadLessons(courseId, courseName = "") {
  try {
    await loadModules(courseId);
    const response = await fetch(`${apiUrl}/api/teacher/courses/${courseId}/lessons`,{
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения занятий.";
      return;
    }

    selectedLessonsCourseId = courseId;
    selectedLessonsCourseName = courseName;

    window.TeacherUI?.setCoursePanel("courseLessonsSection");
    courseLessonsSection.hidden = false;

    courseLessonsTitle.textContent = `Занятия курса: ${courseName}`;
    lessonsList.innerHTML = "";
    window.EduUI?.setCalendarEvents(`teacher-lessons-${courseId}`, data.map((lesson) => ({
      date: lesson.lesson_date,
      title: `${lesson.topic || "Занятие"} · ${courseName}`,
      type: "lesson"
    })));

    if (data.length === 0) {
      lessonsList.textContent = "Занятия пока не созданы.";
      return;
    }

    const lessonTypeLabels = {
      lecture: "Лекция",
      practical: "Практическое занятие",
      laboratory: "Лабораторная работа",
      test: "Тестирование",
      other: "Другое"
    };

    for (const lesson of data) {
      const container = document.createElement("div");
      container.className = "entity-row";

      const dateElement = document.createElement("strong");
      dateElement.textContent = lesson.lesson_date.split("-").reverse().join(".");

      const typeElement = document.createElement("span");
      typeElement.textContent = ` — ${lessonTypeLabels[lesson.lesson_type] || lesson.lesson_type}`;

      const topicElement = document.createElement("span");
      topicElement.textContent = ` — ${lesson.module_title ? `${lesson.module_title} · ` : ""}${lesson.topic || "Тема не указана"}`;

      // Кнопка оцениваний
      const gradeItemsButton = document.createElement("button");
      gradeItemsButton.type = "button";
      gradeItemsButton.textContent = "Оценивания";

      gradeItemsButton.addEventListener("click",async () => {
        const lessonTitle = `${lesson.lesson_date.split("-").reverse().join(".")} — ${lesson.topic || "Без темы"}`;
        await loadGradeItems(lesson.id,lessonTitle);
      });

      const attendanceButton = document.createElement("button");
      attendanceButton.type = "button";
      attendanceButton.textContent = "Посещаемость";
      attendanceButton.addEventListener("click", async () => {
        await loadAttendance(lesson.id);
      });

      // Кнопка изменения занятия
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Изменить";

      // Кнопка удаления занятия
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Удалить";

      // Форма редактирования
      const editForm = document.createElement("form");
      editForm.hidden = true;

      const dateLabel = document.createElement("label");
      dateLabel.textContent = "Дата занятия";

      const dateInput = document.createElement("input");
      dateInput.type = "date";
      dateInput.value = lesson.lesson_date;
      dateInput.required = true;

      const typeLabel = document.createElement("label");
      typeLabel.textContent = "Вид занятия";

      const typeSelect = document.createElement("select");
      typeSelect.required = true;

      for (const [value, label] of Object.entries(lessonTypeLabels)) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        typeSelect.appendChild(option);
      }

      if (!lessonTypeLabels[lesson.lesson_type]) {
        const option = document.createElement("option");
        option.value = lesson.lesson_type;
        option.textContent = lesson.lesson_type;
        typeSelect.appendChild(option);
      }

      typeSelect.value = lesson.lesson_type;

      const topicLabel = document.createElement("label");
      topicLabel.textContent = "Тема занятия";

      const topicInput = document.createElement("input");
      topicInput.type = "text";
      topicInput.value = lesson.topic || "";
      topicInput.maxLength = 255;

      const moduleLabel = document.createElement("label");
      moduleLabel.textContent = "Модуль";
      const moduleSelect = lessonModule.cloneNode(true);
      moduleSelect.id = "";
      moduleSelect.value = lesson.module_id || "";
      moduleLabel.appendChild(moduleSelect);

      const saveButton = document.createElement("button");
      saveButton.type = "submit";
      saveButton.textContent = "Сохранить";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.textContent = "Отмена";

      dateLabel.appendChild(dateInput);
      typeLabel.appendChild(typeSelect);
      topicLabel.appendChild(topicInput);

      editForm.appendChild(dateLabel);
      editForm.appendChild(typeLabel);
      editForm.appendChild(topicLabel);
      editForm.appendChild(moduleLabel);
      editForm.appendChild(saveButton);
      editForm.appendChild(cancelButton);

      // Открытие формы изменения
      editButton.addEventListener("click",() => {
        editForm.hidden = !editForm.hidden;
      });

      // Отмена изменения
      cancelButton.addEventListener("click",() => {
        editForm.hidden = true;
      });

      // Сохранение изменений занятия
      editForm.addEventListener("submit",async (event) => {
        event.preventDefault();

        saveButton.disabled = true;

        try {
          const response = await fetch(`${apiUrl}/api/teacher/lessons/${lesson.id}`,{
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
              lessonDate: dateInput.value,
              lessonType: typeSelect.value,
              topic: topicInput.value.trim(),
              moduleId: moduleSelect.value || null
            })
          });

          const result = await response.json();

          if (!response.ok) {
            message.textContent = result.error || "Ошибка изменения занятия.";
            return;
          }

          await loadLessons(courseId,courseName);

          message.textContent = result.message;
        } catch (error) {
          console.error("Ошибка изменения занятия:", error);
          message.textContent = "Не удалось изменить занятие.";
        } finally {
          saveButton.disabled = false;
        }
      });

      // Удаление занятия
      deleteButton.addEventListener("click",async () => {
        const confirmed = window.confirm(
          `Удалить занятие от ${lesson.lesson_date.split("-").reverse().join(".")} «${lesson.topic || "Без темы"}»?`
        );

        if (!confirmed) return;

        deleteButton.disabled = true;

        try {
          const response = await fetch(`${apiUrl}/api/teacher/lessons/${lesson.id}`,{
            method: "DELETE",
            credentials: "include"
          });

          const result = await response.json();

          if (!response.ok) {
            message.textContent = result.error || "Ошибка удаления занятия.";
            return;
          }

          await loadLessons(courseId,courseName);

          message.textContent = result.message;
        } catch (error) {
          console.error("Ошибка удаления занятия:", error);
          message.textContent = "Не удалось удалить занятие.";
        } finally {
          deleteButton.disabled = false;
        }
      });

      container.appendChild(dateElement);
      container.appendChild(typeElement);
      container.appendChild(topicElement);
      container.appendChild(window.EduUI.createActionGroup(attendanceButton, gradeItemsButton, editButton, deleteButton));
      container.appendChild(editForm);

      lessonsList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки занятий:", error);
    message.textContent = "Не удалось загрузить занятия.";
  }
}

async function loadAttendance(lessonId) {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/lessons/${lessonId}/attendance`, { credentials: "include" });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения посещаемости.";
      return;
    }
    selectedAttendanceLessonId = lessonId;
    gradeItemsSection.hidden = true;
    attendanceEditorTitle.textContent = `Посещаемость: ${data.lesson.lesson_date.split("-").reverse().join(".")} — ${data.lesson.topic || "Без темы"} — ${data.lesson.group_name}`;
    attendanceStudentsList.innerHTML = "";
    if (data.students.length === 0) {
      attendanceStudentsList.textContent = "В группе пока нет студентов.";
    }
    const options = { present: "Присутствовал", absent: "Отсутствовал", late: "Опоздал", excused: "Уважительная причина" };
    data.students.forEach((student) => {
      const row = document.createElement("div");
      row.className = "attendance-editor-row";
      row.dataset.studentId = student.id;
      const name = document.createElement("strong");
      name.textContent = `${[student.last_name, student.first_name, student.middle_name].filter(Boolean).join(" ")} — ${student.student_number || "без номера"}`;
      const select = document.createElement("select");
      select.className = "attendance-status";
      Object.entries(options).forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      });
      select.value = student.status || "present";
      const comment = document.createElement("input");
      comment.className = "attendance-comment";
      comment.type = "text";
      comment.maxLength = 500;
      comment.placeholder = "Комментарий (необязательно)";
      comment.value = student.comment || "";
      row.append(name, select, comment);
      attendanceStudentsList.appendChild(row);
    });
    attendanceEditorSection.hidden = false;
    attendanceEditorSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error("Ошибка загрузки посещаемости:", error);
    message.textContent = "Не удалось загрузить посещаемость.";
  }
}

attendanceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedAttendanceLessonId) return;
  const button = attendanceForm.querySelector("button[type='submit']");
  const records = Array.from(attendanceStudentsList.querySelectorAll(".attendance-editor-row")).map((row) => ({
    studentId: row.dataset.studentId,
    status: row.querySelector(".attendance-status").value,
    comment: row.querySelector(".attendance-comment").value.trim()
  }));
  button.disabled = true;
  try {
    const response = await fetch(`${apiUrl}/api/teacher/lessons/${selectedAttendanceLessonId}/attendance`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ records })
    });
    const data = await response.json();
    message.textContent = response.ok ? data.message : data.error || "Ошибка сохранения посещаемости.";
  } catch (error) {
    console.error("Ошибка сохранения посещаемости:", error);
    message.textContent = "Не удалось сохранить посещаемость.";
  } finally {
    button.disabled = false;
  }
});

async function loadGradeItems(lessonId, lessonTitle = "") {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/lessons/${lessonId}/grade-items`,{
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения оцениваний.";
      return;
    }

    selectedLessonId = lessonId;
    selectedLessonTitle = lessonTitle;

    attendanceEditorSection.hidden = true;
    gradeItemsSection.hidden = false;
    gradeItemsTitle.textContent = `Оценивания: ${lessonTitle}`;
    gradeItemsList.innerHTML = "";

    if (data.length === 0) {
      gradeItemsList.textContent = "Оценивания пока не созданы.";
      return;
    }

    const itemTypeLabels = {
      answer: "Ответ по теме",
      practical: "Практическая работа",
      laboratory: "Лабораторная работа",
      test: "Тестирование",
      other: "Другое"
    };

    for (const item of data) {
      const container = document.createElement("div");
      container.className = "entity-row";

      const titleElement = document.createElement("strong");
      titleElement.textContent = item.title;

      const typeElement = document.createElement("span");
      typeElement.textContent = ` — ${itemTypeLabels[item.item_type] || item.item_type}`;

      const scoreElement = document.createElement("span");
      scoreElement.textContent = ` — максимум: ${item.max_score}`;

      // Кнопка изменения
      const editButton = document.createElement("button");
      editButton.textContent = "Изменить";
      editButton.type = "button";

      // Кнопка удаления
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Удалить";
      deleteButton.type = "button";

      // Кнопка выставления оценок
      const gradesButton = document.createElement("button");
      gradesButton.type = "button";
      gradesButton.textContent = "Оценки";

      // Контейнер для списка студентов и оценок
      const gradesPanel = document.createElement("div");
      gradesPanel.hidden = true;
      gradesButton.addEventListener("click",async () => {
        if (!gradesPanel.hidden) {
          gradesPanel.hidden = true;
          return;
        }
        gradesPanel.hidden = false;
        await loadGradeItemGrades(item,gradesPanel);
      });

      // Форма редактирования
      const editForm = document.createElement("form");
      editForm.hidden = true;

      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.value = item.title;
      titleInput.maxLength = 255;
      titleInput.required = true;

      const typeSelect = document.createElement("select");
      typeSelect.required = true;

      for (const [value, label] of Object.entries(itemTypeLabels)) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        typeSelect.appendChild(option);
      }

      // Сохраняем возможность редактировать пользовательский тип
      if (!itemTypeLabels[item.item_type]) {
        const option = document.createElement("option");
        option.value = item.item_type;
        option.textContent = item.item_type;
        typeSelect.appendChild(option);
      }

      typeSelect.value = item.item_type;

      const maxScoreInput = document.createElement("input");
      maxScoreInput.type = "number";
      maxScoreInput.min = "0.01";
      maxScoreInput.max = "9999.99";
      maxScoreInput.step = "0.01";
      maxScoreInput.value = item.max_score;
      maxScoreInput.required = true;

      const saveButton = document.createElement("button");
      saveButton.type = "submit";
      saveButton.textContent = "Сохранить";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.textContent = "Отмена";

      editForm.appendChild(titleInput);
      editForm.appendChild(typeSelect);
      editForm.appendChild(maxScoreInput);
      editForm.appendChild(saveButton);
      editForm.appendChild(cancelButton);

      // Открытие формы редактирования
      editButton.addEventListener("click",() => {
        editForm.hidden = !editForm.hidden;
      });

      // Отмена редактирования
      cancelButton.addEventListener("click",() => {
        editForm.hidden = true;
      });

      // Сохранение изменений
      editForm.addEventListener("submit",async (event) => {
        event.preventDefault();

        saveButton.disabled = true;

        try {
          const response = await fetch(`${apiUrl}/api/teacher/grade-items/${item.id}`,{
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
              title: titleInput.value.trim(),
              itemType: typeSelect.value,
              maxScore: Number(maxScoreInput.value)
            })
          });

          const result = await response.json();

          if (!response.ok) {
            message.textContent = result.error || "Ошибка изменения оценивания.";
            return;
          }

          await loadGradeItems(selectedLessonId,selectedLessonTitle);

          message.textContent = result.message;
        } catch (error) {
          console.error("Ошибка изменения оценивания:", error);
          message.textContent = "Не удалось изменить оценивание.";
        } finally {
          saveButton.disabled = false;
        }
      });

      // Удаление оценивания
      deleteButton.addEventListener("click",async () => {
        const confirmed = window.confirm(`Удалить оценивание «${item.title}»?`);

        if (!confirmed) return;

        deleteButton.disabled = true;

        try {
          const response = await fetch(`${apiUrl}/api/teacher/grade-items/${item.id}`,{
            method: "DELETE",
            credentials: "include"
          });

          const result = await response.json();

          if (!response.ok) {
            message.textContent = result.error || "Ошибка удаления оценивания.";
            return;
          }

          await loadGradeItems(selectedLessonId,selectedLessonTitle);

          message.textContent = result.message;
        } catch (error) {
          console.error("Ошибка удаления оценивания:", error);
          message.textContent = "Не удалось удалить оценивание.";
        } finally {
          deleteButton.disabled = false;
        }
      });

      container.appendChild(titleElement);
      container.appendChild(typeElement);
      container.appendChild(scoreElement);
      container.appendChild(window.EduUI.createActionGroup(gradesButton, editButton, deleteButton));
      container.appendChild(editForm);
      container.appendChild(gradesPanel);

      gradeItemsList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки оцениваний:", error);
    message.textContent = "Не удалось загрузить оценивания.";
  }
}

async function loadGradeItemGrades(item, panel) {
  try {
    panel.textContent = "Загрузка студентов...";

    const response = await fetch(`${apiUrl}/api/teacher/courses/${item.course_id}/journal`,{
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      panel.textContent = data.error || "Ошибка получения студентов.";
      return;
    }

    panel.innerHTML = "";

    const titleElement = document.createElement("h3");
    titleElement.textContent = `Оценки: ${item.title}`;

    const dateElement = document.createElement("p");
    dateElement.textContent = `Дата: ${item.grade_date.split("-").reverse().join(".")} — максимум: ${item.max_score}`;

    panel.appendChild(titleElement);
    panel.appendChild(dateElement);

    if (data.students.length === 0) {
      panel.append("В группе пока нет студентов.");
      return;
    }

    const gradesByStudent = new Map();

    for (const grade of data.grades) {
      if (String(grade.grade_item_id) === String(item.id)) {
        gradesByStudent.set(String(grade.student_id),grade);
      }
    }

    for (const student of data.students) {
      const grade = gradesByStudent.get(String(student.id));

      const row = document.createElement("div");
      row.className = "grade-student-row";

      const fullName = [
        student.last_name,
        student.first_name,
        student.middle_name
      ].filter(Boolean).join(" ");

      const studentElement = document.createElement("strong");
      studentElement.textContent = `${fullName} — ${student.student_number || "Без номера"}`;

      const gradeForm = document.createElement("form");
      gradeForm.className = "grade-entry-form";

      const scoreLabel = document.createElement("label");
      scoreLabel.textContent = "Балл: ";

      const scoreInput = document.createElement("input");
      scoreInput.type = "number";
      scoreInput.min = "0";
      scoreInput.max = item.max_score;
      scoreInput.step = "0.01";
      scoreInput.value = grade ? grade.score : "";
      scoreInput.required = true;

      const commentLabel = document.createElement("label");
      commentLabel.textContent = "Комментарий: ";

      const commentInput = document.createElement("input");
      commentInput.type = "text";
      commentInput.value = grade?.comment || "";

      const saveButton = document.createElement("button");
      saveButton.type = "submit";
      saveButton.textContent = grade ? "Изменить оценку" : "Сохранить оценку";

      const statusElement = document.createElement("span");

      scoreLabel.appendChild(scoreInput);
      commentLabel.appendChild(commentInput);

      gradeForm.appendChild(scoreLabel);
      gradeForm.appendChild(commentLabel);
      gradeForm.appendChild(saveButton);

      row.appendChild(studentElement);
      row.appendChild(gradeForm);
      row.appendChild(statusElement);

      panel.appendChild(row);

      gradeForm.addEventListener("submit",async (event) => {
        event.preventDefault();

        if (scoreInput.value.trim() === "") {
          statusElement.textContent = "Укажи балл.";
          return;
        }

        saveButton.disabled = true;
        statusElement.textContent = "";

        try {
          const response = await fetch(`${apiUrl}/api/teacher/grade-items/${item.id}/students/${student.id}/grade`,{
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
              score: Number(scoreInput.value),
              comment: commentInput.value.trim()
            })
          });

          const result = await response.json();

          if (!response.ok) {
            statusElement.textContent = result.error || "Ошибка сохранения оценки.";
            return;
          }

          message.textContent = result.message;

          await loadGradeItemGrades(item,panel);
        } catch (error) {
          console.error("Ошибка сохранения оценки:", error);
          statusElement.textContent = "Не удалось сохранить оценку.";
        } finally {
          saveButton.disabled = false;
        }
      });
    }
  } catch (error) {
    console.error("Ошибка загрузки оценок:", error);
    panel.textContent = "Не удалось загрузить оценки студентов.";
  }
}

async function downloadAssignmentFile(fileId, fileName) {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/assignment-files/${fileId}/download`,{
      credentials: "include"
    });
    if (!response.ok) {
      const data = await response.json();
      message.textContent = data.error || "Ошибка скачивания файла задания.";
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Ошибка скачивания файла задания:", error);
    message.textContent = "Не удалось скачать файл задания.";
  }
}

async function downloadMaterialFile(fileId, fileName) {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/files/${fileId}/download`,{
      credentials: "include"
    });
    if (!response.ok) {
      const data = await response.json();
      message.textContent = data.error || "Ошибка скачивания файла.";
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Ошибка скачивания файла:", error);
    message.textContent = "Не удалось скачать файл.";
  }
}

async function downloadTeacherSubmissionFile(fileId, fileName) {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/submission-files/${fileId}/download`,{
      credentials: "include"
    });
    if (!response.ok) {
      const data = await response.json();
      message.textContent = data.error || "Ошибка скачивания файла.";
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Ошибка скачивания файла работы:", error);
    message.textContent = "Не удалось скачать файл работы.";
  }
}

async function changeMaterialPublication(materialId, isPublished) {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/materials/${materialId}/publication`,{
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ isPublished })
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка изменения публикации.";
      return;
    }
    message.textContent = data.message;
    await loadMaterials(selectedCourseId,selectedCourseName);
  } catch (error) {
    console.error("Ошибка изменения публикации:", error);
    message.textContent = "Не удалось изменить публикацию материала.";
  }
}

async function changeAssignmentPublication(assignmentId, isPublished) {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/assignments/${assignmentId}/publication`,{
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ isPublished })
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка изменения публикации задания.";
      return;
    }
    message.textContent = data.message;
    await loadAssignments(selectedAssignmentCourseId,selectedAssignmentCourseName);
  } catch (error) {
    console.error("Ошибка изменения публикации задания:", error);
    message.textContent = "Не удалось изменить публикацию задания.";
  }
}

async function changeAssignmentMaterialFile(assignmentId, materialFileId, attach) {
  try {
    const response = await fetch(`${apiUrl}/api/teacher/assignments/${assignmentId}/material-files/${materialFileId}`,{
      method: attach ? "POST" : "DELETE",
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка изменения файлов задания.";
      return;
    }
    message.textContent = data.message;
    await loadAssignmentMaterialFiles(assignmentId);
  } catch (error) {
    console.error("Ошибка изменения файлов задания:", error);
    message.textContent = "Не удалось изменить файлы задания.";
  }
}

async function checkTeacherAccess() {
  try {
    const response = await fetch(`${apiUrl}/api/auth/me`,
      {
        credentials: "include"
      }
    );
    if (response.status === 401) {
      window.location.href = "login.html";
      return false;
    }
    if (!response.ok) {
      throw new Error("Ошибка проверки авторизации");
    }
    const data = await response.json();
    if (data.user.role !== "teacher") {
      message.textContent = "У вас нет доступа к кабинету преподавателя.";
      return false;
    }
    window.EduUI?.setUser(data.user);
    return true;
  } catch (error) {
    console.error(error);
    message.textContent = "Не удалось проверить авторизацию.";
    return false;
  }
}

async function approveStudent(studentId) {
  const response = await fetch(`${apiUrl}/api/students/${studentId}/approve`,
    {
      method: "PATCH",
      credentials: "include"
    }
  );
  const data = await response.json();
  if (!response.ok) {
    message.textContent = data.error || "Ошибка подтверждения.";
    return;
  }
  message.textContent = data.message;
  await loadPendingStudents();
}

async function rejectStudent(studentId) {
  const response = await fetch(`${apiUrl}/api/students/${studentId}/reject`,
    {
      method: "PATCH",
      credentials: "include"
    }
  );
  const data = await response.json();
  if (!response.ok) {
    message.textContent = data.error || "Ошибка отклонения.";
    return;
  }
  message.textContent = data.message;
  await loadPendingStudents();
}

async function openSubmission(submission) {
  selectedSubmissionId = submission.id;
  const fullName = [
    submission.last_name,
    submission.first_name,
    submission.middle_name
  ].filter(Boolean).join(" ");
  submissionDetailsSection.hidden = false;
  submissionDetailsTitle.textContent = `Работа студента: ${fullName}`;
  submissionStudent.textContent = `Студент: ${fullName}`;
  submissionStatus.textContent = `Статус: ${getSubmissionStatusLabel(submission.status)}`;
  submissionComment.textContent = `Комментарий студента: ${submission.student_comment || "Не указан"}`;
  submissionSubmittedAt.textContent = submission.submitted_at ? `Отправлено: ${new Date(submission.submitted_at).toLocaleString("ru-RU")}` : "Работа ещё не отправлена";
  submissionLate.textContent = submission.is_late ? "Работа отправлена после срока" : "";
  teacherSubmissionComment.value = submission.teacher_comment || "";
  submissionScoreInput.value = submission.score ?? "";
  await loadTeacherSubmissionFiles(submission.id);
  const editable = ["submitted","graded"].includes(submission.status);
  returnSubmissionButton.hidden = submission.status !== "submitted";
  gradeSubmissionButton.hidden = !editable;
  submissionScoreInput.disabled = !editable;
  teacherSubmissionComment.disabled = !["submitted", "graded"].includes(submission.status);
  selectedSubmissionMaxScore = Number(submission.max_score);
  submissionMaxScore.textContent = `/ ${submission.max_score}`;
  submissionScoreInput.max = submission.max_score;
}

async function deleteMaterialFile(fileId, fileName) {
  const confirmed = confirm(`Удалить файл "${fileName}"?`);
  if (!confirmed) return;
  try {
    const response = await fetch(`${apiUrl}/api/teacher/files/${fileId}`,{
      method: "DELETE",
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка удаления файла.";
      return;
    }
    message.textContent = data.message;
    await loadMaterialFiles(selectedMaterialId,selectedMaterialTitle);
  } catch (error) {
    console.error("Ошибка удаления файла:", error);
    message.textContent = "Не удалось удалить файл.";
  }
}

async function deleteAssignmentFile(fileId, fileName) {
  const confirmed = confirm(`Удалить файл "${fileName}"?`);
  if (!confirmed) return;
  try {
    const response = await fetch(`${apiUrl}/api/teacher/assignment-files/${fileId}`,{
      method: "DELETE",
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка удаления файла задания.";
      return;
    }
    message.textContent = data.message;
    await loadAssignmentFiles(selectedAssignmentId,selectedAssignmentTitle);
  } catch (error) {
    console.error("Ошибка удаления файла задания:", error);
    message.textContent = "Не удалось удалить файл задания.";
  }
}

function formatFileSize(sizeBytes) {
  const size = Number(sizeBytes);
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
}

function getSubmissionStatusLabel(status) {
  const labels = {
    draft: "В работе",
    submitted: "Отправлено",
    returned: "Возвращено на доработку",
    graded: "Проверено"
  };
  return labels[status] || status;
}

function getJournalCellText(submission, assignment) {
  if (!submission) return "—";
  if (submission.status === "draft") {
    return "В работе";
  }
  if (submission.status === "submitted") {
    return submission.is_late ? "На проверке (с опозданием)" : "На проверке";
  }
  if (submission.status === "returned") {
    return submission.is_late ? "Доработка (с опозданием)" : "Доработка";
  }
  if (submission.status === "graded") {
    const result = `${submission.score} / ${assignment.max_score}`;
    return submission.is_late ? `${result} (с опозданием)` : result;
  }
  return submission.status;
}

async function init() {
  const accessAllowed = await checkTeacherAccess();
  if (!accessAllowed) return;
  await loadPendingStudents();
  await loadGroups();
  await loadDisciplines();
  await loadCourseOptions();
  await loadCourses();
}
init();
