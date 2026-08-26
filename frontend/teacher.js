const apiUrl = "http://127.0.0.1:3000";
const studentsList = document.getElementById("studentsList");
const message = document.getElementById("message");
const logoutButton = document.getElementById("logoutButton");

logoutButton.addEventListener("click",async () => {
        try {
            const response = await fetch(
                `${apiUrl}/api/auth/logout`,
                {
                    method: "POST",
                    credentials: "include"
                }
            );
            if (!response.ok) {
                const data =
                    await response.json();
                message.textContent =
                    data.error ||
                    "Ошибка выхода.";
                return;
            }
            window.location.href =
                "login.html";
        } catch (error) {
            console.error(error);
            message.textContent =
                "Не удалось выйти из системы.";
        }
    }
);

async function checkTeacherAccess() {
    try {
        const response = await fetch(
            `${apiUrl}/api/auth/me`,
            {
                credentials: "include"
            }
        );
        if (response.status === 401) {
            window.location.href =
                "login.html";
            return false;
        }
        if (!response.ok) {
            throw new Error(
                "Ошибка проверки авторизации"
            );
        }
        const data = await response.json();
        if (data.user.role !== "teacher") {
            message.textContent =
                "У вас нет доступа к кабинету преподавателя.";
            return false;
        }
        return true;
    } catch (error) {
        console.error(error);
        message.textContent =
            "Не удалось проверить авторизацию.";
        return false;
    }
}

async function loadPendingStudents() {
    try {
        const response = await fetch(
            `${apiUrl}/api/students/pending`,
            {
                credentials: "include"
            }
        );
        if (!response.ok) {
            throw new Error(
                "Не удалось получить список студентов"
            );
        }
        const students = await response.json();
        studentsList.innerHTML = "";
        if (students.length === 0) {
            studentsList.textContent = "Нет заявок на подтверждение.";
            return;
        }
        for (const student of students) {
            const container =
                document.createElement("div");
            const fullName = [
                student.last_name,
                student.first_name,
                student.middle_name
            ]
            .filter(Boolean)
            .join(" ");
            const info =
                document.createElement("span");
            info.textContent =
                `${fullName} | ` +
                `${student.group_name ?? "Без группы"} | ` +
                `${student.email} `;
            const approveButton =
                document.createElement("button");
            approveButton.textContent =
                "Подтвердить";
            approveButton.addEventListener(
                "click",
                async () => {
                    await approveStudent(
                        student.id
                    );
                }
            );
            const rejectButton =
                document.createElement("button");
            rejectButton.textContent =
                "Отклонить";
            rejectButton.addEventListener(
                "click",
                async () => {
                    await rejectStudent(
                        student.id
                    );
                }
            );
            container.appendChild(info);
            container.appendChild(approveButton);
            container.appendChild(rejectButton);
            studentsList.appendChild(container);
        }
    } catch (error) {
        console.error(error);
        message.textContent =
            "Ошибка загрузки списка студентов.";
    }
}

async function approveStudent(studentId) {
    const response = await fetch(
        `${apiUrl}/api/students/${studentId}/approve`,
        {
            method: "PATCH",
            credentials: "include"
        }
    );
    const data = await response.json();
    if (!response.ok) {
        message.textContent =
            data.error || "Ошибка подтверждения.";
        return;
    }
    message.textContent = data.message;
    await loadPendingStudents();
}

async function rejectStudent(studentId) {
    const response = await fetch(
        `${apiUrl}/api/students/${studentId}/reject`,
        {
            method: "PATCH",
            credentials: "include"
        }
    );
    const data = await response.json();
    if (!response.ok) {
        message.textContent =
            data.error || "Ошибка отклонения.";
        return;
    }
    message.textContent = data.message;
    await loadPendingStudents();
}

async function init() {
    const accessAllowed =
        await checkTeacherAccess();
    if (!accessAllowed) {
        return;
    }
    await loadPendingStudents();
}

init();