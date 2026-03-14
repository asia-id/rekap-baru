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
        bot.sendMessage(id, "❌ Masa aktif kamu telah habis ☹️, order lagi di @vixzaaFy");
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

// ===== ADD USER DENGAN DURASI + PESAN OTOMATIS =====
bot.onText(/\/adduser (\d+) (.+)/, (msg, match) => {
    if (msg.from.id !== adminId) {
        bot.sendMessage(msg.chat.id, "❌ Hanya admin yang bisa menggunakan perintah ini");
        return;
    }

    let userId = match[1];
    let durasi = match[2];

    try {
        let expired = parseDurasi(durasi);
        let db = loadDB();
        db.members[userId] = expired;
        saveDB(db);

        let tanggal = new Date(expired).toLocaleString("id-ID");
        bot.sendMessage(msg.chat.id, `✅ User ${userId} aktif sampai ${tanggal}`);

        bot.sendMessage(userId, 
`🎉 Selamat! Kamu sekarang aktif berlangganan BOT REKAP
sampai ${tanggal} ✅

Silakan kirim list KB disini

NOTE !!!!
1. Langsung kirim list KB, karena fungsi /start tidak berfungsi. Setelah itu bot otomatis akan rekap.
2. Fungsi /rekap hanya berfungsi di grub KB.
Di bot ini tinggal kirim list saja

THANKS FOR ORDER 🤖🤴`);

    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Format durasi salah");
    }
});

// ===== ADD GROUP =====
bot.onText(/\/addgroup (-?\d+)/, (msg, match) => {
    if (msg.from.id !== adminId) {
        bot.sendMessage(msg.chat.id, "❌ Hanya admin yang bisa menggunakan perintah ini");
        return;
    }
    let db = loadDB();
    db.groups[match[1]] = true;
    saveDB(db);

    bot.sendMessage(msg.chat.id, "✅ Grup ditambahkan");
});

// ===== HAPUS USER =====
bot.onText(/\/hapususer (\d+)/, (msg, match) => {
    if (msg.from.id !== adminId) {
        bot.sendMessage(msg.chat.id, "❌ Hanya admin yang bisa menggunakan perintah ini");
        return;
    }

    let userId = match[1];
    let db = loadDB();
    if(db.members[userId]){
        delete db.members[userId];
        saveDB(db);
        bot.sendMessage(msg.chat.id, `✅ User ${userId} dihapus dari langganan`);
        bot.sendMessage(userId, "❌ Masa aktif kamu telah habis ☹️, order lagi di @vixzaaFy");
    } else {
        bot.sendMessage(msg.chat.id, `⚠️ User ${userId} tidak ditemukan`);
    }
});

// ===== HAPUS GRUP =====
bot.onText(/\/hapusgrub (-?\d+)/, (msg, match) => {
    if (msg.from.id !== adminId) {
        bot.sendMessage(msg.chat.id, "❌ Hanya admin yang bisa menggunakan perintah ini");
        return;
    }

    let groupId = match[1];
    let db = loadDB();
    if(db.groups[groupId]){
        delete db.groups[groupId];
        saveDB(db);
        bot.sendMessage(msg.chat.id, `✅ Grup ${groupId} dihapus dari langganan`);
    } else {
        bot.sendMessage(msg.chat.id, `⚠️ Grup ${groupId} tidak ditemukan`);
    }
});

// ===== LIST USER =====
bot.onText(/\/listuser/, (msg) => {
    if (msg.from.id !== adminId) {
        bot.sendMessage(msg.chat.id, "❌ Hanya admin yang bisa menggunakan perintah ini");
        return;
    }

    let db = loadDB();
    let members = Object.keys(db.members);
    if(members.length === 0){
        bot.sendMessage(msg.chat.id, "⚠️ Tidak ada user yang berlangganan");
    } else {
        let membersInfo = members.map(id => `${id} : ${new Date(db.members[id]).toLocaleString("id-ID")}`);
        bot.sendMessage(msg.chat.id, `📋 List User Berlangganan:\n${membersInfo.join("\n")}`);
    }
});

// ===== LIST GRUP =====
bot.onText(/\/listgrub/, (msg) => {
    if (msg.from.id !== adminId) {
        bot.sendMessage(msg.chat.id, "❌ Hanya admin yang bisa menggunakan perintah ini");
        return;
    }

    let db = loadDB();
    let groups = Object.keys(db.groups);
    if(groups.length === 0){
        bot.sendMessage(msg.chat.id, "⚠️ Tidak ada grup yang berlangganan");
    } else {
        bot.sendMessage(msg.chat.id, `📋 List Grup Berlangganan:\n${groups.join("\n")}`);
    }
});

// ===== START COMMAND =====
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    let status = cekMember(msg.from.id);

    const welcomeMessage = `
🎉 SELAMAT DATANG DI BOT REKAP 🙌

Agar bisa akses bot ini, Anda harus berlangganan terlebih dahulu, hubungi developer @vixzaaFy ✅

Keunggulan fitur:
- Rekap list KB
- Dapat dimasukkan ke grup KB

⚠️ NOTE: BOT INI HANYA BISA DIGUNAKAN UNTUK LIST KB.
`;

    if (msg.from.id !== adminId && status === "active") {
        bot.sendMessage(chatId, "Selamat! Anda aktif berlangganan ✅");
    } else {
        bot.sendMessage(chatId, welcomeMessage);
    }
});

// ===== CEK ID =====
bot.onText(/\/cekid/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;

    if(chatType === "private"){
        bot.sendMessage(chatId, `👤 ID Anda: ${msg.from.id}`);
    } else if(chatType.includes("group")){
        try{
            const member = await bot.getChatMember(chatId, msg.from.id);
            if(member.status !== "administrator" && member.status !== "creator"){
                bot.sendMessage(chatId, "❌ Hanya admin grup yang bisa menggunakan perintah ini");
                return;
            }
        } catch(e){
            return;
        }
        bot.sendMessage(chatId, `📌 ID Grup: ${chatId}`);
    }
});

// ===== COMMAND LIST =====
bot.onText(/\/command/, (msg) => {
    const chatId = msg.chat.id;

    if(msg.from.id === adminId){ 
        const adminCommands = `
📜 Command Admin Utama:

/start        - Menampilkan pesan selamat datang
/adduser      - Menambahkan user dengan durasi, format: /adduser <userId> <durasi>
/hapususer    - Menghapus user dari langganan, format: /hapususer <userId>
/listuser     - Menampilkan semua user berlangganan
/addgroup     - Menambahkan grup ke list berlangganan, format: /addgroup <groupId>
/hapusgrub    - Menghapus grup dari langganan, format: /hapusgrub <groupId>
/listgrub     - Menampilkan semua grup berlangganan
/cekid        - Menampilkan ID grup atau ID user sesuai chat
/command      - Menampilkan daftar semua command (ini)
`;
        bot.sendMessage(chatId, adminCommands);
    } else if(msg.chat.type.includes("group")) {
        bot.sendMessage(chatId, "❌ Hanya admin grup yang bisa menggunakan perintah ini");
    } else {
        const userCommands = `
📜 Command User:

/start        - Menampilkan pesan selamat datang
/rekap        - Rekap list KB (jika berlangganan)
/cekid        - Menampilkan ID Anda
`;
        bot.sendMessage(chatId, userCommands);
    }
});

// ===== MESSAGE HANDLER =====
bot.on("message", async msg => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    const isGroup = msg.chat.type.includes("group");
    if (!text) return;

    if(text.startsWith("/")) return; // abaikan command

    const db = loadDB();

    if(isGroup){
        try {
            const member = await bot.getChatMember(chatId, msg.from.id);
            if(member.status !== "administrator" && member.status !== "creator"){
                return; // user biasa di grup tidak bisa mengirim apapun
            }
        } catch(e){
            return;
        }
        // Admin grup bisa kirim list untuk /rekap
        if(msg.reply_to_message){
            bot.sendMessage(chatId, hitungList(msg.reply_to_message.text));
        }
    } else {
        if(msg.from.id !== adminId){
            const status = cekMember(msg.from.id);
            if(status === "notfound") {
                bot.sendMessage(chatId, "❌ Bot rekap hanya untuk yang berlangganan, hubungi @vixzaaFy");
                return;
            }
            if(status === "expired"){
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
