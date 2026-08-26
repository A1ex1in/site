const express = require("express");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let users = [];
let nextId = 1;

// GET
app.get("/api/hello", (request, response) => {
    response.json({
        message: "Привет от backend!"
    });
});

app.get("/api/users", (request, response) => {
    response.json(users);
});

app.get("/api/users/:id", (request, response) => {
    const id = Number(request.params.id);
    const user = users.find(user => user.id === id);
    if (!user) {
        return response.status(404).json({
            error: "Пользователь не найден"
        });
    }
    response.json(user);
});

// POST
app.post("/api/hello", (request, response) => {
    const name = request.body.name;
    response.json({
        message: `Привет, ${name}!`
    });
});

app.post("/api/users", (request, response) => {
    const name = request.body.name;
    const user = {
        id: nextId,
        name: name
    };
    nextId++;
    users.push(user);
    response.status(201).json(user);
});

// PUT
app.put("/api/users/:id", (request, response) => {
    const id = Number(request.params.id);
    const name = request.body.name;
    const user = users.find(user => user.id === id);
    if (!user) {
        return response.status(404).json({
            error: "Пользователь не найден"
        });
    }
    user.name = name;
    response.json(user);
});

// DELETE
app.delete("/api/users/:id", (request, response) => {
    const id = Number(request.params.id);
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex === -1) {
        return response.status(404).json({
            error: "Пользователь не найден"
        });
    }
    users.splice(userIndex, 1);
    response.status(204).send();
});


app.listen(port, () => {
    console.log(`Backend запущен: http://127.0.0.1:${port}`);
});