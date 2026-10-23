const express = require("express");
const argon2 = require("argon2");
const net = require("net");
const pool = require("../db");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");
const {
  normalizeText,
  normalizeEmail,
  validatePassword,
  parseId,
  parseBoolean
} = require("../lib/validation");

const router = express.Router();

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    middleName: user.middle_name,
    phone: user.phone,
    role: user.role,
    status: user.status
  };
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.sessionCookieSecure,
    sameSite: "lax"
  };
}

router.get("/registration-config", (request, response) => {
  response.json({
    requireLegalConsents: config.requireLegalConsents,
    documents: {
      privacyPolicy: config.privacyPolicyVersion,
      userAgreement: config.userAgreementVersion
    },
    password: {
      minLength: 10,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireDigit: true
    }
  });
});

router.get("/me", requireAuth, (request, response) => {
  response.json({ user: publicUser(request.user) });
});

router.get("/consents", requireAuth, async (request, response) => {
  try {
    const result = await pool.query(
      `
      SELECT document_type, document_version, accepted_at
      FROM legal_consents
      WHERE user_id = $1
      ORDER BY accepted_at DESC, id DESC
      `,
      [request.user.id]
    );
    response.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения согласий пользователя:", error);
    response.status(500).json({ error: "Ошибка получения согласий пользователя" });
  }
});

router.post("/logout", requireAuth, (request, response) => {
  request.session.destroy((error) => {
    if (error) {
      console.error("Ошибка завершения сессии:", error);
      return response.status(500).json({ error: "Не удалось выйти из системы" });
    }
    response.clearCookie("site.sid", cookieOptions());
    response.json({ message: "Выход выполнен" });
  });
});

router.post("/register", async (request, response) => {
  const {
    email,
    password,
    firstName,
    lastName,
    middleName,
    phone,
    groupId,
    studentNumber,
    privacyPolicyAccepted,
    userAgreementAccepted
  } = request.body || {};

  const normalizedEmail = normalizeEmail(email);
  const normalizedFirstName = normalizeText(firstName, { maxLength: 100, required: true });
  const normalizedLastName = normalizeText(lastName, { maxLength: 100, required: true });
  const normalizedMiddleName = normalizeText(middleName, { maxLength: 100 });
  const normalizedPhone = normalizeText(phone, { maxLength: 30 });
  const normalizedStudentNumber = normalizeText(studentNumber, { maxLength: 50 });
  const parsedGroupId = parseId(groupId);
  const passwordError = validatePassword(password);
  const privacyAccepted = parseBoolean(privacyPolicyAccepted) === true;
  const agreementAccepted = parseBoolean(userAgreementAccepted) === true;

  if (!normalizedEmail) {
    return response.status(400).json({ error: "Укажите корректный email" });
  }
  if (!normalizedFirstName || !normalizedLastName || normalizedMiddleName === null) {
    return response.status(400).json({ error: "Проверьте ФИО и длину полей" });
  }
  if (normalizedPhone === null || (normalizedPhone && !/^[+\d()\-\s]{7,30}$/.test(normalizedPhone))) {
    return response.status(400).json({ error: "Укажите корректный номер телефона" });
  }
  if (!parsedGroupId) {
    return response.status(400).json({ error: "Выберите учебную группу" });
  }
  if (normalizedStudentNumber === null) {
    return response.status(400).json({ error: "Номер студента слишком длинный" });
  }
  if (passwordError) {
    return response.status(400).json({ error: passwordError });
  }
  if (config.requireLegalConsents && (!privacyAccepted || !agreementAccepted)) {
    return response.status(400).json({
      error: "Для регистрации необходимо принять политику обработки данных и пользовательское соглашение"
    });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const groupResult = await client.query(
      `SELECT id FROM student_groups WHERE id = $1 AND is_active = TRUE`,
      [parsedGroupId]
    );
    if (groupResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return response.status(400).json({ error: "Указанная учебная группа не существует" });
    }

    const userResult = await client.query(
      `
      INSERT INTO users (
        email, password_hash, first_name, last_name, middle_name, phone, role, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'student', 'pending')
      RETURNING id
      `,
      [
        normalizedEmail,
        await argon2.hash(password),
        normalizedFirstName,
        normalizedLastName,
        normalizedMiddleName || null,
        normalizedPhone || null
      ]
    );

    const userId = userResult.rows[0].id;
    await client.query(
      `
      INSERT INTO student_profiles (user_id, group_id, student_number)
      VALUES ($1, $2, $3)
      `,
      [userId, parsedGroupId, normalizedStudentNumber || null]
    );

    const consents = [];
    if (privacyAccepted) {
      consents.push(["privacy_policy", config.privacyPolicyVersion]);
    }
    if (agreementAccepted) {
      consents.push(["user_agreement", config.userAgreementVersion]);
    }

    for (const [documentType, documentVersion] of consents) {
      await client.query(
        `
        INSERT INTO legal_consents (
          user_id, document_type, document_version, ip_address, user_agent
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          userId,
          documentType,
          documentVersion,
          net.isIP(request.ip || "") ? request.ip : null,
          normalizeText(request.get("user-agent"), { maxLength: 500 }) || null
        ]
      );
    }

    await client.query("COMMIT");
    response.status(201).json({
      message: "Регистрация выполнена. Ожидается подтверждение преподавателем.",
      userId
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error.code === "23505") {
      const message = error.constraint === "student_number_unique"
        ? "Такой номер студента уже зарегистрирован"
        : "Пользователь с таким email уже существует";
      return response.status(409).json({ error: message });
    }
    console.error("Ошибка регистрации:", error);
    response.status(500).json({ error: "Ошибка регистрации" });
  } finally {
    if (client) client.release();
  }
});

router.post("/login", async (request, response) => {
  try {
    const normalizedEmail = normalizeEmail(request.body?.email);
    const password = request.body?.password;
    if (!normalizedEmail || typeof password !== "string" || !password) {
      return response.status(400).json({ error: "Необходимо указать email и пароль" });
    }

    const result = await pool.query(
      `
      SELECT id, email, password_hash, first_name, last_name, middle_name, phone, role, status
      FROM users
      WHERE LOWER(email) = LOWER($1)
      `,
      [normalizedEmail]
    );

    if (result.rowCount === 0) {
      return response.status(401).json({ error: "Неверный email или пароль" });
    }

    const user = result.rows[0];
    const passwordIsValid = await argon2.verify(user.password_hash, password);
    if (!passwordIsValid) {
      return response.status(401).json({ error: "Неверный email или пароль" });
    }

    const unavailableMessages = {
      pending: "Регистрация ещё не подтверждена преподавателем",
      rejected: "Регистрация отклонена",
      blocked: "Учётная запись заблокирована"
    };
    if (user.status !== "active") {
      return response.status(403).json({
        error: unavailableMessages[user.status] || "Доступ к учётной записи запрещён"
      });
    }

    await new Promise((resolve, reject) => {
      request.session.regenerate((error) => (error ? reject(error) : resolve()));
    });
    request.session.user = { id: user.id, role: user.role };

    response.json({ message: "Вход выполнен", user: publicUser(user) });
  } catch (error) {
    console.error("Ошибка авторизации:", error);
    response.status(500).json({ error: "Ошибка авторизации" });
  }
});

router.patch("/profile", requireAuth, async (request, response) => {
  const firstName = normalizeText(request.body?.firstName, { maxLength: 100, required: true });
  const lastName = normalizeText(request.body?.lastName, { maxLength: 100, required: true });
  const middleName = normalizeText(request.body?.middleName, { maxLength: 100 });
  const phone = normalizeText(request.body?.phone, { maxLength: 30 });

  if (!firstName || !lastName || middleName === null) {
    return response.status(400).json({ error: "Проверьте ФИО и длину полей" });
  }
  if (phone === null || (phone && !/^[+\d()\-\s]{7,30}$/.test(phone))) {
    return response.status(400).json({ error: "Укажите корректный номер телефона" });
  }

  try {
    const result = await pool.query(
      `
      UPDATE users
      SET first_name = $1, last_name = $2, middle_name = $3, phone = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, email, first_name, last_name, middle_name, phone, role, status
      `,
      [firstName, lastName, middleName || null, phone || null, request.user.id]
    );
    response.json({ message: "Профиль обновлён", user: publicUser(result.rows[0]) });
  } catch (error) {
    console.error("Ошибка обновления профиля:", error);
    response.status(500).json({ error: "Ошибка обновления профиля" });
  }
});

router.post("/change-password", requireAuth, async (request, response) => {
  const currentPassword = request.body?.currentPassword;
  const newPassword = request.body?.newPassword;
  const passwordError = validatePassword(newPassword);

  if (typeof currentPassword !== "string" || !currentPassword) {
    return response.status(400).json({ error: "Укажите текущий пароль" });
  }
  if (passwordError) {
    return response.status(400).json({ error: passwordError });
  }
  if (currentPassword === newPassword) {
    return response.status(400).json({ error: "Новый пароль должен отличаться от текущего" });
  }

  try {
    const result = await pool.query(`SELECT password_hash FROM users WHERE id = $1`, [request.user.id]);
    const valid = result.rowCount > 0 && await argon2.verify(result.rows[0].password_hash, currentPassword);
    if (!valid) {
      return response.status(401).json({ error: "Текущий пароль указан неверно" });
    }

    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [await argon2.hash(newPassword), request.user.id]
    );

    request.session.destroy((error) => {
      if (error) {
        console.error("Пароль изменён, но сессию завершить не удалось:", error);
        return response.status(500).json({ error: "Пароль изменён. Войдите снова." });
      }
      response.clearCookie("site.sid", cookieOptions());
      response.json({ message: "Пароль изменён. Войдите снова." });
    });
  } catch (error) {
    console.error("Ошибка изменения пароля:", error);
    response.status(500).json({ error: "Ошибка изменения пароля" });
  }
});

module.exports = router;
