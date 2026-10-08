// Generates a cryptographically signed, tamper-proof payload for each
// ticket, then renders it as a scannable QR code (data URL / base64 PNG).

const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");

const SECRET = process.env.JWT_SECRET || "eventra_super_secret_change_me";

// Sign a compact ticket payload. No expiry — a ticket is valid until used.
function signTicketToken(ticketId, eventId) {
  return jwt.sign({ ticketId, eventId, typ: "ticket" }, SECRET);
}

function verifyTicketToken(token) {
  return jwt.verify(token, SECRET); // throws if tampered / invalid
}

async function generateQRDataUrl(token) {
  return QRCode.toDataURL(token, { margin: 1, width: 320 });
}

module.exports = { signTicketToken, verifyTicketToken, generateQRDataUrl };
