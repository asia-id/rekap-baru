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

    now.setHours(23, 59, 0, 0);
    return now.getTime();
}

// ===== CEK MEMBER =====
function cekMember(id) {
    let db = loadDB();
    const strId = String(id);
    if (!db.members[strId]) return "notfound";

    if(db.members[strId] !== "permanen" && Date.now() > db.members[strId]) {
        delete db.members[strId];
        saveDB(db);
        bot.sendMessage(id, "❌ Masa aktif kamu telah habis ☹️, order lagi di @vixzaaFy");
        return "expired";
    }
    return "active";
}

// ===== CEK GRUP =====
function cekGrup(id) {
    let db = loadDB();
    const strId = String(id);
    if (!db.groups[strId]) return "notfound";

    if(db.groups[strId] !== "permanen" && Date.now() > db.groups[strId]) {
        delete db.groups[strId];
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

        if (line.toLowerCase().startsWith("kecil")) { mode = "kecil"; return; }
        if (line.toLowerCase().startsWith("besar")) { mode = "besar"; return; }

        let match = line.match(/(\d+)/g);
        if (!match) return;

        let angka = parseInt(match[match.length - 1]);

        if (mode == "kecil") { kecil.push(angka); saldoKecil += angka; }
        if (mode == "besar") { besar.push(angka); saldoBesar += angka; }
    });

    let totalKecil = kecil.reduce((a, b) => a + b, 0);
    let totalBesar = besar.reduce((a, b) => a + b, 0);
    let saldo = saldoKecil + saldoBesar;

    let hasil = "";
    if (totalKecil === totalBesar) hasil = `🥳 KECIL dan BESAR sama`;
    else if (totalKecil > totalBesar) hasil = `📉 BESAR kurang: ${totalKecil - totalBesar}`;
    else hasil = `📉 KECIL kurang: ${totalBesar - totalKecil}`;

    return `
🔶 KECIL : ${kecil.join(", ")} = ${totalKecil}

🔷 BESAR : ${besar.join(", ")} = ${totalBesar}

${hasil}

💰 Saldo Anda Seharusnya : ${saldo} K
`;
}

// ===== STATE ADMIN =====
const waitingForAddUser = {};
const waitingForDeleteUser = {};
const waitingForAddGroup = {};
const waitingForDeleteGroup = {};

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

// ===== COMMAND CONVERSATION MODE =====
bot.onText(/^\/adduser$/, msg => {
    if(msg.from.id !== adminId) return bot.sendMessage(msg.chat.id, "❌ Hanya admin");
    waitingForAddUser[msg.from.id] = true;
    bot.sendMessage(msg.chat.id, `📌 SILAHKAN KIRIM ID USER DAN DURASI
Contoh: "828376637 1 hari" atau "828376637 permanen"`);
});
bot.onText(/^\/hapususer$/, msg => {
    if(msg.from.id !== adminId) return bot.sendMessage(msg.chat.id, "❌ Hanya admin");
    waitingForDeleteUser[msg.from.id] = true;
    bot.sendMessage(msg.chat.id, `📌 SILAHKAN KIRIM ID USER YANG INGIN DIHAPUS`);
});
bot.onText(/^\/addgroup$/, msg => {
    if(msg.from.id !== adminId) return bot.sendMessage(msg.chat.id, "❌ Hanya admin");
    waitingForAddGroup[msg.from.id] = true;
    bot.sendMessage(msg.chat.id, `📌 SILAHKAN KIRIM ID GRUP DAN DURASI
Contoh: "123456789 1 hari" atau "123456789 permanen"`);
});
bot.onText(/^\/hapusgrub$/, msg => {
    if(msg.from.id !== adminId) return bot.sendMessage(msg.chat.id, "❌ Hanya admin");
    waitingForDeleteGroup[msg.from.id] = true;
    bot.sendMessage(msg.chat.id, `📌 SILAHKAN KIRIM ID GRUP YANG INGIN DIHAPUS`);
});

// ===== COMMAND DESKRIPSI UNTUK BOT PRIBADI =====
bot.onText(/^\/command$/, msg => {
    const chatId = msg.chat.id;
    if(msg.chat.type.includes("private")){
        if(msg.from.id === adminId){
            bot.sendMessage(chatId, `
📜 Command Admin:

/start        - Menampilkan pesan selamat datang
/adduser      - Menambahkan user dengan durasi
/hapususer    - Menghapus user dari langganan
/listuser     - Menampilkan semua user berlangganan
/addgroup     - Menambahkan grup ke list berlangganan
/hapusgrub    - Menghapus grup dari langganan
/listgrub     - Menampilkan semua grup berlangganan
/cekid        - Menampilkan ID user atau grup
/command      - Menampilkan daftar semua command
`);
        } else {
            bot.sendMessage(chatId, `
📜 Command User:

/start        - Menampilkan pesan selamat datang
/rekap        - Rekap list KB (jika berlangganan)
/cekid        - Menampilkan ID user
`);
        }
    }
});

// ===== CEK ID ADMIN =====
bot.onText(/^\/cekid$/, msg => {
    if(msg.from.id !== adminId) return bot.sendMessage(msg.chat.id, "❌ Hanya admin");
    bot.sendMessage(msg.chat.id, `ID Chat: ${msg.chat.id}\nID User: ${msg.from.id}`);
});

// ===== HANDLE MESSAGE =====
bot.on("message", async msg => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    const isGroup = msg.chat.type.includes("group");
    if(!text) return;

    const db = loadDB();

    // --- CONVERSATION MODE ---
    if(waitingForAddUser[msg.from.id]){
        const parts = text.split(" ");
        if(parts.length < 2){ bot.sendMessage(chatId, "❌ Format salah"); return; }
        const userId = parts[0];
        const durasi = parts.slice(1).join(" ");
        try{
            const expired = parseDurasi(durasi);
            db.members[String(userId)] = expired;
            saveDB(db);
            let expiredText = expired === "permanen" ? "Permanen" : new Date(expired).toLocaleString("id-ID", {day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"});
            bot.sendMessage(chatId, `✅ User ${userId} aktif sampai ${expiredText}`);
            bot.sendMessage(userId, `🎉 Selamat! Kamu sekarang aktif berlangganan BOT REKAP sampai ${expiredText} ✅\nSilakan kirim list KB langsung`);
            delete waitingForAddUser[msg.from.id];
        } catch(e){ bot.sendMessage(chatId, "❌ Format durasi salah"); }
        return;
    }

    if(waitingForDeleteUser[msg.from.id]){
        const userId = text;
        if(db.members[String(userId)]){
            delete db.members[String(userId)];
            saveDB(db);
            bot.sendMessage(chatId, `✅ User ${userId} berhasil dihapus`);
            bot.sendMessage(userId, "❌ Masa aktif kamu telah habis ☹️, order lagi di @vixzaaFy");
        } else bot.sendMessage(chatId, `⚠️ User ${userId} tidak ditemukan`);
        delete waitingForDeleteUser[msg.from.id];
        return;
    }

    if(waitingForAddGroup[msg.from.id]){
        const parts = text.split(" ");
        if(parts.length < 2){ bot.sendMessage(chatId, "❌ Format salah"); return; }
        const groupId = parts[0];
        const durasi = parts.slice(1).join(" ");
        try{
            const expired = parseDurasi(durasi);
            db.groups[String(groupId)] = expired;
            saveDB(db);
            let expiredText = expired === "permanen" ? "Permanen" : new Date(expired).toLocaleString("id-ID", {day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"});
            bot.sendMessage(chatId, `✅ Grup ${groupId} aktif sampai ${expiredText}`);
            bot.sendMessage(groupId, `🎉 Grup ini sekarang aktif berlangganan BOT REKAP sampai ${expiredText} ✅\nFungsi /rekap bisa digunakan di grup ini`);
            delete waitingForAddGroup[msg.from.id];
        } catch(e){ bot.sendMessage(chatId, "❌ Format durasi salah"); }
        return;
    }

    if(waitingForDeleteGroup[msg.from.id]){
        const groupId = text;
        if(db.groups[String(groupId)]){
            delete db.groups[String(groupId)];
            saveDB(db);
            bot.sendMessage(chatId, `✅ Grup ${groupId} berhasil dihapus`);
            bot.sendMessage(groupId, "❌ Masa aktif grup telah habis ☹️, order lagi di @vixzaaFy");
        } else bot.sendMessage(chatId, `⚠️ Grup ${groupId} tidak ditemukan`);
        delete waitingForDeleteGroup[msg.from.id];
        return;
    }

    // ===== HANDLE GROUP =====
    if(isGroup){
        try{
            const member = await bot.getChatMember(chatId, msg.from.id);
            if(member.status !== "administrator" && member.status !== "creator") return; // user biasa tidak bisa
        } catch(e){ return; }

        // Cek grup berlangganan
        const grupStatus = cekGrup(chatId);
        if(grupStatus === "notfound" || grupStatus === "expired"){
            bot.sendMessage(chatId, "Grub belum berlangganan ☹️ hubungi @vixzaaFy");
            return;
        }

        // Proses /rekap hanya reply
        if(msg.reply_to_message && text.startsWith("/rekap")){
            const replyText = msg.reply_to_message.text;
            if(!replyText || !replyText.trim()){ bot.sendMessage(chatId, "⚠️ Pesan reply kosong"); return; }
            bot.sendMessage(chatId, hitungList(replyText));
        }
        return;
    }

    // ===== HANDLE PRIVATE CHAT =====
    if(!isGroup){
        if(msg.from.id !== adminId){
            let status = cekMember(msg.from.id);
            if(status === "notfound"){
                bot.sendMessage(chatId, "❌ Bot rekap hanya untuk yang berlangganan, hubungi @vixzaaFy");
                return;
            }
            if(status === "expired") return;
        }
        bot.sendMessage(chatId, hitungList(text));
    }
});

// ===== ERROR =====
bot.on("polling_error", err => {
    console.log(err.message);
});
