const test = require("node:test");
const assert = require("node:assert/strict");
const {
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
} = require("../lib/validation");

test("normalizeText обрезает пробелы и контролирует длину", () => {
  assert.equal(normalizeText("  Иван  ", { maxLength: 10, required: true }), "Иван");
  assert.equal(normalizeText("Строка 1\nСтрока 2", { maxLength: 30 }), "Строка 1\nСтрока 2");
  assert.equal(normalizeText("", { required: true }), null);
  assert.equal(normalizeText("слишком длинно", { maxLength: 5 }), null);
});

test("normalizeEmail приводит адрес к нижнему регистру", () => {
  assert.equal(normalizeEmail(" Student@Example.COM "), "student@example.com");
  assert.equal(normalizeEmail("not-an-email"), null);
});

test("validatePassword применяет базовую политику паролей", () => {
  assert.equal(validatePassword("StrongPass1"), null);
  assert.match(validatePassword("short1A"), /10/);
  assert.match(validatePassword("onlylowercase1"), /заглавную/);
});

test("parseId принимает только безопасный положительный integer", () => {
  assert.equal(parseId("42"), 42);
  assert.equal(parseId("0"), null);
  assert.equal(parseId("1.5"), null);
  assert.equal(parseId("abc"), null);
});

test("parseBoolean не подменяет неизвестные значения", () => {
  assert.equal(parseBoolean(true), true);
  assert.equal(parseBoolean("false"), false);
  assert.equal(parseBoolean("yes"), null);
});

test("учебный год и семестр проходят предметную проверку", () => {
  assert.equal(parseAcademicYear("2026/2027"), "2026/2027");
  assert.equal(parseAcademicYear("2026/2028"), null);
  assert.equal(parseSemester("2"), 2);
  assert.equal(parseSemester(3), null);
});

test("числа и даты валидируются без неявных значений", () => {
  assert.equal(parsePositiveNumber("5.5", { max: 10 }), 5.5);
  assert.equal(parsePositiveNumber(-1), null);
  assert.equal(parseOptionalDateTime("2026-10-23T10:00:00+06:00"), "2026-10-23T04:00:00.000Z");
  assert.equal(parseOptionalDateTime("not-a-date"), undefined);
  assert.equal(parseOptionalDateTime(""), null);
  assert.equal(parseIsoDate("2026-02-28"), "2026-02-28");
  assert.equal(parseIsoDate("2026-02-30"), null);
});
