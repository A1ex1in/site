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

function formatFileSize(sizeBytes) {
  const size = Number(sizeBytes);
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
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
      materialsButton.addEventListener("click",async () => {
        await loadMaterials(course.id,course.discipline_name);
      });
      container.appendChild(titleElement);
      container.appendChild(infoElement);
      container.appendChild(materialsButton);
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


async function init() {
  const accessAllowed = await checkStudentAccess();
  if (!accessAllowed) {
    return;
  }
  await loadProfile();
  await loadCourses();
}


init();
