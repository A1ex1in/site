const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value, { maxLength, required = false } = {}) {
  if (value == null) return required ? null : "";
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (required && !normalized) return null;
  if (maxLength && normalized.length > maxLength) return null;
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(normalized)) return null;
  return normalized;
}

function normalizeEmail(value) {
  const normalized = normalizeText(value, { maxLength: 254, required: true });
  if (!normalized || !EMAIL_PATTERN.test(normalized)) return null;
  return normalized.toLowerCase();
}

function validatePassword(value) {
  if (typeof value !== "string") return "Пароль обязателен";
  if (value.length < 10) return "Пароль должен содержать не менее 10 символов";
  if (value.length > 128) return "Пароль не должен превышать 128 символов";
  if (!/[a-zа-яё]/u.test(value) || !/[A-ZА-ЯЁ]/u.test(value) || !/\d/u.test(value)) {
    return "Пароль должен содержать строчную и заглавную буквы, а также цифру";
  }
  return null;
}

function parseId(value) {
  const text = String(value ?? "");
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseBoolean(value) {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return null;
}

function parseAcademicYear(value) {
  const normalized = normalizeText(value, { maxLength: 9, required: true });
  if (!normalized || !/^\d{4}\/\d{4}$/.test(normalized)) return null;
  const [startYear, endYear] = normalized.split("/").map(Number);
  return endYear === startYear + 1 ? normalized : null;
}

function parseSemester(value) {
  const parsed = Number(value);
  return [1, 2].includes(parsed) ? parsed : null;
}

function parsePositiveNumber(value, { max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= max ? parsed : null;
}

function parseOptionalDateTime(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function parseIsoDate(value) {
  const normalized = normalizeText(value, { maxLength: 10, required: true });
  if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) return null;
  return normalized;
}

module.exports = {
  normalizeText,
  normalizeEmail,
  validatePassword,
  parseId,
  parseBoolean,
  parseAcademicYear,
  parseSemester,
  parsePositiveNumber,
  parseOptionalDateTime,
  parseIsoDate
};
