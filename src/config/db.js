require("dotenv").config();

const { Sequelize } = require("sequelize");

console.log(process.env.DATABASE_URL);

const sequelize = new Sequelize(
  process.env.DATABASE_URL,
  {
    dialect: "postgres",

    logging: false,

    timezone: "+07:00",

    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },

      useUTC: false,
    },

    define: {
      timestamps: true,
    },

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

module.exports = sequelize;