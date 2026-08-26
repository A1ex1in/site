const apiUrl = "http://127.0.0.1:3000";
const profile = document.getElementById("profile");
const message = document.getElementById("message");
const logoutButton = document.getElementById("logoutButton");


async function checkStudentAccess() {
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
        const data =
            await response.json();
        if (data.user.role !== "student") {
            message.textContent =
                "У вас нет доступа к кабинету студента.";

            profile.textContent = "";
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

async function loadProfile() {
    try {
        const response = await fetch(
            `${apiUrl}/api/student/profile`,
            {
                credentials: "include"
            }
        );
        const data =
            await response.json();
        if (!response.ok) {
            message.textContent =
                data.error ||
                "Ошибка загрузки профиля.";
            return;
        }
        const student =
            data.student;
        const fullName = [
            student.lastName,
            student.firstName,
            student.middleName
        ].filter(Boolean).join(" ");
        profile.innerHTML = "";
        const nameElement = document.createElement("p");
        nameElement.textContent = `ФИО: ${fullName}`;
        const emailElement = document.createElement("p");
        emailElement.textContent = `Email: ${student.email}`;
        const groupElement = document.createElement("p");
        groupElement.textContent =
            `Группа: ${
                student.group
                    ? student.group.name
                    : "Не назначена"
            }`;
        const numberElement = document.createElement("p");
        numberElement.textContent =
            `Номер студента: ${
                student.studentNumber ??
                "Не указан"
            }`;
        profile.appendChild(nameElement);
        profile.appendChild(emailElement);
        profile.appendChild(groupElement);
        profile.appendChild(numberElement);
    } catch (error) {
        console.error(error);
        message.textContent = "Не удалось загрузить профиль.";
    }
}

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

async function init() {
    const accessAllowed = await checkStudentAccess();
    if (!accessAllowed) {
        return;
    }
    await loadProfile();
}

init();