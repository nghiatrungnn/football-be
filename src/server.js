require("dotenv").config();
const app = require("./app");

const db = require("./models");
const sequelize = db.sequelize;

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to DB:", process.env.DB_NAME);

    // ⚠️ Không dùng force nữa
    await sequelize.sync({ alter: true });

    console.log("🔥 Database synced");

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error("❌ Server start error:", err);
  }
}

startServer();