import { sendEmail } from "./utils/emailService";

async function test() {
  await sendEmail({
    to: "tu-correo-personal@gmail.com",
    subject: "🚀 Prueba de SmartFixOS",
    html: "<p>Hola, esto es una prueba del sistema de correos de 911 SmartFixOS ✅</p>",
  });
}

test();
