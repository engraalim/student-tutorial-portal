const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const ADMIN_UID = "YOUR_ADMIN_FIREBASE_UID";
const FROM_EMAIL = "YOUR_VERIFIED_SENDER@example.com";

exports.sendNoticeEmail = onRequest(
  { secrets: [RESEND_API_KEY], cors: true },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const authHeader = req.get("Authorization") || "";
      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing Firebase ID token" });
      }

      const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
      if (decoded.uid !== ADMIN_UID) {
        return res.status(403).json({ error: "Admin only" });
      }

      const { title, message } = req.body || {};
      if (!title || !message) {
        return res.status(400).json({ error: "Missing title/message" });
      }

      const snap = await admin.firestore().collection("students").get();
      const emails = [...new Set(
        snap.docs.map(d => d.data().email).filter(Boolean)
      )];

      if (!emails.length) {
        return res.status(200).json({ sent: 0 });
      }

      const resend = new Resend(RESEND_API_KEY.value());

      // Resend and other providers may impose recipient/batch limits.
      // For a real class, chunk this list according to your provider limits.
      const results = [];
      for (const email of emails) {
        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: title,
          text: message
        });
        results.push(result);
      }

      return res.status(200).json({ sent: results.length });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Email sending failed" });
    }
  }
);
