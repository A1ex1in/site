const apiUrl = "http://127.0.0.1:3000";
const profile = document.getElementById("profile");
const message = document.getElementById("message");
const logoutButton = document.getElementById("logoutButton");
const coursesList = document.getElementById("coursesList");
const courseMaterialsSection = document.getElementById("courseMaterialsSection");
const courseMaterialsTitle = document.getElementById("courseMaterialsTitle");
const materialsList = document.getElementById("materialsList");
const materialFilesSection = document.getElementById("materialFilesSection");
const materialFilesTitle = document.getElementById("materialFilesTitle");
const materialFilesList = document.getElementById("materialFilesList");
const courseAssignmentsSection = document.getElementById("courseAssignmentsSection");
const courseAssignmentsTitle = document.getElementById("courseAssignmentsTitle");
const assignmentsList = document.getElementById("assignmentsList");
const assignmentFilesSection = document.getElementById("assignmentFilesSection");
const assignmentFilesTitle = document.getElementById("assignmentFilesTitle");
const assignmentFilesList = document.getElementById("assignmentFilesList");
const submissionSection = document.getElementById("submissionSection");
const submissionTitle = document.getElementById("submissionTitle");
const submissionStatus = document.getElementById("submissionStatus");
const submissionSubmittedAt = document.getElementById("submissionSubmittedAt");
const submissionForm = document.getElementById("submissionForm");
const submissionComment = document.getElementById("submissionComment");
const saveSubmissionButton = document.getElementById("saveSubmissionButton");
const submissionFeedback = document.getElementById("submissionFeedback");
const submissionScore = document.getElementById("submissionScore");
const submissionTeacherComment = document.getElementById("submissionTeacherComment");
const submissionCheckedAt = document.getElementById("submissionCheckedAt");
const submissionFileForm = document.getElementById("submissionFileForm");
const submissionFileInput = document.getElementById("submissionFileInput");
const uploadSubmissionFileButton = document.getElementById("uploadSubmissionFileButton");
const submissionFilesList = document.getElementById("submissionFilesList");
const submitSubmissionButton = document.getElementById("submitSubmissionButton");

let selectedSubmissionAssignmentId = null;
let selectedSubmissionAssignmentTitle = "";
let currentSubmission = null;

logoutButton.addEventListener("click",async () => {
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

submissionForm.addEventListener("submit",async (event) => {
  event.preventDefault();
  if (!selectedSubmissionAssignmentId) {
    message.textContent = "Сначала выберите задание.";
    return;
  }
  try {
    const response = await fetch(`${apiUrl}/api/student/assignments/${selectedSubmissionAssignmentId}/submission`,{
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        studentComment: submissionComment.value
      })
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка сохранения работы.";
      return;
    }
    message.textContent = data.message;
    currentSubmission = data.submission;
    renderSubmission();
    await loadSubmissionFiles();
  } catch (error) {
    console.error("Ошибка сохранения работы:", error);
    message.textContent = "Не удалось сохранить работу.";
  }
});

submissionFileForm.addEventListener("submit",async (event) => {
  event.preventDefault();
  if (!selectedSubmissionAssignmentId || !currentSubmission) {
    message.textContent = "Сначала сохраните черновик работы.";
    return;
  }
  const file = submissionFileInput.files[0];
  if (!file) {
    message.textContent = "Выберите файл.";
    return;
  }
  const formData = new FormData();
  formData.append("file",file);
  try {
    const response = await fetch(`${apiUrl}/api/student/assignments/${selectedSubmissionAssignmentId}/submission/files`,{
      method: "POST",
      credentials: "include",
      body: formData
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка загрузки файла работы.";
      return;
    }
    message.textContent = data.message;
    submissionFileForm.reset();
    await loadSubmissionFiles();
  } catch (error) {
    console.error("Ошибка загрузки файла работы:", error);
    message.textContent = "Не удалось загрузить файл работы.";
  }
});

submitSubmissionButton.addEventListener("click",async () => {
  if (!selectedSubmissionAssignmentId || !currentSubmission) {
    message.textContent = "Сначала сохраните работу.";
    return;
  }
  const confirmed = confirm("Отправить работу преподавателю? После отправки изменить её будет нельзя.");
  if (!confirmed) return;
  try {
    const response = await fetch(`${apiUrl}/api/student/assignments/${selectedSubmissionAssignmentId}/submission/submit`,{
      method: "POST",
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка отправки работы.";
      return;
    }
    message.textContent = data.message;
    currentSubmission = data.submission;
    renderSubmission();
    await loadSubmissionFiles();
  } catch (error) {
    console.error("Ошибка отправки работы:", error);
    message.textContent = "Не удалось отправить работу.";
  }
});

async function loadProfile() {
  try {
    const response = await fetch(`${apiUrl}/api/student/profile`,
      {
        credentials: "include"
      }
    );
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка загрузки профиля.";
      return;
    }
    const student = data.student;
    const fullName = [student.lastName, student.firstName, student.middleName].filter(Boolean).join(" ");
    profile.innerHTML = "";
    const nameElement = document.createElement("p");
    nameElement.textContent = `ФИО: ${fullName}`;
    const emailElement = document.createElement("p");
    emailElement.textContent = `Email: ${student.email}`;
    const groupElement = document.createElement("p");
    groupElement.textContent = `Группа: ${student.group ? student.group.name : "Не назначена"}`;
    const numberElement = document.createElement("p");
    numberElement.textContent = `Номер студента: ${student.studentNumber ?? "Не указан"}`;
    profile.appendChild(nameElement);
    profile.appendChild(emailElement);
    profile.appendChild(groupElement);
    profile.appendChild(numberElement);
  } catch (error) {
    console.error(error);
    message.textContent = "Не удалось загрузить профиль.";
  }
}

async function loadCourses() {
  try {
    const response = await fetch(`${apiUrl}/api/student/courses`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка загрузки учебных курсов.";
      return;
    }
    coursesList.innerHTML = "";
    if (data.length === 0) {
      coursesList.textContent = "Учебные курсы пока не назначены.";
      return;
    }
    for (const course of data) {
      const container = document.createElement("div");
      const teacherName = [
        course.teacher_last_name,
        course.teacher_first_name,
        course.teacher_middle_name
      ].filter(Boolean).join(" ");
      const titleElement = document.createElement("strong");
      titleElement.textContent = course.discipline_name;

      const infoElement = document.createElement("span");
      infoElement.textContent = ` — ${course.academic_year} — ${course.semester} семестр — ${teacherName}`;

      const materialsButton = document.createElement("button");
      materialsButton.textContent = "Материалы";
      materialsButton.addEventListener("click",async () => { await loadMaterials(course.id,course.discipline_name); });

      const assignmentsButton = document.createElement("button");
      assignmentsButton.textContent = "Задания";
      assignmentsButton.addEventListener("click",async () => { await loadAssignments(course.id,course.discipline_name); });

      container.appendChild(titleElement);
      container.appendChild(infoElement);
      container.appendChild(materialsButton);
      container.appendChild(assignmentsButton);
      coursesList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки учебных курсов:", error);
    message.textContent = "Не удалось загрузить учебные курсы.";
  }
}

async function loadMaterials(courseId, courseName) {
  try {
    const response = await fetch(`${apiUrl}/api/student/courses/${courseId}/materials`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка загрузки материалов.";
      return;
    }
    courseMaterialsSection.hidden = false;
    courseMaterialsTitle.textContent = `Материалы курса: ${courseName}`;
    materialsList.innerHTML = "";
    materialFilesSection.hidden = true;
    if (data.materials.length === 0) {
      materialsList.textContent = "Опубликованных материалов пока нет.";
      return;
    }
    for (const material of data.materials) {
      const container = document.createElement("div");
      const titleElement = document.createElement("strong");
      titleElement.textContent = material.title;
      const infoElement = document.createElement("span");
      infoElement.textContent = ` — ${material.material_type}`;
      const descriptionElement = document.createElement("p");
      descriptionElement.textContent = material.description || "Описание отсутствует.";
      const filesButton = document.createElement("button");
      filesButton.textContent = "Файлы";
      filesButton.addEventListener("click",async () => { await loadMaterialFiles(material.id,material.title); });
      container.appendChild(titleElement);
      container.appendChild(infoElement);
      container.appendChild(descriptionElement);
      container.appendChild(filesButton);
      materialsList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки материалов:", error);
    message.textContent = "Не удалось загрузить материалы курса.";
  }
}

async function loadAssignments(courseId, courseName) {
  try {
    const response = await fetch(`${apiUrl}/api/student/courses/${courseId}/assignments`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка загрузки заданий.";
      return;
    }

    courseAssignmentsSection.hidden = false;
    courseAssignmentsTitle.textContent = `Задания курса: ${courseName}`;
    assignmentsList.innerHTML = "";
    assignmentFilesSection.hidden = true;
    submissionSection.hidden = true;
    selectedSubmissionAssignmentId = null;
    selectedSubmissionAssignmentTitle = "";
    currentSubmission = null;

    if (data.assignments.length === 0) {
      assignmentsList.textContent = "Опубликованных заданий пока нет.";
      return;
    }
    for (const assignment of data.assignments) {
      const container = document.createElement("div");

      const titleElement = document.createElement("strong");
      titleElement.textContent = assignment.title;

      const scoreElement = document.createElement("span");
      scoreElement.textContent = ` — максимум: ${assignment.max_score}`;

      const descriptionElement = document.createElement("p");
      descriptionElement.textContent = assignment.description || "Описание отсутствует.";

      const deadlineElement = document.createElement("p");
      deadlineElement.textContent = assignment.deadline ? `Срок выполнения: ${new Date(assignment.deadline).toLocaleString("ru-RU")}` : "Срок выполнения: не установлен";

      const filesButton = document.createElement("button");
      filesButton.textContent = "Файлы";
      filesButton.addEventListener("click", async () => { await loadAssignmentFiles(assignment.id, assignment.title); });

      const submissionButton = document.createElement("button");
      submissionButton.textContent = "Моя работа";
      submissionButton.addEventListener("click", async () => { await loadSubmission(assignment.id, assignment.title); });

      container.appendChild(titleElement);
      container.appendChild(scoreElement);
      container.appendChild(descriptionElement);
      container.appendChild(deadlineElement);
      container.appendChild(filesButton);
      container.appendChild(submissionButton);
      assignmentsList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки заданий:", error);
    message.textContent = "Не удалось загрузить задания курса.";
  }
}

async function loadMaterialFiles(materialId, materialTitle) {
  try {
    const response = await fetch(`${apiUrl}/api/student/materials/${materialId}/files`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения файлов материала.";
      return;
    }
    materialFilesSection.hidden = false;
    materialFilesTitle.textContent = `Файлы материала: ${materialTitle}`;
    materialFilesList.innerHTML = "";
    if (data.length === 0) {
      materialFilesList.textContent = "Файлы пока не добавлены.";
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
      container.appendChild(downloadButton);
      container.appendChild(infoElement);
      materialFilesList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки файлов материала:", error);
    message.textContent = "Не удалось загрузить файлы материала.";
  }
}

async function loadAssignmentFiles(assignmentId, assignmentTitle) {
  try {
    const response = await fetch(`${apiUrl}/api/student/assignments/${assignmentId}/files`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения файлов задания.";
      return;
    }
    assignmentFilesSection.hidden = false;
    assignmentFilesTitle.textContent = `Файлы задания: ${assignmentTitle}`;
    assignmentFilesList.innerHTML = "";
    if (data.length === 0) {
      assignmentFilesList.textContent = "Файлы к заданию не прикреплены.";
      return;
    }
    for (const file of data) {
      const container = document.createElement("div");
      const downloadButton = document.createElement("button");
      downloadButton.textContent = file.original_name;
      downloadButton.addEventListener("click",async () => {
        await downloadAssignmentFile(assignmentId,file);
      });
      const infoElement = document.createElement("span");
      infoElement.textContent = ` — ${formatFileSize(file.size_bytes)}`;
      if (file.source === "material" && file.material_title) {
        infoElement.textContent += ` — из материала: ${file.material_title}`;
      }
      container.appendChild(downloadButton);
      container.appendChild(infoElement);
      assignmentFilesList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки файлов задания:", error);
    message.textContent = "Не удалось загрузить файлы задания.";
  }
}

async function loadSubmission(assignmentId, assignmentTitle) {
  try {
    const response = await fetch(`${apiUrl}/api/student/assignments/${assignmentId}/submission`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения работы.";
      return;
    }
    selectedSubmissionAssignmentId = assignmentId;
    selectedSubmissionAssignmentTitle = assignmentTitle;
    currentSubmission = data.submission;
    submissionSection.hidden = false;
    submissionTitle.textContent = `Моя работа: ${assignmentTitle}`;
    renderSubmission();
    if (currentSubmission) {
      await loadSubmissionFiles();
    } else {
      submissionFilesList.textContent = "Сначала сохраните черновик работы.";
    }
  } catch (error) {
    console.error("Ошибка загрузки работы:", error);
    message.textContent = "Не удалось загрузить работу.";
  }
}

async function loadSubmissionFiles() {
  try {
    const response = await fetch(`${apiUrl}/api/student/assignments/${selectedSubmissionAssignmentId}/submission/files`,{
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка получения файлов работы.";
      return;
    }
    submissionFilesList.innerHTML = "";
    if (data.length === 0) {
      submissionFilesList.textContent = "Файлы работы пока не загружены.";
      return;
    }
    const editable = currentSubmission && ["draft","returned"].includes(currentSubmission.status);
    for (const file of data) {
      const container = document.createElement("div");
      const downloadButton = document.createElement("button");
      downloadButton.textContent = file.original_name;
      downloadButton.addEventListener("click",async () => {
        await downloadSubmissionFile(file.id,file.original_name);
      });
      const infoElement = document.createElement("span");
      infoElement.textContent = ` — ${formatFileSize(file.size_bytes)} — ${file.mime_type}`;
      container.appendChild(downloadButton);
      container.appendChild(infoElement);
      if (editable) {
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Удалить";
        deleteButton.addEventListener("click",async () => {
          await deleteSubmissionFile(file.id,file.original_name);
        });
        container.appendChild(deleteButton);
      }
      submissionFilesList.appendChild(container);
    }
  } catch (error) {
    console.error("Ошибка загрузки файлов работы:", error);
    message.textContent = "Не удалось загрузить файлы работы.";
  }
}

async function checkStudentAccess() {
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
    if (data.user.role !== "student") {
      message.textContent = "У вас нет доступа к кабинету студента.";
      profile.textContent = "";
      return false;
    }
    return true;
  } catch (error) {
    console.error(error);
    message.textContent = "Не удалось проверить авторизацию.";
    return false;
  }
}

async function downloadMaterialFile(fileId, fileName) {
  try {
    const response = await fetch(`${apiUrl}/api/student/files/${fileId}/download`,{
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

async function downloadAssignmentFile(assignmentId, file) {
  try {
    const response = await fetch(`${apiUrl}/api/student/assignments/${assignmentId}/files/${file.source}/${file.id}/download`,{
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
    link.download = file.original_name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Ошибка скачивания файла задания:", error);
    message.textContent = "Не удалось скачать файл.";
  }
}

async function downloadSubmissionFile(fileId, fileName) {
  try {
    const response = await fetch(`${apiUrl}/api/student/submission-files/${fileId}/download`,{
      credentials: "include"
    });
    if (!response.ok) {
      const data = await response.json();
      message.textContent = data.error || "Ошибка скачивания файла работы.";
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

async function deleteSubmissionFile(fileId, fileName) {
  const confirmed = confirm(`Удалить файл "${fileName}"?`);
  if (!confirmed) return;
  try {
    const response = await fetch(`${apiUrl}/api/student/submission-files/${fileId}`,{
      method: "DELETE",
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка удаления файла работы.";
      return;
    }
    message.textContent = data.message;
    await loadSubmissionFiles();
  } catch (error) {
    console.error("Ошибка удаления файла работы:", error);
    message.textContent = "Не удалось удалить файл работы.";
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
    draft: "Черновик",
    submitted: "Отправлено преподавателю",
    returned: "Возвращено на доработку",
    graded: "Проверено"
  };
  return labels[status] || status;
}

function renderSubmission() {
  submissionFeedback.hidden = true;
  submissionSubmittedAt.textContent = "";
  submissionScore.textContent = "";
  submissionTeacherComment.textContent = "";
  submissionCheckedAt.textContent = "";
  if (!currentSubmission) {
    submissionStatus.textContent = "Статус: работа ещё не создана";
    submissionComment.value = "";
    submissionComment.disabled = false;
    saveSubmissionButton.hidden = false;
    submissionFileInput.disabled = true;
    uploadSubmissionFileButton.disabled = true;
    submitSubmissionButton.hidden = true;
    return;
  }
  const editable = ["draft","returned"].includes(currentSubmission.status);
  submissionStatus.textContent = `Статус: ${getSubmissionStatusLabel(currentSubmission.status)}`;
  submissionComment.value = currentSubmission.student_comment || "";
  submissionComment.disabled = !editable;
  saveSubmissionButton.hidden = !editable;
  submissionFileInput.disabled = !editable;
  uploadSubmissionFileButton.disabled = !editable;
  submitSubmissionButton.hidden = !editable;
  if (currentSubmission.submitted_at) {
    submissionSubmittedAt.textContent = `Отправлено: ${new Date(currentSubmission.submitted_at).toLocaleString("ru-RU")}`;
  }
  if (currentSubmission.teacher_comment || currentSubmission.score !== null || currentSubmission.checked_at) {
    submissionFeedback.hidden = false;
    if (currentSubmission.score !== null) {
      submissionScore.textContent = `Оценка: ${currentSubmission.score}`;
    }
    if (currentSubmission.teacher_comment) {
      submissionTeacherComment.textContent = `Комментарий преподавателя: ${currentSubmission.teacher_comment}`;
    }
    if (currentSubmission.checked_at) {
      submissionCheckedAt.textContent = `Проверено: ${new Date(currentSubmission.checked_at).toLocaleString("ru-RU")}`;
    }
  }
}

async function init() {
  const accessAllowed = await checkStudentAccess();
  if (!accessAllowed) {
    return;
  }
  await loadProfile();
  await loadCourses();
}


init();
