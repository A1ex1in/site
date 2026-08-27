const apiUrl = "http://127.0.0.1:3000";
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

let selectedStudentId = null;
let selectedGroupId = null;
let selectedStudentStatus = null;

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

groupForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const name =
            groupNameInput.value.trim();

        const description =
            groupDescriptionInput.value.trim();


        if (!name) {

            message.textContent =
                "Введите название группы.";

            return;
        }


        try {

            const response = await fetch(
                `${apiUrl}/api/teacher/groups`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        name,
                        description
                    })
                }
            );


            const data =
                await response.json();


            if (!response.ok) {

                message.textContent =
                    data.error ||
                    "Ошибка создания группы.";

                return;
            }


            message.textContent =
                data.message;


            groupForm.reset();


            await loadGroups();

        } catch (error) {

            console.error(
                "Ошибка создания группы:",
                error
            );

            message.textContent =
                "Не удалось создать группу.";
        }
    }
);

changeGroupForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        if (!selectedStudentId) {
            return;
        }


        const groupId =
            studentGroupSelect.value;


        try {

            const response = await fetch(
                `${apiUrl}/api/teacher/students/${selectedStudentId}/group`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
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

            await loadStudentDetails(
                selectedStudentId
            );

            await loadGroups();

            if (selectedGroupId) {
                await loadGroupStudents(
                    selectedGroupId
                );
            }

        } catch (error) {

            console.error(
                "Ошибка изменения группы:",
                error
            );

            message.textContent =
                "Не удалось изменить группу.";
        }
    }
);

studentStatusButton.addEventListener(
    "click",
    async () => {

        if (!selectedStudentId) {
            return;
        }


        const newStatus =
            selectedStudentStatus === "blocked"
                ? "active"
                : "blocked";


        try {

            const response = await fetch(
                `${apiUrl}/api/teacher/students/${selectedStudentId}/status`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        status: newStatus
                    })
                }
            );


            const data =
                await response.json();


            if (!response.ok) {

                message.textContent =
                    data.error ||
                    "Ошибка изменения статуса.";

                return;
            }


            message.textContent =
                data.message;


            await loadStudentDetails(
                selectedStudentId
            );


            await loadGroups();


            if (selectedGroupId) {

                await loadGroupStudents(
                    selectedGroupId
                );
            }

        } catch (error) {

            console.error(
                "Ошибка изменения статуса:",
                error
            );

            message.textContent =
                "Не удалось изменить статус студента.";
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

async function loadGroups() {

    try {

        const response = await fetch(
            `${apiUrl}/api/teacher/groups`,
            {
                credentials: "include"
            }
        );


        const data = await response.json();


        if (!response.ok) {

            message.textContent =
                data.error ||
                "Ошибка получения групп.";

            return;
        }


        groupsList.innerHTML = "";


        if (data.length === 0) {

            groupsList.textContent =
                "Учебные группы пока не созданы.";

            return;
        }


        for (const group of data) {

            const container =
                document.createElement("div");


            const nameElement =
                document.createElement("strong");

            nameElement.textContent =
                group.name;


            const descriptionElement =
                document.createElement("span");

            descriptionElement.textContent =
                group.description
                    ? ` — ${group.description}`
                    : "";


            const countElement =
                document.createElement("span");

            countElement.textContent =
                ` — студентов: ${group.student_count}`;


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

            container.appendChild(openButton);
            groupsList.appendChild(container);
        }

    } catch (error) {

        console.error(
            "Ошибка загрузки групп:",
            error
        );

        message.textContent =
            "Не удалось загрузить список групп.";
    }
}

async function loadGroupStudents(groupId) {
    selectedGroupId = groupId;
    try {

        const response = await fetch(
            `${apiUrl}/api/teacher/groups/${groupId}/students`,
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
            const fullName = [
                student.last_name,
                student.first_name,
                student.middle_name
            ].filter(Boolean).join(" ");
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
            openButton.addEventListener( "click",async () => {
                    await loadStudentDetails(
                        student.id
                    );
                }
            );

            container.appendChild(nameElement);
            container.appendChild(infoElement);
            container.appendChild(openButton);

            groupStudentsList.appendChild(container);
        }

    } catch (error) {

        console.error(
            "Ошибка загрузки студентов группы:",
            error
        );

        message.textContent =
            "Не удалось загрузить студентов группы.";
    }
}

async function loadStudentDetails(studentId) {

    try {

        const response = await fetch(
            `${apiUrl}/api/teacher/students/${studentId}`,
            {
                credentials: "include"
            }
        );


        const data = await response.json();


        if (!response.ok) {

            message.textContent =
                data.error ||
                "Ошибка получения студента.";

            return;
        }


        const student = data.student;
        
        selectedStudentId = student.id;
        selectedStudentStatus = student.status;

        const fullName = [
            student.last_name,
            student.first_name,
            student.middle_name
        ]
        .filter(Boolean)
        .join(" ");


        studentDetails.innerHTML = "";


        const nameElement =
            document.createElement("p");

        nameElement.textContent =
            `ФИО: ${fullName}`;


        const emailElement =
            document.createElement("p");

        emailElement.textContent =
            `Email: ${student.email}`;


        const numberElement =
            document.createElement("p");

        numberElement.textContent =
            `Номер студента: ${
                student.student_number ?? "Не указан"
            }`;


        const statusElement =
            document.createElement("p");

        statusElement.textContent =
            `Статус: ${student.status}`;


        const groupElement =
            document.createElement("p");

        groupElement.textContent =
            `Группа: ${
                student.group_name ?? "Не назначена"
            }`;


        studentDetails.appendChild(nameElement);
        studentDetails.appendChild(emailElement);
        studentDetails.appendChild(numberElement);
        studentDetails.appendChild(statusElement);
        studentDetails.appendChild(groupElement);


        await loadGroupsForStudent(
            student.group_id
        );

        if (student.status === "blocked") {
            studentStatusButton.textContent = "Разблокировать";
        } else {
            studentStatusButton.textContent = "Заблокировать";
        }

        studentDetailsSection.hidden = false;

    } catch (error) {

        console.error(
            "Ошибка загрузки студента:",
            error
        );

        message.textContent =
            "Не удалось загрузить данные студента.";
    }
}

async function loadGroupsForStudent(currentGroupId) {

    const response = await fetch(
        `${apiUrl}/api/teacher/groups`,
        {
            credentials: "include"
        }
    );


    const groups = await response.json();


    if (!response.ok) {

        message.textContent =
            groups.error ||
            "Ошибка получения групп.";

        return;
    }


    studentGroupSelect.innerHTML = "";


    for (const group of groups) {

        if (!group.is_active) {
            continue;
        }


        const option =
            document.createElement("option");

        option.value =
            group.id;

        option.textContent =
            group.name;


        if (
            String(group.id) ===
            String(currentGroupId)
        ) {
            option.selected = true;
        }


        studentGroupSelect.appendChild(option);
    }
}


async function init() {

    const accessAllowed = await checkTeacherAccess();

    if (!accessAllowed) {
        return;
    }


    await loadPendingStudents();

    await loadGroups();
}

init();