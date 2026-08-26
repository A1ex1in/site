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
        li.textContent = `${user.id}: ${user.name} `;
        const editButton = document.createElement("button");
        editButton.textContent = "Изменить";
        editButton.addEventListener("click", async () => {
            const newName = prompt(
                "Введите новое имя:",
                user.name
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
                    name: newName
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
            name: name
        })
    });
    nameInput.value = "";
    loadUsers();
});

loadUsers();