const TelegramBot = require('node-telegram-bot-api');
const fs = require("fs");

// ===== TOKEN BOT =====
const token = "8239827500:AAFGbp-UUBoHCQ6sLoDM1X1NSQ_imTgocwM";
const bot = new TelegramBot(token, { polling: true });

console.log("✅ Bot Rekap aktif...");

// ===== ADMIN =====
const adminId = 6623205535;

// ===== DATABASE =====
const dbFile = "database.json";

function loadDB() {
    if (!fs.existsSync(dbFile)) {
        fs.writeFileSync(dbFile, JSON.stringify({ members: {}, groups: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbFile));
}

function saveDB(data) {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

// ===== PARSE DURASI =====
function parseDurasi(text) {
    text = text.toLowerCase().trim();
    if(text === "permanen") return "permanen";

    let now = new Date();
    let match = text.match(/(\d+)/);
    let angka = match ? parseInt(match[1]) : 1;

    if (text.includes("hari")) now.setDate(now.getDate() + angka);
    else if (text.includes("minggu")) now.setDate(now.getDate() + (angka * 7));
    else if (text.includes("bulan")) now.setMonth(now.getMonth() + angka);
    else if (text.includes("tahun")) now.setFullYear(now.getFullYear() + angka);
    else throw new Error("Format durasi salah");

    // set jam expired 23:59
    now.setHours(23);
    now.setMinutes(59);
    now.setSeconds(0);
    now.setMilliseconds(0);

    return now.getTime();
}

// ===== CEK MEMBER EXPIRED =====
function cekMember(id) {
    let db = loadDB();
    if (!db.members[id]) return "notfound";

    if(db.members[id] !== "permanen" && Date.now() > db.members[id]) {
        delete db.members[id];
        saveDB(db);
        bot.sendMessage(id, "❌ Masa aktif kamu telah habis ☹️, order lagi di @vixzaaFy");
        return "expired";
    }

    return "active";
}

// ===== CEK GRUP EXPIRED =====
function cekGrup(id) {
    let db = loadDB();
    if (!db.groups[id]) return "notfound";

    if(db.groups[id] !== "permanen" && Date.now() > db.groups[id]) {
        delete db.groups[id];
        saveDB(db);
        bot.sendMessage(id, "❌ Masa aktif grup telah habis ☹️, order lagi di @vixzaaFy");
        return "expired";
    }

    return "active";
}

// ===== HITUNG LIST =====
function hitungList(text) {
    if (!text || !text.trim()) return "⚠️ Teks kosong";

    let kecil = [], besar = [];
    let saldoKecil = 0, saldoBesar = 0;

    let lines = text.split("\n");
    let mode = "";

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        if (line.toLowerCase().startsWith("kecil")) {
            mode = "kecil";
            return;
        }
        if (line.toLowerCase().startsWith("besar")) {
            mode = "besar";
            return;
        }

        let match = line.match(/(\d+)/g);
        if (!match) return;

        let angka = parseInt(match[match.length - 1]);

        if (mode == "kecil") {
            kecil.push(angka);
            saldoKecil += angka;
        }
        if (mode == "besar") {
            besar.push(angka);
            saldoBesar += angka;
        }
    });

    let totalKecil = kecil.reduce((a, b) => a + b, 0);
    let totalBesar = besar.reduce((a, b) => a + b, 0);
    let saldo = saldoKecil + saldoBesar;

    let hasil = "";

    if (totalKecil === totalBesar) {
        hasil = `🥳 KECIL dan BESAR sama`;
    } else if (totalKecil > totalBesar) {
        hasil = `📉 BESAR kurang: ${totalKecil - totalBesar}`;
    } else {
        hasil = `📉 KECIL kurang: ${totalBesar - totalKecil}`;
    }

    return `
🔶 KECIL : ${kecil.join(", ")} = ${totalKecil}

🔷 BESAR : ${besar.join(", ")} = ${totalBesar}

${hasil}

💰 Saldo Anda Seharusnya : ${saldo} K
`;
}

// ===== ADD USER =====
bot.onText(/\/adduser (\d+) (.+)/, (msg, match) => {
    if(msg.from.id !== adminId) return bot.sendMessage(msg.chat.id, "❌ Hanya admin yang bisa menggunakan perintah ini");

    let userId = match[1];
    let durasi = match[2];
    try {
        let expired = parseDurasi(durasi);
        let db = loadDB();
        db.members[userId] = expired;
        saveDB(db);

        let expiredText = expired === "permanen" ? "Permanen" : new Date(expired).toLocaleString("id-ID", {hour:"2-digit", minute:"2-digit", day:"2-digit", month:"2-digit", year:"numeric"});
        bot.sendMessage(msg.chat.id, `✅ User ${userId} aktif sampai ${expiredText}`);

        if(expired !== "permanen"){
            bot.sendMessage(userId, `🎉 Selamat! Kamu sekarang aktif berlangganan BOT REKAP
sampai ${expiredText} ✅

Silakan kirim list KB disini
NOTE:
1. Langsung kirim list KB, karena fungsi /start tidak berfungsi. Setelah itu bot otomatis akan rekap.
2. Fungsi /rekap hanya berlaku di grub KB.
THANKS FOR ORDER 🤖🤴`);
        }

    } catch(e) {
        bot.sendMessage(msg.chat.id, "❌ Format durasi salah");
    }
});

// ===== ADD GRUP =====
bot.onText(/\/addgroup (-?\d+)(?: (.+))?/, (msg, match) => {
    if(msg.from.id !== adminId) return bot.sendMessage(msg.chat.id, "❌ Hanya admin yang bisa menggunakan perintah ini");

    let groupId = match[1];
    let durasi = match[2] || "permanen"; // default permanen

    try{
        let expired = parseDurasi(durasi);
        let db = loadDB();
        db.groups[groupId] = expired;
        saveDB(db);

        let expiredText = expired === "permanen" ? "Permanen" : new Date(expired).toLocaleString("id-ID", {hour:"2-digit", minute:"2-digit", day:"2-digit", month:"2-digit", year:"numeric"});
        bot.sendMessage(msg.chat.id, `✅ Grup ${groupId} aktif sampai ${expiredText}`);
    } catch(e){
        bot.sendMessage(msg.chat.id, "❌ Format durasi salah");
    }
});
