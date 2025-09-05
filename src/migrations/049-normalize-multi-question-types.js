"use strict";

/**
 * Migration: Normalize legacy quiz question type values.
 * Some older rows may have stored `type` = 'multiple' (or other variants) instead of the ENUM value 'multi'.
 * This migration converts any legacy value to the canonical 'multi'. Safe & idempotent.
 */

module.exports = {
  async up(queryInterface /*, Sequelize */) {
    // Normalize any legacy stored variants to canonical 'multi'.
    // Use text comparison so we don't reference enum literals that might not exist in current enum definition.
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        "UPDATE quiz_questions SET type = 'multi' WHERE (type)::text IN ('multiple','multiple-select','multiple_select') AND type <> 'multi';",
        { transaction }
      );
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  },
  async down() {
    // Irreversible (we don't know which variant to restore). No-op.
    return Promise.resolve();
  },
};
