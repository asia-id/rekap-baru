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
    let now = new Date();
    let match = text.match(/(\d+)/);
    let angka = match ? parseInt(match[1]) : 1;

    text = text.toLowerCase();

    if (text.includes("hari")) now.setDate(now.getDate() + angka);
    else if (text.includes("minggu")) now.setDate(now.getDate() + (angka * 7));
    else if (text.includes("bulan")) now.setMonth(now.getMonth() + angka);
    else if (text.includes("tahun")) now.setFullYear(now.getFullYear() + angka);
    else throw new Error("Format durasi salah");

    return now.getTime();
}

// ===== CEK MEMBER EXPIRED =====
function cekMember(id) {
    let db = loadDB();
    if (!db.members[id]) return "notfound";

    if (Date.now() > db.members[id]) {
        delete db.members[id];
        saveDB(db);
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

// ===== ADD USER DENGAN DURASI =====
bot.onText(/\/adduser (\d+) (.+)/, (msg, match) => {
    if (msg.from.id !== adminId) return;

    let userId = match[1];
    let durasi = match[2];

    try {
        let expired = parseDurasi(durasi);
        let db = loadDB();
        db.members[userId] = expired;
        saveDB(db);

        bot.sendMessage(msg.chat.id, `✅ User ${userId} aktif sampai ${new Date(expired).toLocaleString()}`);
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Format durasi salah");
    }
});

// ===== ADD GROUP =====
bot.onText(/\/addgroup (-?\d+)/, (msg, match) => {
    if (msg.from.id !== adminId) return;

    let db = loadDB();
    db.groups[match[1]] = true;
    saveDB(db);

    bot.sendMessage(msg.chat.id, "✅ Grup ditambahkan");
});

// ===== CEK ID GRUP =====
bot.onText(/\/cekidgrub/, msg => {
    if (!msg.chat.type.includes("group")) return;
    bot.sendMessage(msg.chat.id, `ID Grup : ${msg.chat.id}`);
});

// ===== START COMMAND =====
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    const welcomeMessage = `
🎉 SELAMAT DATANG DI BOT REKAP 🙌

Agar bisa akses bot ini, Anda harus berlangganan terlebih dahulu, hubungi developer @vixzaaFy ✅

Keunggulan fitur:
- Rekap list KB
- Dapat dimasukkan ke grup KB

⚠️ NOTE: BOT INI HANYA BISA DIGUNAKAN UNTUK LIST KB.
`;

    bot.sendMessage(chatId, welcomeMessage);
});

// ===== COMMAND LIST TERPISAH =====
bot.onText(/\/command/, (msg) => {
    const chatId = msg.chat.id;

    if(msg.from.id === adminId){ 
        // Admin utama
        const adminCommands = `
📜 Command Admin Utama:

/start        - Menampilkan pesan selamat datang
/adduser      - Menambahkan user dengan durasi, format: /adduser <userId> <durasi>
/addgroup     - Menambahkan grup ke list berlangganan, format: /addgroup <groupId>
/cekidgrub    - Menampilkan ID grup tempat command dijalankan
/command      - Menampilkan daftar semua command (ini)
`;
        bot.sendMessage(chatId, adminCommands);
    } else if(msg.chat.type.includes("group")) {
        // User di grup
        const groupCommands = `
📜 Command Grup:

/rekap        - Rekap list KB (harus reply pesan list)
/cekidgrub    - Menampilkan ID grup
`;
        bot.sendMessage(chatId, groupCommands);
    } else {
        // User biasa
        const userCommands = `
📜 Command User:

/start        - Menampilkan pesan selamat datang
/rekap        - Rekap list KB (jika berlangganan)
`;
        bot.sendMessage(chatId, userCommands);
    }
});

// ===== MESSAGE HANDLER =====
bot.on("message", async msg => {
    let chatId = msg.chat.id;
    let text = (msg.text || "").trim();
    if (!text) return;

    // ABAIKAN CEK MEMBER JIKA /start ATAU /command
    if (text === "/start" || text === "/command") return;

    let db = loadDB();
    let isGroup = msg.chat.type.includes("group");

    if (isGroup) {
        if (!text.startsWith("/rekap")) return;

        if (!db.groups[chatId]) {
            bot.sendMessage(chatId, "Grub belum berlangganan☹️ hubungi @vixzaaFy");
            return;
        }

        try {
            let member = await bot.getChatMember(chatId, msg.from.id);
            if (member.status !== "administrator" && member.status !== "creator") {
                bot.sendMessage(chatId, "❌ Hanya admin grup yang bisa menggunakan bot ini");
                return;
            }
        } catch (e) {
            return;
        }

        if (!msg.reply_to_message) {
            bot.sendMessage(chatId, "⚠️ Reply list dengan /rekap");
            return;
        }

        bot.sendMessage(chatId, hitungList(msg.reply_to_message.text));

    } else {
        if (msg.from.id !== adminId) {
            let status = cekMember(msg.from.id);

            if (status === "notfound") {
                bot.sendMessage(chatId, "❌ bot rekap hanya untuk yang berlangganan, hubungi @vixzaaFy");
                return;
            }

            if (status === "expired") {
                bot.sendMessage(chatId, "❌ masa aktif kamu sudah habis");
                return;
            }
        }

        bot.sendMessage(chatId, hitungList(text));
    }
});

// ===== ERROR =====
bot.on("polling_error", err => {
    console.log(err.message);
});
