"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Idempotent add of decision column and index
    const table = "content_reports";
    const column = "decision";

    const columnExists = await queryInterface.sequelize.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = '${table}' AND column_name='${column}' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!columnExists.length) {
      await queryInterface.addColumn(table, column, {
        type: Sequelize.ENUM("retained", "deleted", "warned"),
        allowNull: true,
      });
    }

    // Guard index creation
    await queryInterface.sequelize.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'content_reports_decision'
      ) THEN
        BEGIN
          CREATE INDEX content_reports_decision ON content_reports(decision);
        EXCEPTION WHEN duplicate_table THEN
          -- ignore race condition
          NULL;
        END;
      END IF;
    END$$;`);
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
