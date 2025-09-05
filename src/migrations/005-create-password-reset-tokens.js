"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("password_reset_tokens", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
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
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      otp: {
        type: Sequelize.STRING(6),
        allowNull: false,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: "expires_at",
      },
      isUsed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_used",
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

    // Add indexes (idempotent) supporting both snake_case and potential legacy camelCase columns.
    await queryInterface.sequelize.query(`DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='password_reset_tokens' AND column_name='email') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS password_reset_tokens_email ON password_reset_tokens (email)';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='password_reset_tokens' AND column_name='otp') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS password_reset_tokens_otp ON password_reset_tokens (otp)';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='password_reset_tokens' AND column_name='user_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id ON password_reset_tokens (user_id)';
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='password_reset_tokens' AND column_name='userId') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id ON password_reset_tokens ("userId")';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='password_reset_tokens' AND column_name='expires_at') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at ON password_reset_tokens (expires_at)';
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='password_reset_tokens' AND column_name='expiresAt') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at ON password_reset_tokens ("expiresAt")';
      END IF;
    END$$;`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("password_reset_tokens");
  },
};
