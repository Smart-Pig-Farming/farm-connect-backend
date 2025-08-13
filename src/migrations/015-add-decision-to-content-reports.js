"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add decision column (enum)
    await queryInterface.addColumn("content_reports", "decision", {
      type: Sequelize.ENUM("retained", "deleted", "warned"),
      allowNull: true,
    });
    await queryInterface.addIndex("content_reports", ["decision"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("content_reports", ["decision"]);
    await queryInterface.removeColumn("content_reports", "decision");
    // Drop enum type for Postgres (ignore errors for other DBs)
    try {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_content_reports_decision";'
      );
    } catch (e) {
      // noop
    }
  },
};
