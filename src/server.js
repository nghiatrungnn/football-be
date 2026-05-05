require("dotenv").config();
const app = require("./app");

const db = require("./models");
const sequelize = db.sequelize;

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Test DB connection
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");

    // 2. Sync DB (CHỈ DÙNG SAFE MODE)
    await sequelize.sync();

    console.log("🔥 Database synced");

    // 3. Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Server start error:", err);
    process.exit(1);
  }
}

startServer();