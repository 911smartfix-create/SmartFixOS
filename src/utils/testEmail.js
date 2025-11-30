import { sendEmail } from "./utils/emailService.js";

await sendEmail({
  to: "cliente@ejemplo.com",
  subject: "Prueba SmartFixOS",
  html: "<p>Todo funciona correctamente 🔧📩</p>",
});
