"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Update existing quizzes that used legacy defaults (15 or 30) to new 10 minute standard only if short quizzes desired
    // Adjust only those explicitly at 15 or 30 to avoid clobbering customized durations
    await queryInterface.sequelize.query(
      `UPDATE quizzes SET duration = 10 WHERE duration IN (15,30);`
    );
    // Ensure column default is 10 (idempotent)
    try {
      await queryInterface.changeColumn("quizzes", "duration", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
      });
    } catch (e) {
      console.warn(
        "[045-update-quiz-duration-default] changeColumn skipped",
        e.message
      );
    }
  },
  async down(queryInterface, Sequelize) {
    // Revert default to 30 (previous) but do not revert modified rows to avoid losing intent
    try {
      await queryInterface.changeColumn("quizzes", "duration", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30,
      });
    } catch (e) {
      console.warn(
        "[045-update-quiz-duration-default] down changeColumn skipped",
        e.message
      );
    }
  },
};
