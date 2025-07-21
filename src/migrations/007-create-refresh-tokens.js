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

    // Add indexes for performance
    await queryInterface.addIndex("refresh_tokens", ["user_id"]);
    await queryInterface.addIndex("refresh_tokens", ["token"]);
    await queryInterface.addIndex("refresh_tokens", ["device_id"]);
    await queryInterface.addIndex("refresh_tokens", ["expires_at"]);
    await queryInterface.addIndex("refresh_tokens", ["is_revoked"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("refresh_tokens");
  },
};
