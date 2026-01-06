import express, { Request, Response } from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- TEST ROUTE ---
app.get("/", (_req: Request, res: Response): void => {
  res.send("Backend is working!");
});

// --- EMAIL SENDING ROUTE ---
app.post("/send", async (req: Request, res: Response): Promise<void> => {
  const { name, email, message } = req.body as {
    name: string;
    email: string;
    message: string;
  };

  if (!name || !email || !message) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // Gmail App Password if using Gmail
      },
    });

    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.CONTACT_EMAIL}>`,
      replyTo: `"${name}" <${email}>`,
      to: process.env.CONTACT_EMAIL,
      subject: `New message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p>${message}</p>`,
    });

    console.log("✅ Email sent:", info.response);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    if (error instanceof Error) {
      console.error("❌ SMTP Error:", error.message);
      res.status(500).json({ error: error.message });
    } else {
      console.error("❌ Unknown SMTP Error:", error);
      res.status(500).json({ error: "Unknown error occurred" });
    }
  }
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
