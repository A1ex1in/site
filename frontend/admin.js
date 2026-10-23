const apiUrl = window.location.port === "3001" ? "http://127.0.0.1:3000" : window.location.origin;
const message = document.getElementById("message");
const logoutButton = document.getElementById("logoutButton");
const userForm = document.getElementById("userForm");
const userRole = document.getElementById("userRole");
const userGroup = document.getElementById("userGroup");
const userRoleFilter = document.getElementById("userRoleFilter");
const usersList = document.getElementById("adminUsersList");
const teacherLoadBody = document.getElementById("teacherLoadBody");
const attendanceGroups = document.getElementById("attendanceGroups");
const accountStatusGrid = document.getElementById("accountStatusGrid");

const roleLabels = { teacher: "Преподаватель", student: "Студент" };
const statusLabels = { active: "Активен", blocked: "Заблокирован", pending: "Ожидает", rejected: "Отклонён" };

async function api(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, { credentials: "include", ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Ошибка запроса");
  return data;
}

function fullName(user) {
  return [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(" ");
}

function updateRoleFields() {
  const isStudent = userRole.value === "student";
  document.querySelectorAll(".student-only").forEach((element) => { element.hidden = !isStudent; });
  userGroup.required = isStudent;
}

async function loadGroups() {
  const groups = await api("/api/groups");
  userGroup.innerHTML = "";
  groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    userGroup.appendChild(option);
  });
}

function renderUsers(users) {
  usersList.innerHTML = "";
  if (users.length === 0) {
    usersList.textContent = "Пользователей пока нет.";
    return;
  }
  users.forEach((user) => {
    const row = document.createElement("div");
    row.className = "admin-user-row";
    const details = document.createElement("div");
    details.className = "admin-user-details";
    const name = document.createElement("strong");
    name.textContent = fullName(user);
    const meta = document.createElement("span");
    const extras = user.role === "student" ? [user.group_name, user.student_number].filter(Boolean).join(" · ") : "";
    meta.textContent = `${roleLabels[user.role]} · ${user.email}${extras ? ` · ${extras}` : ""}`;
    const badge = document.createElement("span");
    badge.className = `status-badge status-${user.status}`;
    badge.textContent = statusLabels[user.status] || user.status;
    details.append(name, meta);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = user.status === "blocked" ? "Разблокировать" : "Заблокировать";
    if (user.status !== "blocked") toggle.classList.add("danger-action");
    toggle.addEventListener("click", async () => {
      toggle.disabled = true;
      try {
        const result = await api(`/api/admin/users/${user.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: user.status === "blocked" ? "active" : "blocked" })
        });
        message.textContent = result.message;
        await Promise.all([loadUsers(), loadOverview()]);
      } catch (error) {
        message.textContent = error.message;
      } finally {
        toggle.disabled = false;
      }
    });
    row.append(details, badge, window.EduUI.createActionGroup(toggle));
    usersList.appendChild(row);
  });
}

async function loadUsers() {
  try {
    const query = userRoleFilter.value ? `?role=${userRoleFilter.value}` : "";
    renderUsers(await api(`/api/admin/users${query}`));
  } catch (error) {
    usersList.textContent = error.message;
  }
}

function renderTeacherLoad(items) {
  teacherLoadBody.innerHTML = "";
  if (items.length === 0) {
    const row = teacherLoadBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 6;
    cell.textContent = "Активных преподавателей пока нет.";
    return;
  }
  items.forEach((teacher) => {
    const row = teacherLoadBody.insertRow();
    [fullName(teacher), teacher.courses, teacher.groups, teacher.students, teacher.lessons, teacher.assignments].forEach((value) => {
      const cell = row.insertCell();
      cell.textContent = value;
    });
  });
}

function renderAttendance(items) {
  attendanceGroups.innerHTML = "";
  if (items.length === 0) {
    attendanceGroups.textContent = "Учебных групп пока нет.";
    return;
  }
  items.forEach((group) => {
    const rate = group.attendance_rate == null ? null : Number(group.attendance_rate);
    const item = document.createElement("article");
    item.className = "attendance-stat";
    const heading = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = group.name;
    const value = document.createElement("span");
    value.textContent = rate == null ? "Нет данных" : `${rate}%`;
    heading.append(name, value);
    const track = document.createElement("div");
    track.className = "metric-track";
    const fill = document.createElement("span");
    fill.style.width = `${rate || 0}%`;
    track.appendChild(fill);
    const caption = document.createElement("small");
    caption.textContent = group.marked ? `Отметок: ${group.marked}, посещений: ${group.attended}` : "Преподаватели ещё не заполняли посещаемость";
    item.append(heading, track, caption);
    attendanceGroups.appendChild(item);
  });
}

function renderStatuses(items) {
  accountStatusGrid.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("article");
    const value = document.createElement("strong");
    value.textContent = item.count;
    const label = document.createElement("span");
    label.textContent = `${roleLabels[item.role]} · ${statusLabels[item.status] || item.status}`;
    card.append(value, label);
    accountStatusGrid.appendChild(card);
  });
}

async function loadOverview() {
  const data = await api("/api/admin/overview");
  const totalUsers = Number(data.summary.teachers) + Number(data.summary.students);
  document.getElementById("statCourses").textContent = totalUsers;
  document.getElementById("statPeople").textContent = data.summary.teachers;
  document.getElementById("statTasks").textContent = data.summary.attendance_rate == null ? "—" : `${data.summary.attendance_rate}%`;
  document.getElementById("statSystem").textContent = data.summary.active_courses;
  renderTeacherLoad(data.teacherLoad);
  renderAttendance(data.attendanceByGroup);
  renderStatuses(data.userStatuses);
}

userRole.addEventListener("change", updateRoleFields);
userRoleFilter.addEventListener("change", loadUsers);

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = userForm.querySelector("button[type='submit']");
  button.disabled = true;
  try {
    const result = await api("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: userRole.value,
        email: document.getElementById("userEmail").value.trim(),
        password: document.getElementById("userPassword").value,
        firstName: document.getElementById("userFirstName").value.trim(),
        lastName: document.getElementById("userLastName").value.trim(),
        middleName: document.getElementById("userMiddleName").value.trim(),
        phone: document.getElementById("userPhone").value.trim(),
        groupId: userRole.value === "student" ? userGroup.value : null,
        studentNumber: document.getElementById("userStudentNumber").value.trim()
      })
    });
    message.textContent = result.message;
    userForm.reset();
    updateRoleFields();
    await Promise.all([loadUsers(), loadOverview()]);
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  try { await api("/api/auth/logout", { method: "POST" }); } catch (error) { console.error(error); }
  window.location.href = "login.html";
});

(async function init() {
  try {
    const auth = await api("/api/auth/me");
    if (auth.user.role !== "admin") {
      window.location.href = "login.html";
      return;
    }
    window.EduUI.setUser(auth.user);
    updateRoleFields();
    await loadGroups();
    await Promise.all([loadUsers(), loadOverview()]);
  } catch (error) {
    window.location.href = "login.html";
  }
})();
