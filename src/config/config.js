require("dotenv").config();

module.exports = {
  development: {
    dialect: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "farm_connect_db",
    username: process.env.DB_USERNAME || "username",
    password: process.env.DB_PASSWORD || "password",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
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
  },
  test: {
    dialect: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME_TEST || "farm_connect_db_test",
    username: process.env.DB_USERNAME || "username",
    password: process.env.DB_PASSWORD || "password",
    logging: false,
  },
  production: {
    dialect: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "farm_connect_db",
    username: process.env.DB_USERNAME || "username",
    password: process.env.DB_PASSWORD || "password",
    logging: false,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};
