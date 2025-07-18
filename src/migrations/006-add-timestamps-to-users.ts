import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface) => {
    // Check if the users table exists
    const tableExists = await queryInterface.sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users';"
    );

    if ((tableExists[0] as any[]).length === 0) {
      // Create the users table if it doesn't exist
      await queryInterface.createTable("users", {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        firstname: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        lastname: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        username: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
        },
        password: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        organization: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        sector: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        district: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        province: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        points: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          allowNull: false,
        },
        is_locked: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        is_verified: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        level_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: "levels",
            key: "id",
          },
        },
        role_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: "roles",
            key: "id",
          },
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });
    } else {
      // Add timestamp columns if they don't exist
      try {
        await queryInterface.addColumn("users", "created_at", {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        });
      } catch (error) {
        console.log("created_at column already exists or error:", error);
      }

      try {
        await queryInterface.addColumn("users", "updated_at", {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        });
      } catch (error) {
        console.log("updated_at column already exists or error:", error);
      }
    }

    // Update existing users with current timestamp if they have null values
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET created_at = CURRENT_TIMESTAMP 
      WHERE created_at IS NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE users 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE updated_at IS NULL;
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    // Only remove columns if we're sure they were added by this migration
    try {
      await queryInterface.removeColumn("users", "created_at");
      await queryInterface.removeColumn("users", "updated_at");
    } catch (error) {
      console.log("Error removing timestamp columns:", error);
    }
  },
};
