"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Ensure pgcrypto extension for gen_random_uuid (preferred) or fallback to uuid-ossp
      await queryInterface.sequelize.query(
        "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
        { transaction }
      );
      // Set default for id to gen_random_uuid() so inserts without id succeed
      await queryInterface.sequelize.query(
        "ALTER TABLE post_tags ALTER COLUMN id SET DEFAULT gen_random_uuid();",
        { transaction }
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        "ALTER TABLE post_tags ALTER COLUMN id DROP DEFAULT;",
        { transaction }
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
