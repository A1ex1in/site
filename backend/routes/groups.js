const express = require("express");

const pool = require("../db");


const router = express.Router();


router.get("/", async (request, response) => {

    try {

        const result = await pool.query(`
            SELECT
                id,
                name,
                description
            FROM student_groups
            WHERE is_active = TRUE
            ORDER BY name
        `);

        response.json(result.rows);

    } catch (error) {

        console.error(
            "Ошибка получения групп:",
            error
        );

        response.status(500).json({
            error: "Ошибка получения списка групп"
        });
    }
});


module.exports = router;