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

// ===== CEK & HAPUS GRUP EXPIRED OTOMATIS =====
function cekGroupExpired() {
    let db = loadDB();
    let now = Date.now();
    let changed = false;

    for (let groupId in db.groups) {
        if(now > db.groups[groupId]){
            delete db.groups[groupId];
            changed = true;
            bot.sendMessage(groupId, "❌ Masa aktif grup ini telah habis ☹️, hubungi @vixzaaFy untuk perpanjang");
        }
    }

    if(changed) saveDB(db);
}

// jalankan cek setiap 1 jam
setInterval(cekGroupExpired, 1000 * 60 * 60);

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
    if (msg.from.id !== adminId) return;

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

NOTE:
1. Langsung kirim list KB, karena fungsi /start tidak berfungsi. Setelah itu bot otomatis akan rekap.
2. Fungsi /rekap hanya berfungsi di grub KB.

THANKS FOR ORDER 🤖🤴`);

    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Format durasi salah");
    }
});

// ===== ADD GROUP DENGAN DURASI & KOREKSI ID NEGATIF =====
bot.onText(/\/addgroup (\d+)\s+(.+)/, (msg, match) => {
    if(msg.from.id !== adminId) return;

    let groupId = match[1];
    let durasi = match[2];

    // koreksi otomatis untuk supergroup
    if (!groupId.startsWith("-100") && groupId.length <= 10) {
        groupId = "-100" + groupId;
    }

    try {
        let expired = parseDurasi(durasi);
        let db = loadDB();
        db.groups[groupId] = expired;
        saveDB(db);

        let tanggal = new Date(expired).toLocaleString("id-ID");
        bot.sendMessage(msg.chat.id, `✅ Grup ${groupId} aktif sampai ${tanggal}`);
    } catch(e) {
        bot.sendMessage(msg.chat.id, "❌ Format durasi salah");
    }
});

// ===== HAPUS USER =====
bot.onText(/\/hapususer (\d+)/, (msg, match) => {
    if (msg.from.id !== adminId) return;
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
bot.onText(/\/hapusgrub (\-?\d+)/, (msg, match) => {
    if (msg.from.id !== adminId) return;
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
    if (msg.from.id !== adminId) return;
    let db = loadDB();
    let members = Object.keys(db.members);
    if(members.length === 0){
        bot.sendMessage(msg.chat.id, "⚠️ Tidak ada user yang berlangganan");
    } else {
        let membersInfo = members.map(id => `${id} : ${new Date(db.members[id]).toLocaleString("id-ID")}`);
        bot.sendMessage(msg.chat.id, `📋 List User Berlangganan:\n${membersInfo.join("\n")}`);
    }
});

// ===== LIST GRUB =====
bot.onText(/\/listgrub/, (msg) => {
    if (msg.from.id !== adminId) return;
    let db = loadDB();
    let groups = Object.keys(db.groups);
    if(groups.length === 0){
        bot.sendMessage(msg.chat.id, "⚠️ Tidak ada grup yang berlangganan");
    } else {
        let groupsInfo = groups.map(id => `${id} : ${new Date(db.groups[id]).toLocaleString("id-ID")}`);
        bot.sendMessage(msg.chat.id, `📋 List Grup Berlangganan:\n${groupsInfo.join("\n")}`);
    }
});

// ===== CEK ID =====
bot.onText(/\/cekid/, msg => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const chatType = msg.chat.type;

    if (chatType.includes("group")) {
        bot.sendMessage(chatId, `📌 ID Grup: ${chatId}\n👤 ID Anda: ${userId}`);
    } else {
        bot.sendMessage(chatId, `👤 ID Anda: ${userId}`);
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

// ===== COMMAND LIST TERPISAH =====
bot.onText(/\/command/, (msg) => {
    const chatId = msg.chat.id;

    if(msg.from.id === adminId){ 
        const adminCommands = `
📜 Command Admin Utama:

/start        - Menampilkan pesan selamat datang
/adduser      - Menambahkan user dengan durasi, format: /adduser <userId> <durasi>
/hapususer    - Menghapus user dari langganan, format: /hapususer <userId>
/listuser     - Menampilkan semua user berlangganan
/addgroup     - Menambahkan grup ke list berlangganan, format: /addgroup <groupId> <durasi>
/hapusgrub    - Menghapus grup dari langganan, format: /hapusgrub <groupId>
/listgrub     - Menampilkan semua grup berlangganan
/cekid        - Menampilkan ID grup & ID user
/command      - Menampilkan daftar semua command
`;
        bot.sendMessage(chatId, adminCommands);
    } else if(msg.chat.type.includes("group")) {
        const groupCommands = `
📜 Command Grup:

/rekap        - Rekap list KB (harus reply pesan list)
/cekid        - Menampilkan ID grup & ID Anda
`;
        bot.sendMessage(chatId, groupCommands);
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
    let chatId = msg.chat.id;
    let text = (msg.text || "").trim();
    if (!text) return;

    if(text.startsWith("/start") || text.startsWith("/command") || text.match(/^\/(adduser|hapususer|listuser|addgroup|hapusgrub|listgrub|cekid)/)) return;

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
