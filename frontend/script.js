const nameInput = document.getElementById("name");
const addButton = document.getElementById("addButton");
const usersList = document.getElementById("usersList");

const apiUrl = "http://127.0.0.1:3000/api/users";

async function loadUsers() {
    const response = await fetch(apiUrl);
    const users = await response.json();
    usersList.innerHTML = "";
    for (const user of users) {
        const li = document.createElement("li");
        const fullName = [
            user.last_name,
            user.first_name,
            user.middle_name
        ].filter(Boolean).join(" ");
        li.textContent = `${user.id}: ${fullName} `;
        const editButton = document.createElement("button");
        editButton.textContent = "Изменить";
        editButton.addEventListener("click", async () => {
            const newName = prompt(
                "Введите новое имя:",
                fullName
            );
            if (!newName) {
                return;
            }
            await fetch(`${apiUrl}/${user.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    first_name: newName
                })
            });
            loadUsers();
        });
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Удалить";
        deleteButton.addEventListener("click", async () => {
            await fetch(`${apiUrl}/${user.id}`, {
                method: "DELETE"
            });
            loadUsers();
        });
        li.appendChild(editButton);
        li.appendChild(deleteButton);
        usersList.appendChild(li);
    }
}

addButton.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    if (!name) {
        return;
    }
    await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            first_name: name
        })
    });
    nameInput.value = "";
    loadUsers();
});

loadUsers();