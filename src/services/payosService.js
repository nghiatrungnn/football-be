const PayOS =
  require("@payos/node");

const payos =
  PayOS.create({
    clientId:
      process.env.PAYOS_CLIENT_ID,

    apiKey:
      process.env.PAYOS_API_KEY,

    checksumKey:
      process.env.PAYOS_CHECKSUM_KEY,
  });

console.log(
  "PAYOS READY"
);

console.log(
  "PAYOS =>",
  payos
);

module.exports =
  payos;