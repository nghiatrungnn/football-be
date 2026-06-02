const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Booking = sequelize.define(
  "booking",
  {
    // ================= ID =================
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // ================= USER =================
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // ================= FIELD =================
    fieldId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // ================= DATE =================
    booking_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    // ================= TIME =================
    start_time: {
  type: DataTypes.TIME,
  allowNull: false,
},

end_time: {
  type: DataTypes.TIME,
  allowNull: false,
},

    // ================= CUSTOMER =================
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },

    // ================= PAYMENT METHOD =================
    payment_method: {
  type: DataTypes.ENUM(
    "deposit",
    "full"
  ),
  allowNull: false,
  defaultValue: "deposit",
},

    // ================= PAYMENT STATUS =================
    payment_status: {
  type: DataTypes.ENUM(
    "pending",
    "deposit_paid",
    "paid",
    "failed",
    "refunded",
    "refund_pending",
    "refund_rejected",
    "cancelled"
  ),

      allowNull: false,

      defaultValue: "pending",
    },

    // ================= TRANSACTION CODE =================
    transaction_code: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },

    payment_link_id: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: null,
},

// ================= PAYMENT GROUP =================
payment_group: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: null,
},

    // ================= PAYMENT NOTE =================
    payment_note: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },

    field_type: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: null,
},

field_name: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: null,
},


    // ================= STATUS =================
    status: {
      type: DataTypes.ENUM(
        "holding",
        "booked",
        "completed",
        "cancelled"
      ),

      allowNull: false,

      defaultValue: "holding",
    },


    refund_status: {
  type: DataTypes.STRING,
  defaultValue: "none",
},

refund_bank_name: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: null,
},

refund_bank_number: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: null,
},

refund_bank_owner: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: null,
},

// ================= REFUND =================

refund_amount: {
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 0,
},

refund_reason: {
  type: DataTypes.TEXT,
  allowNull: true,
  defaultValue: null,
},

refund_requested_at: {
  type: DataTypes.DATE,
  allowNull: true,
  defaultValue: null,
},

refunded_at: {
  type: DataTypes.DATE,
  allowNull: true,
  defaultValue: null,
},

    // ================= HOLD EXPIRE =================
    hold_until: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },

    // ================= PRICE =================
    total_price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

        // ================= VOUCHER =================
    voucher_code: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },

    discount_amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    final_amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    deposit_percent: {
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 30,
},

deposit_amount: {
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 0,
},

remaining_amount: {
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 0,
},

    // ================= CREATED AT =================
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // ================= UPDATED AT =================
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },

  {
    tableName: "bookings",

    timestamps: true,

    freezeTableName: true,

    // ================= UNIQUE SLOT =================
  }
  
);

module.exports = Booking;