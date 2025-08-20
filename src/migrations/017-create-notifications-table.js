"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create notifications table
    await queryInterface.createTable("notifications", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      type: {
        type: Sequelize.ENUM(
          "post_vote",
          "reply_created",
          "reply_vote",
          "post_approved",
          "mention",
          "post_reported",
          "moderation_decision_reporter",
          "moderation_decision_owner"
        ),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for performance (idempotent)
    const ensureIndex = async (name, sql) => {
      await queryInterface.sequelize.query(`DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='${name}') THEN
          EXECUTE '${sql.replace(/'/g, "''")}';
        END IF;
      END$$;`);
    };
    await ensureIndex(
      "notifications_user_id_created_at",
      "CREATE INDEX notifications_user_id_created_at ON notifications(user_id, created_at)"
    );
    await ensureIndex(
      "notifications_user_id_read",
      "CREATE INDEX notifications_user_id_read ON notifications(user_id, read)"
    );
    await ensureIndex(
      "notifications_type",
      "CREATE INDEX notifications_type ON notifications(type)"
    );
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex("notifications", [
      "user_id",
      "created_at",
    ]);
    await queryInterface.removeIndex("notifications", ["user_id", "read"]);
    await queryInterface.removeIndex("notifications", ["type"]);

    // Drop table
    await queryInterface.dropTable("notifications");

    // Drop enum type for PostgreSQL
    try {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_notifications_type";'
      );
    } catch (e) {
      // Ignore errors for other databases
    }
  },
};
