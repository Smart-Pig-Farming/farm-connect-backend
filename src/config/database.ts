import { Sequelize } from "sequelize";
import * as dotenv from "dotenv";

dotenv.config();

const isTestEnv =
  process.env.NODE_ENV === "test" || !!process.env.JEST_WORKER_ID;

const sequelize = new Sequelize({
  dialect: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: isTestEnv
    ? process.env.DB_NAME_TEST || "farm_connect_test"
    : process.env.DB_NAME || "farm_connect_db",
  username: process.env.DB_USERNAME || "username",
  password: process.env.DB_PASSWORD || "password",
  logging: isTestEnv
    ? false
    : process.env.NODE_ENV === "development" && !process.env.QUIET_SQL
    ? console.log
    : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: false,
  },
});

// Test database connection
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    throw error;
  }
};

export default sequelize;
