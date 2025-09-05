"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Ensure table exists (idempotent)
    await queryInterface.sequelize.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'best_practice_tags') THEN
        CREATE TABLE best_practice_tags (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT NOT NULL DEFAULT '',
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX best_practice_tags_is_active ON best_practice_tags (is_active);
        CREATE INDEX best_practice_tags_name ON best_practice_tags (name);
      END IF; END $$;`);

    const tags = [
      {
        key: "feeding_nutrition",
        name: "Feeding & Nutrition",
        description: "Nutrition and feeding best practices",
      },
      {
        key: "disease_control",
        name: "Disease Control",
        description: "Health and disease prevention",
      },
      {
        key: "growth_weight_mgmt",
        name: "Growth & Weight Mgmt",
        description: "Growth performance and weight management",
      },
      {
        key: "environment_mgmt",
        name: "Environment Mgmt",
        description: "Housing and environmental management",
      },
      {
        key: "breeding_insemination",
        name: "Breeding & Insemination",
        description: "Breeding strategies and reproduction",
      },
      {
        key: "farrowing_mgmt",
        name: "Farrowing Mgmt",
        description: "Farrowing and piglet care",
      },
      {
        key: "record_farm_mgmt",
        name: "Record & Farm Mgmt",
        description: "Record keeping and overall farm management",
      },
      {
        key: "marketing_finance",
        name: "Marketing & Finance",
        description: "Marketing, finance and economics",
      },
    ];

    for (const t of tags) {
      const name = t.name.replace(/'/g, "''");
      const desc = t.description.replace(/'/g, "''");
      await queryInterface.sequelize
        .query(`INSERT INTO best_practice_tags (name, description, is_active, created_at, updated_at)
        VALUES ('${name}', '${desc}', true, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, is_active = true, updated_at = NOW();`);
    }
  },
  async down(_queryInterface, _Sequelize) {
    // Non destructive; nothing to rollback for standardization
  },
};
