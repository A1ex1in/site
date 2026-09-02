const apiUrl = "http://127.0.0.1:3000";
const form = document.getElementById("registerForm");
const groupSelect = document.getElementById("group");
const message = document.getElementById("message");

async function loadGroups() {
  try {
    const response = await fetch(`${apiUrl}/api/groups`);
    if (!response.ok) {
      throw new Error("Не удалось загрузить группы");
    }
    const groups = await response.json();
    groupSelect.innerHTML = "";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Выберите группу";
    groupSelect.appendChild(emptyOption);
    for (const group of groups) {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.name;
      groupSelect.appendChild(option);
    }
  } catch (error) {
    console.error(error);
    groupSelect.innerHTML = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Ошибка загрузки групп";
    groupSelect.appendChild(option);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const middleName = document.getElementById("middleName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const passwordRepeat = document.getElementById("passwordRepeat").value;
  const groupId = groupSelect.value;
  const studentNumber = document.getElementById("studentNumber").value.trim();
  const requestBody = {firstName, lastName, middleName, email, password, groupId, studentNumber};
  if (password !== passwordRepeat) {
    message.textContent = "Пароли не совпадают.";
    return;
  }
  try {
    const response = await fetch(`${apiUrl}/api/auth/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      }
    );
    const data = await response.json();
    if (!response.ok) {
      message.textContent = data.error || "Ошибка регистрации.";
      return;
    }
    message.textContent = data.message;
    form.reset();
  } catch (error) {
    console.error(error);
    message.textContent = "Не удалось связаться с сервером.";
  }
});


loadGroups();
