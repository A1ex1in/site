const apiUrl = "http://127.0.0.1:3000";
const form = document.getElementById("loginForm");
const message =  document.getElementById("message");
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email =
        document
            .getElementById("email")
            .value
            .trim();
    const password =
        document
            .getElementById("password")
            .value;
    message.textContent = "Выполняется вход...";
    try {
        const response = await fetch(
            `${apiUrl}/api/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    email,
                    password
                })
            }
        );
        const data = await response.json();
        if (!response.ok) {
            message.textContent =
                data.error || "Ошибка входа.";
            return;
        }
        const user = data.user;
        if (user.role === "teacher") {
            window.location.href =
                "teacher.html";
            return;
        }
        if (user.role === "student") {
            message.textContent =
                "Вход выполнен. Кабинет студента пока не создан.";
            return;
        }
        message.textContent =
            "Неизвестная роль пользователя.";
    } catch (error) {
        console.error(
            "Ошибка запроса авторизации:",
            error
        );
        message.textContent =
            "Не удалось связаться с сервером.";
    }
});