"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("refresh_tokens", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: "user_id",
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      token: {
        type: Sequelize.STRING(500),
        allowNull: false,
        unique: true,
      },
      deviceId: {
        type: Sequelize.STRING,
        allowNull: true,
        field: "device_id",
      },
      deviceInfo: {
        type: Sequelize.JSONB,
        allowNull: true,
        field: "device_info",
      },
      ipAddress: {
        type: Sequelize.INET,
        allowNull: true,
        field: "ip_address",
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: "user_agent",
      },
      isRevoked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: "is_revoked",
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: "expires_at",
      },
      lastUsedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: "last_used_at",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: "created_at",
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: "updated_at",
      },
    });

    // Add indexes for performance (idempotent)
    await queryInterface.sequelize.query(`DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='refresh_tokens' AND column_name='user_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS refresh_tokens_user_id ON refresh_tokens (user_id)';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='refresh_tokens' AND column_name='token') THEN
        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token ON refresh_tokens (token)';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='refresh_tokens' AND column_name='device_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS refresh_tokens_device_id ON refresh_tokens (device_id)';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='refresh_tokens' AND column_name='expires_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at ON refresh_tokens (expires_at)';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='refresh_tokens' AND column_name='is_revoked') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS refresh_tokens_is_revoked ON refresh_tokens (is_revoked)';
      END IF;
    END$$;`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("refresh_tokens");
  },
};
