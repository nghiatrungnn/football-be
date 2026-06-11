// =====================================================
// IMPORT USER MODEL
// =====================================================
//
// User:
//
// Model bảng users trong database.
//
const {
  user: User,
  Notification,
  userVoucher,
  voucher,
} = require("../models");


// =====================================================
// IMPORT BCRYPT
// =====================================================
//
// bcrypt:
//
// Dùng để:
//
// - hash password
// - compare password
//
const bcrypt =

  require("bcrypt");


// =====================================================
// IMPORT JWT
// =====================================================
//
// jsonwebtoken:
//
// Dùng tạo token đăng nhập.
//
const jwt =

  require("jsonwebtoken");


// =====================================================
// IMPORT AXIOS
// =====================================================
//
// axios:
//
// Dùng gọi Google API.
//
const axios =

  require("axios");


// =====================================================
// KIỂM TRA JWT SECRET
// =====================================================
//
// JWT_SECRET:
//
// Khóa bí mật dùng để tạo token.
//
// Nếu thiếu:
// server sẽ dừng.
//
if (

  !process.env.JWT_SECRET

) {

  throw new Error(

    "JWT_SECRET is missing in .env"

  );
}


// =====================================================
// GENERATE TOKEN
// =====================================================
//
// Chức năng:
//
// Tạo JWT token.
//
// Payload:
//
// id
// role
// email
//
// Hạn sử dụng:
//
// 7 ngày.
//
const generateToken =

  (user) => {

    return jwt.sign(

      {

        id:

          user.id ||

          user._id,

        role:

          user.role,

        email:

          user.email,

      },

      process.env.JWT_SECRET,

      {

        expiresIn:

          "7d",

      }

    );
  };


// =====================================================
// FORMAT USER
// =====================================================
//
// Chức năng:
//
// Loại bỏ dữ liệu không cần thiết.
//
// Không trả password.
//
const formatUser =

  (user) => {

    if (

      !user

    ) {

      return null;
    }

    return {

      id:

        user.id,

      name:

        user.name ||

        "",

      email:

        user.email ||

        "",

      phone:

        user.phone ||

        "",

      role:

        user.role ||

        "user",

      avatar:

        user.avatar ||

        "",

    };
  };


// =====================================================
// VALIDATE EMAIL
// =====================================================
//
// Kiểm tra email đúng định dạng.
//
// Ví dụ:
//
// abc@gmail.com
// → true
//
// abcgmail
// → false
//
const validateEmail =

  (email) => {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      .test(

        email

      );
  };


// =====================================================
// GET ALL USERS
// =====================================================
//
// Chức năng:
//
// Admin lấy toàn bộ user.
//
// Không trả password.
//
exports.getAllUsers =

  async (

    req,

    res

  ) => {

    try {

      // =====================================================
      // LẤY DANH SÁCH USER
      // =====================================================
      //
      // exclude password
      //
      // order DESC:
      // user mới nhất lên đầu.
      //
      const users =

        await User.findAll({

          attributes: {

            exclude: [

              "password",

            ],

          },

          order: [

            [

              "id",

              "DESC",

            ],

          ],

        });


      // =====================================================
      // TRẢ KẾT QUẢ
      // =====================================================
      //
      return res.json(

        users

      );

    } catch (error) {

      // =====================================================
      // XỬ LÝ LỖI
      // =====================================================
      //
      console.error(

        "Get users error:",

        error

      );

      return res.status(500)

        .json({

          message:

            "Get users failed",

          error:

            error.message,

        });
    }
  };
  // =====================================================
// REGISTER
// =====================================================
//
// Chức năng:
//
// Đăng ký tài khoản mới.
//
// Quy trình:
//
// 1. Validate dữ liệu.
// 2. Kiểm tra email tồn tại.
// 3. Kiểm tra số điện thoại tồn tại.
// 4. Hash password.
// 5. Tạo user.
// 6. Sinh JWT token.
// 7. Trả về frontend.
//
exports.register = async (

  req,

  res

) => {

  try {

    let {

      name,

      email,

      password,

      phone,

      role,

    } = req.body;


    // =====================================================
    // VALIDATE DỮ LIỆU
    // =====================================================
    //
    // name
    // email
    // password
    //
    // là bắt buộc.
    //
    if (

      !name ||

      !email ||

      !password

    ) {

      return res.status(400)

        .json({

          message:

            "Missing fields",

        });
    }


    // =====================================================
    // CHUẨN HÓA DỮ LIỆU
    // =====================================================
    //
    name =

      name.trim();

    email =

      email

        .trim()

        .toLowerCase();

    if (

      phone

    ) {

      phone =

        phone.trim();
    }


    // =====================================================
    // KIỂM TRA EMAIL
    // =====================================================
    //
    if (

      !validateEmail(

        email

      )

    ) {

      return res.status(400)

        .json({

          message:

            "Invalid email",

        });
    }

    // =====================================================
    // KIỂM TRA EMAIL TỒN TẠI
    // =====================================================
    //
    const exist =

      await User.findOne({

        where: {

          email,

        },

      });

    if (

      exist

    ) {

      return res.status(400)

        .json({

          message:

            "Email already exists",

        });
    }


    // =====================================================
    // KIỂM TRA SỐ ĐIỆN THOẠI
    // =====================================================
    //
    if (

      phone

    ) {

      const existPhone =

        await User.findOne({

          where: {

            phone,

          },

        });

      if (

        existPhone

      ) {

        return res.status(400)

          .json({

            message:

              "Phone already exists",

          });
      }
    }


    // =====================================================
    // KIỂM TRA PHONE CHỈ CÓ SỐ
    // =====================================================
    //
    const phoneRegex =
  /^[0-9]+$/;

if (
  phone &&
  !phoneRegex.test(phone)
) {
  return res.status(400).json({
    message:
      "Phone must contain only numbers",
  });
}


const passwordRegex =
  /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

if (
  !passwordRegex.test(password)
) {
  return res.status(400).json({ 
    message:
      "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ, số và ký tự đặc biệt",
  });
}

    // =====================================================
    // HASH PASSWORD
    // =====================================================
    //
    // bcrypt:
    // mã hóa password.
    //
    // 10:
    // số vòng hash.
    //
    const hash =

      await bcrypt.hash(

        password,

        10

      );


    // =====================================================
    // TẠO USER
    // =====================================================
    //
    const user =

      await User.create({

        name,

        email,

        password:

          hash,

        phone,

        role:

          "user",

      });

// =====================================================
// TẶNG VOUCHER CHÀO MỪNG
// =====================================================

const welcomeVoucher =
  await voucher.findOne({
    where: {
      code: "SALE200",
      isActive: true,
    },
  });

if (welcomeVoucher) {

  await userVoucher.create({

    userId: user.id,

    voucherId:
      welcomeVoucher.id,

    bookingId: null,

    usedAt: null,
  });

  // =====================================================
  // GỬI THÔNG BÁO
  // =====================================================

  await Notification.create({

    userId: user.id,

    title:
      "🎉 Chào mừng thành viên mới",

    message:
  `Bạn đã nhận được mã ${welcomeVoucher.code} giảm ${welcomeVoucher.value}% (tối đa ${welcomeVoucher.maxDiscount.toLocaleString()}đ).`,

    type: "promotion",
  });
}


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    // generateToken:
    // tạo JWT.
    //
    return res.status(201)

      .json({

        message:

          "Register success",

        token:

          generateToken(

            user

          ),

        user:

          formatUser(

            user

          ),

      });

  } catch (error) {

    console.error(

      "Register error:",

      error

    );

    return res.status(500)

      .json({

        message:

          "Register failed",

        error:

          error.message,

      });
  }
};


// =====================================================
// LOGIN
// =====================================================
//
// Chức năng:
//
// Đăng nhập.
//
// Quy trình:
//
// 1. Validate.
// 2. Tìm user.
// 3. Kiểm tra Google account.
// 4. So sánh password.
// 5. Sinh JWT.
// 6. Trả frontend.
//
exports.login = async (

  req,

  res

) => {

  try {

    let {

      email,

      password,

    } = req.body;


    // =====================================================
    // VALIDATE
    // =====================================================
    //
    if (

      !email ||

      !password

    ) {

      return res.status(400)

        .json({

          message:

            "Missing fields",

        });
    }


    // =====================================================
    // CHUẨN HÓA EMAIL
    // =====================================================
    //
    email =

      email

        .trim()

        .toLowerCase();


    // =====================================================
    // TÌM USER
    // =====================================================
    //
    const user =

      await User.findOne({

        where: {

          email,

        },

      });


    // =====================================================
    // KHÔNG TÌM THẤY USER
    // =====================================================
    //
    if (

      !user

    ) {

      return res.status(400)

        .json({

          message:

            "User not found",

        });
    }


    // =====================================================
    // KIỂM TRA GOOGLE ACCOUNT
    // =====================================================
    //
    // Nếu password = null
    // nghĩa là tài khoản Google.
    //
    if (

      !user.password

    ) {

      return res.status(400)

        .json({

          message:

            "Please login with Google",

        });
    }


    // =====================================================
    // SO SÁNH PASSWORD
    // =====================================================
    //
    // compare:
    //
    // password nhập vào
    //
    // với password đã hash.
    //
    const match =

      await bcrypt.compare(

        password,

        user.password

      );


    // =====================================================
    // SAI PASSWORD
    // =====================================================
    //
    if (

      !match

    ) {

      return res.status(400)

        .json({

          message:

            "Wrong password",

        });
    }


    // =====================================================
    // TẠO TOKEN
    // =====================================================
    //
    const token =

      generateToken(

        user

      );


    console.log(

      "LOGIN SECRET =",

      process.env.JWT_SECRET

    );

    console.log(

      "TOKEN CREATED =",

      token

    );


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    return res.json({

      message:

        "Login success",

      token,

      user:

        formatUser(

          user

        ),

    });

  } catch (error) {

    console.error(

      "Login error:",

      error

    );

    return res.status(500)

      .json({

        message:

          "Login failed",

        error:

          error.message,

      });
  }
};
// =====================================================
// GOOGLE LOGIN
// =====================================================
//
// Chức năng:
//
// Đăng nhập bằng Google.
//
// Quy trình:
//
// 1. Nhận access_token từ frontend.
// 2. Gọi Google API lấy thông tin user.
// 3. Tìm user trong database.
// 4. Nếu chưa có thì tạo mới.
// 5. Cập nhật googleId nếu cần.
// 6. Sinh JWT.
// 7. Trả về frontend.
//
exports.loginGoogle = async (

  req,

  res

) => {

  try {

    const {

      access_token,

    } = req.body;


    // =====================================================
    // KIỂM TRA access_token
    // =====================================================
    //
    if (

      !access_token

    ) {

      return res.status(400)

        .json({

          message:

            "Missing access_token",

        });
    }


    // =====================================================
    // GỌI GOOGLE API
    // =====================================================
    //
    // Lấy thông tin user:
    //
    // email
    // name
    // picture
    // sub (googleId)
    //
    const googleRes =

      await axios.get(

        "https://www.googleapis.com/oauth2/v3/userinfo",

        {

          headers: {

            Authorization:

              `Bearer ${access_token}`,

          },

        }

      );


    const data =

      googleRes.data;


    // =====================================================
    // KIỂM TRA EMAIL
    // =====================================================
    //
    if (

      !data.email

    ) {

      return res.status(400)

        .json({

          message:

            "Cannot get email from Google",

        });
    }


    const email =

      data.email

        .toLowerCase();

    const name =

      data.name ||

      "Google User";

    const picture =

      data.picture ||

      "";

    const googleId =

      data.sub;


    // =====================================================
    // TÌM USER
    // =====================================================
    //
    let user =

      await User.findOne({

        where: {

          email,

        },

      });


    // =====================================================
    // TẠO USER MỚI
    // =====================================================
    //
    if (

      !user

    ) {

      user =

        await User.create({

          name,

          email,

          password:

            null,

          phone:

            null,

          role:

            "user",

          googleId,

          avatar:

            picture,

        });
    }


    // =====================================================
    // CẬP NHẬT GOOGLE INFO
    // =====================================================
    //
    if (

      !user.googleId

    ) {

      user.googleId =

        googleId;

      user.avatar =

        picture;

      await user.save();
    }


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    return res.json({

      message:

        "Google login success",

      token:

        generateToken(

          user

        ),

      user:

        formatUser(

          user

        ),

    });

  } catch (err) {

    console.error(

      "Google login error:",

      err.response?.data ||

      err.message

    );

    return res.status(400)

      .json({

        message:

          "Google login failed",

        error:

          err.response?.data ||

          err.message,

      });
  }
};


// =====================================================
// GET CURRENT USER
// =====================================================
//
// Chức năng:
//
// Lấy thông tin user hiện tại.
//
// Middleware auth
// sẽ gán:
//
// req.user
//
// từ JWT.
//
exports.getMe = async (

  req,

  res

) => {

  try {

    // =====================================================
    // KIỂM TRA TOKEN
    // =====================================================
    //
    if (

      !req.user?.id

    ) {

      return res.status(401)

        .json({

          success:

            false,

          message:

            "Invalid token payload",

        });
    }


    // =====================================================
    // TÌM USER
    // =====================================================
    //
    const currentUser =

      await User.findByPk(

        req.user.id,

        {

          attributes: {

            exclude: [

              "password",

            ],

          },

        }

      );


    // =====================================================
    // USER KHÔNG TỒN TẠI
    // =====================================================
    //
    if (

      !currentUser

    ) {

      return res.status(404)

        .json({

          success:

            false,

          message:

            "User not found",

        });
    }


    // =====================================================
    // TRẢ USER
    // =====================================================
    //
    return res.json(

      formatUser(

        currentUser

      )

    );

  } catch (err) {

    console.error(

      "GET ME ERROR:",

      err

    );

    return res.status(500)

      .json({

        success:

          false,

        message:

          "Get current user failed",

        error:

          err.message,

      });
  }
};


// =====================================================
// UPDATE PROFILE
// =====================================================
//
// Chức năng:
//
// User cập nhật:
//
// - name
// - phone
// - email
// - avatar
//
exports.updateProfile = async (

  req,

  res

) => {

  try {

    const {

      name,

      phone,

      email,

      avatar,

    } = req.body;


    // =====================================================
    // KIỂM TRA DỮ LIỆU
    // =====================================================
    //
    if (

      name === undefined &&

      phone === undefined &&

      email === undefined &&

      avatar === undefined

    ) {

      return res.status(400)

        .json({

          message:

            "Nothing to update",

        });
    }


    const user =

      await User.findByPk(

        req.user.id

      );


    if (

      !user

    ) {

      return res.status(404)

        .json({

          message:

            "User not found",

        });
    }


    // =====================================================
    // CHECK PHONE
    // =====================================================
    //
    if (

      phone

    ) {

      const existPhone =

        await User.findOne({

          where: {

            phone,

          },

        });


      if (

        existPhone &&

        existPhone.id !==

        user.id

      ) {

        return res.status(400)

          .json({

            message:

              "Phone already exists",

          });
      }
    }


    // UPDATE NAME
    if (name) {

      user.name =

        name.trim();
    }


    // UPDATE PHONE
    if (phone) {

      user.phone =

        phone.trim();
    }


    // UPDATE EMAIL
    if (email) {

      const newEmail =

        email

          .trim()

          .toLowerCase();


      // VALIDATE EMAIL
      if (

        !validateEmail(

          newEmail

        )

      ) {

        return res.status(400)

          .json({

            message:

              "Invalid email",

          });
      }


      // CHECK EMAIL
      const existEmail =

        await User.findOne({

          where: {

            email:

              newEmail,

          },

        });


      if (

        existEmail &&

        existEmail.id !==

        user.id

      ) {

        return res.status(400)

          .json({

            message:

              "Email already exists",

          });
      }


      user.email =

        newEmail;
    }


    // UPDATE AVATAR
    if (avatar) {

      user.avatar =

        avatar.trim();
    }


    await user.save();


    return res.json({

      message:

        "Update profile success",

      user:

        formatUser(

          user

        ),

    });

  } catch (err) {

    console.error(

      "Update profile error:",

      err

    );

    return res.status(500)

      .json({

        message:

          "Update failed",

        error:

          err.message,

      });
  }
};


// =====================================================
// UPDATE AVATAR
// =====================================================
//
// Chức năng:
//
// Chỉ cập nhật avatar.
//
exports.updateAvatar = async (

  req,

  res

) => {

  try {

    const {

      avatar,

    } = req.body;


    if (

      !avatar

    ) {

      return res.status(400)

        .json({

          message:

            "Avatar is required",

        });
    }


    const user =

      await User.findByPk(

        req.user.id

      );


    if (

      !user

    ) {

      return res.status(404)

        .json({

          message:

            "User not found",

        });
    }


    user.avatar =

      avatar.trim();

    await user.save();


    return res.json({

      message:

        "Update avatar success",

      user:

        formatUser(

          user

        ),

    });

  } catch (err) {

    console.error(

      "Update avatar error:",

      err

    );

    return res.status(500)

      .json({

        message:

          "Update avatar failed",

        error:

          err.message,

      });
  }
};
// =====================================================
// IMPORT NODEMAILER
// =====================================================
//
// nodemailer:
//
// Dùng để gửi email OTP.
//
const nodemailer =

  require("nodemailer");


// =====================================================
// FORGOT PASSWORD
// =====================================================
//
// Chức năng:
//
// Quên mật khẩu.
//
// Quy trình:
//
// 1. Nhận email.
// 2. Tìm user.
// 3. Tạo OTP.
// 4. Lưu OTP vào database.
// 5. Gửi OTP qua email.
// 6. Trả kết quả.
//
exports.forgotPassword =

  async (

    req,

    res

  ) => {

    try {

      const {

        email,

      } = req.body;


      // =====================================================
      // KIỂM TRA EMAIL
      // =====================================================
      //
      if (

        !email

      ) {

        return res.status(400)

          .json({

            success:

              false,

            message:

              "Email is required",

          });
      }


      // =====================================================
      // TÌM USER
      // =====================================================
      //
      const user =

        await User.findOne({

          where: {

            email:

              email

                .trim()

                .toLowerCase(),

          },

        });


      // =====================================================
      // KHÔNG TÌM THẤY EMAIL
      // =====================================================
      //
      if (

        !user

      ) {

        return res.status(404)

          .json({

            success:

              false,

            message:

              "Email not found",

          });
      }


      // =====================================================
      // TẠO OTP 6 CHỮ SỐ
      // =====================================================
      //
      // Ví dụ:
      //
      // 582931
      //
      const otp =

        Math.floor(

          100000 +

          Math.random() * 900000

        ).toString();


      // =====================================================
      // LƯU OTP
      // =====================================================
      //
      user.resetotp =

        otp;


      // =====================================================
      // THỜI GIAN HẾT HẠN OTP
      // =====================================================
      //
      // 5 phút
      //
      user.resetotpexpire =

        new Date(

          Date.now() +

          5 * 60 * 1000

        );


      await user.save();


      // =====================================================
      // CẤU HÌNH EMAIL
      // =====================================================
      //
      const transporter =

        nodemailer.createTransport({

          service:

            "gmail",

          auth: {

            user:

              process.env.EMAIL_USER,

            pass:

              process.env.EMAIL_PASS,

          },

        });


      // =====================================================
      // GỬI EMAIL
      // =====================================================
      //
      await transporter.sendMail({

        from:

          process.env.EMAIL_USER,

        to:

          email,

        subject:

          "OTP RESET PASSWORD",

        html: `

          <h2>Reset Password</h2>

          <p>Mã OTP của bạn:</p>

          <h1>${otp}</h1>

          <p>OTP hết hạn sau 5 phút.</p>

        `,

      });


      // =====================================================
      // TRẢ KẾT QUẢ
      // =====================================================
      //
      return res.json({

        success:

          true,

        message:

          "OTP sent to email",

      });

    } catch (err) {

      console.error(

        "Forgot password error:",

        err

      );


      return res.status(500)

        .json({

          success:

            false,

          message:

            "Server error",

          error:

            err.message,

        });
    }
  };



// =====================================================
// RESET PASSWORD
// =====================================================
//
// Chức năng:
//
// Đặt lại mật khẩu.
//
// Quy trình:
//
// 1. Nhận email.
// 2. Nhận OTP.
// 3. Nhận mật khẩu mới.
// 4. Kiểm tra OTP.
// 5. Kiểm tra hết hạn.
// 6. Hash password.
// 7. Xóa OTP.
// 8. Lưu mật khẩu mới.
//
exports.resetPassword =

  async (

    req,

    res

  ) => {

    try {

      const {

        email,

        otp,

        newPassword,

      } = req.body;


      // =====================================================
      // KIỂM TRA DỮ LIỆU
      // =====================================================
      //
      if (

        !email ||

        !otp ||

        !newPassword

      ) {

        return res.status(400)

          .json({

            success:

              false,

            message:

              "Missing fields",

          });
      }


      // =====================================================
      // TÌM USER
      // =====================================================
      //
      const user =

        await User.findOne({

          where: {

            email:

              email

                .trim()

                .toLowerCase(),

            resetotp:

              otp,

          },

        });


      // =====================================================
      // OTP KHÔNG HỢP LỆ
      // =====================================================
      //
      if (

        !user

      ) {

        return res.status(400)

          .json({

            success:

              false,

            message:

              "OTP invalid",

          });
      }


      // =====================================================
      // KIỂM TRA OTP HẾT HẠN
      // =====================================================
      //
      if (

        new Date(

          user.resetotpexpire

        ) < new Date()

      ) {

        return res.status(400)

          .json({

            success:

              false,

            message:

              "OTP expired",

          });
      }


      // =====================================================
      // HASH PASSWORD MỚI
      // =====================================================
      //
      const hash =

        await bcrypt.hash(

          newPassword,

          10

        );


      // =====================================================
      // CẬP NHẬT PASSWORD
      // =====================================================
      //
      user.password =

        hash;


      // =====================================================
      // XÓA OTP
      // =====================================================
      //
      user.resetotp =

        null;


      user.resetotpexpire =

        null;


      await user.save();


      // =====================================================
      // TRẢ KẾT QUẢ
      // =====================================================
      //
      return res.json({

        success:

          true,

        message:

          "Reset password success",

      });

    } catch (err) {

      console.error(

        "Reset password error:",

        err

      );


      return res.status(500)

        .json({

          success:

            false,

          message:

            "Server error",

          error:

            err.message,

        });
    }
  };
  // =====================================================
// UPDATE USER (ADMIN)
// =====================================================
//
// Chức năng:
//
// Admin cập nhật thông tin user.
//
// Có thể cập nhật:
//
// - name
// - email
// - phone
// - role
//
// Quy trình:
//
// 1. Lấy id từ params.
// 2. Tìm user.
// 3. Kiểm tra email trùng.
// 4. Kiểm tra phone trùng.
// 5. Cập nhật dữ liệu.
// 6. Lưu database.
// 7. Trả kết quả.
//
exports.updateUser = async (

  req,

  res

) => {

  try {

    // =====================================================
    // LẤY ID USER
    // =====================================================
    //
    const {

      id,

    } = req.params;


    const {

      name,

      email,

      phone,

      role,

    } = req.body;


    // =====================================================
    // TÌM USER
    // =====================================================
    //
    const user =

      await User.findByPk(

        id

      );


    // =====================================================
    // USER KHÔNG TỒN TẠI
    // =====================================================
    //
    if (

      !user

    ) {

      return res.status(404)

        .json({

          message:

            "User not found",

        });
    }


    // =====================================================
    // KIỂM TRA EMAIL TRÙNG
    // =====================================================
    //
    if (

      email

    ) {

      const exist =

        await User.findOne({

          where: {

            email:

              email

                .trim()

                .toLowerCase(),

          },

        });


      if (

        exist &&

        exist.id !==

        user.id

      ) {

        return res.status(400)

          .json({

            message:

              "Email already exists",

          });
      }


      user.email =

        email

          .trim()

          .toLowerCase();
    }


    // =====================================================
    // KIỂM TRA PHONE TRÙNG
    // =====================================================
    //
    if (

      phone

    ) {

      const existPhone =

        await User.findOne({

          where: {

            phone,

          },

        });


      if (

        existPhone &&

        existPhone.id !==

        user.id

      ) {

        return res.status(400)

          .json({

            message:

              "Phone already exists",

          });
      }


      user.phone =

        phone.trim();
    }


    // =====================================================
    // CẬP NHẬT TÊN
    // =====================================================
    //
    if (

      name

    ) {

      user.name =

        name.trim();
    }


    // =====================================================
    // CẬP NHẬT ROLE
    // =====================================================
    //
    // Ví dụ:
    //
    // user
    // admin
    //
    if (

      role

    ) {

      user.role =

        role;
    }


    // =====================================================
    // LƯU DATABASE
    // =====================================================
    //
    await user.save();


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    return res.json({

      message:

        "Update user success",

      user:

        formatUser(

          user

        ),

    });

  } catch (err) {

    console.error(

      "Update user error:",

      err

    );


    return res.status(500)

      .json({

        message:

          "Update user failed",

        error:

          err.message,

      });
  }
};


// =====================================================
// DELETE USER (ADMIN)
// =====================================================
//
// Chức năng:
//
// Admin xóa user.
//
// Quy trình:
//
// 1. Lấy id.
// 2. Chặn admin tự xóa chính mình.
// 3. Tìm user.
// 4. Xóa user.
// 5. Trả kết quả.
//
exports.deleteUser = async (

  req,

  res

) => {

  try {

    const {

      id,

    } = req.params;


    // =====================================================
    // CHẶN TỰ XÓA CHÍNH MÌNH
    // =====================================================
    //
    // req.user.id:
    // id lấy từ JWT.
    //
    // Nếu admin tự xóa:
    //
    // → mất quyền truy cập.
    //
    if (

      Number(id) ===

      req.user.id

    ) {

      return res.status(400)

        .json({

          message:

            "Cannot delete yourself",

        });
    }


    // =====================================================
    // TÌM USER
    // =====================================================
    //
    const user =
      await User.findByPk(

        id

      );


    // =====================================================
    // USER KHÔNG TỒN TẠI
    // =====================================================
    //
    if (

      !user

    ) {

      return res.status(404)

        .json({

          message:

            "User not found",

        });
    }


    // =====================================================
    // XÓA USER
    // =====================================================
    //
    await user.destroy();


    // =====================================================
    // TRẢ KẾT QUẢ
    // =====================================================
    //
    return res.json({

      message:

        "Delete user success",

    });

  } catch (err) {

    console.error(

      "Delete user error:",

      err

    );


    return res.status(500)

      .json({

        message:

          "Delete user failed",

        error:

          err.message,

      });
  }
};