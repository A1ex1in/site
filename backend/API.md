# API backend

Все маршруты начинаются с `/api`. Авторизация хранится в HTTP-only cookie
`site.sid`; browser-запросы с другого разрешённого origin должны передавать
`credentials: "include"`.

Ошибки имеют форму:

```json
{
  "error": "Описание ошибки",
  "requestId": "идентификатор запроса, если ошибка обработана общим middleware"
}
```

## Служебный маршрут

- `GET /health` — возвращает `200`, если сервер и PostgreSQL доступны, иначе `503`.

## Авторизация — `/auth`

- `GET /registration-config` — политика пароля и версии юридических документов.
- `POST /register` — регистрация студента.
- `POST /login` — вход.
- `POST /logout` — выход.
- `GET /me` — текущий пользователь.
- `GET /consents` — зафиксированные согласия текущего пользователя.
- `PATCH /profile` — изменение ФИО и телефона.
- `POST /change-password` — смена пароля с завершением текущей сессии.

Тело регистрации:

```json
{
  "email": "student@example.com",
  "password": "StrongPass1",
  "firstName": "Иван",
  "lastName": "Петров",
  "middleName": "Сергеевич",
  "phone": "+7 900 000-00-00",
  "groupId": 1,
  "studentNumber": "АТ-231-001",
  "privacyPolicyAccepted": true,
  "userAgreementAccepted": true
}
```

## Регистрация и студенты

- `GET /groups` — активные группы; доступен без авторизации.
- `GET /students/pending` — заявки на регистрацию; только преподаватель.
- `PATCH /students/:id/approve` — принять заявку.
- `PATCH /students/:id/reject` — отклонить заявку.
- `GET /students` — список с пагинацией и фильтрами `status`, `groupId`,
  `search`, `page`, `limit`.

## Кабинет студента — `/student`

- `GET /profile`
- `GET /courses`
- `GET /courses/:id/materials`
- `GET /materials/:materialId/files`
- `GET /files/:id/download`
- `GET /courses/:id/assignments`
- `GET /assignments/:assignmentId/files`
- `GET /assignments/:assignmentId/submission`
- `PUT /assignments/:assignmentId/submission`
- `POST /assignments/:assignmentId/submission/submit`
- `POST /assignments/:assignmentId/submission/files`
- `GET /assignments/:assignmentId/submission/files`
- `GET /submission-files/:id/download`
- `DELETE /submission-files/:id`
- `GET /courses/:id/grades` — журнал и оценки текущего студента.

## Кабинет преподавателя — `/teacher`

### Группы, дисциплины и курсы

- `GET|POST /groups`
- `PATCH|DELETE /groups/:id`
- `GET|POST /disciplines`
- `PATCH|DELETE /disciplines/:id`
- `GET|POST /courses`
- `PATCH|DELETE /courses/:id`
- `GET /groups/:id/students`
- `GET /students/:id`
- `PATCH /students/:id/group`
- `PATCH /students/:id/status`

`DELETE` для группы, дисциплины и курса означает мягкое архивирование.

### Материалы и задания

- `GET|POST /courses/:id/materials`
- `PATCH|DELETE /materials/:materialId`
- `PATCH /materials/:materialId/publication`
- `GET|POST /materials/:materialId/files`
- `GET /files/:id/download`
- `DELETE /files/:id`
- `GET|POST /courses/:id/assignments`
- `PATCH|DELETE /assignments/:assignmentId`
- `PATCH /assignments/:assignmentId/publication`
- `GET|POST /assignments/:assignmentId/files`
- `GET /assignment-files/:id/download`
- `DELETE /assignment-files/:id`
- `GET|POST|DELETE /assignments/:assignmentId/material-files/...`

### Работы и журнал

- `GET /assignments/:assignmentId/submissions`
- `GET /submissions/:submissionId/files`
- `GET /submission-files/:id/download`
- `PATCH /submissions/:submissionId/return`
- `PATCH /submissions/:submissionId/grade`
- `GET /courses/:id/journal`
- `GET /courses/:id/grades`
- `GET|POST /courses/:id/lessons`
- `GET|PUT /lessons/:lessonId/attendance`
- `PATCH|DELETE /lessons/:lessonId`
- `GET|POST /lessons/:lessonId/grade-items`
- `PATCH|DELETE /grade-items/:gradeItemId`
- `PUT /grade-items/:gradeItemId/students/:studentId/grade`

## Кабинет администратора — `/admin`

- `GET /overview` — сводка, посещаемость по группам и нагрузка преподавателей.
- `GET /users?role=teacher|student` — список управляемых пользователей.
- `POST /groups` — создать учебную группу.
- `POST /users` — создать активного преподавателя или студента.
- `PATCH /users/:id/status` — заблокировать или разблокировать пользователя.

## Основные коды ответа

- `200` — успешное чтение или изменение;
- `201` — сущность создана;
- `400` — некорректные данные;
- `401` — пользователь не авторизован;
- `403` — недостаточно прав или аккаунт недоступен;
- `404` — сущность или маршрут не найден;
- `409` — конфликт состояния или уникальности;
- `413` — файл или JSON превышает лимит;
- `429` — слишком много попыток входа/регистрации;
- `500` — внутренняя ошибка;
- `503` — PostgreSQL временно недоступен.
