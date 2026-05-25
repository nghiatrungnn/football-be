const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define("user", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },

   // 🔥 THÊM SĐT
  phone: {
    type: DataTypes.STRING,
    allowNull: true, // cho phép null nếu chưa nhập
    unique: true, // không cho trùng số
    validate: {
      len: [9, 11], // giới hạn độ dài
    },
  },

  // ❗ FIX: cho phép null (Google login)
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  role: {
    type: DataTypes.STRING,
    defaultValue: "user",
  },

  // 🔥 THÊM CHO GOOGLE LOGIN
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = User;