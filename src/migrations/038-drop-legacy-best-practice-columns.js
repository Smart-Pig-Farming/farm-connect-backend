"use strict";
/**
 * Migration 038: Drop legacy best_practice_contents columns `steps` and `benefits` if they still exist.
 * Safely copies data into steps_json / benefits_json if legacy columns contain data and JSONB columns are empty.
 * Idempotent.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = "best_practice_contents";
    const describe = await queryInterface
      .describeTable(table)
      .catch(() => ({}));

    const hasLegacySteps = !!describe.steps;
    const hasLegacyBenefits = !!describe.benefits;

    // If legacy columns exist, backfill JSONB columns where empty
    if (hasLegacySteps) {
      // Cast legacy TEXT column to JSONB. If it's already a JSON array string we cast directly;
      // otherwise wrap plain text in a single-element array to avoid parse errors.
      await queryInterface.sequelize.query(`
        UPDATE ${table}
        SET steps_json = CASE
          WHEN steps IS NULL THEN steps_json
          WHEN steps ~ '^[\\s]*\\[' THEN steps::jsonb            -- already JSON array
          WHEN length(trim(steps)) = 0 THEN '[]'::jsonb            -- empty string -> empty array
          ELSE jsonb_build_array(steps)                           -- plain text -> [text]
        END
        WHERE (steps_json IS NULL OR jsonb_typeof(steps_json) <> 'array' OR jsonb_array_length(steps_json) = 0)
          AND steps IS NOT NULL;
      `);
    }
    if (hasLegacyBenefits) {
      await queryInterface.sequelize.query(`
        UPDATE ${table}
        SET benefits_json = CASE
          WHEN benefits IS NULL THEN benefits_json
          WHEN benefits ~ '^[\\s]*\\[' THEN benefits::jsonb
          WHEN length(trim(benefits)) = 0 THEN '[]'::jsonb
          ELSE jsonb_build_array(benefits)
        END
        WHERE (benefits_json IS NULL OR jsonb_typeof(benefits_json) <> 'array' OR jsonb_array_length(benefits_json) = 0)
          AND benefits IS NOT NULL;
      `);
    }

    // Drop legacy columns if present
    if (hasLegacySteps) {
      await queryInterface.removeColumn(table, "steps").catch(() => {});
    }
    if (hasLegacyBenefits) {
      await queryInterface.removeColumn(table, "benefits").catch(() => {});
    }

    // Ensure JSONB columns are NOT NULL with default []
    const ensureNotNull = async (col) => {
      const info = await queryInterface.describeTable(table).catch(() => ({}));
      if (info[col] && info[col].allowNull) {
        await queryInterface.changeColumn(table, col, {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        });
      }
    };
    await ensureNotNull("steps_json");
    await ensureNotNull("benefits_json");
  },
  async down(queryInterface, Sequelize) {
    const table = "best_practice_contents";
    const describe = await queryInterface
      .describeTable(table)
      .catch(() => ({}));

    // Recreate legacy columns (empty arrays) if they do not exist
    if (!describe.steps) {
      await queryInterface
        .addColumn(table, "steps", {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        })
        .catch(() => {});
      await queryInterface.sequelize.query(
        `UPDATE ${table} SET steps = steps_json WHERE steps IS NULL OR jsonb_array_length(steps) = 0`
      );
    }
    if (!describe.benefits) {
      await queryInterface
        .addColumn(table, "benefits", {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        })
        .catch(() => {});
      await queryInterface.sequelize.query(
        `UPDATE ${table} SET benefits = benefits_json WHERE benefits IS NULL OR jsonb_array_length(benefits) = 0`
      );
    }
  },
};
