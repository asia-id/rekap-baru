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
    now.setHours(23, 59, 0, 0);

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

// ===== STATE ADMIN UNTUK CONVERSATION MODE =====
const waitingForAddUser = {};
const waitingForDeleteUser = {};
const waitingForAddGroup = {};
const waitingForDeleteGroup = {};

// ===== COMMANDS =====
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

// ===== HANDLE MESSAGE UNTUK SEMUA STATE =====
bot.on("message", async msg => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    const isGroup = msg.chat.type.includes("group");
    if(!text) return;

    const db = loadDB();

    // Abaikan command
    if(text.startsWith("/")) return;

    // --- ADD USER ---
    if(waitingForAddUser[msg.from.id]){
        const parts = text.split(" ");
        if(parts.length < 2){ bot.sendMessage(chatId, "❌ Format salah"); return; }
        const userId = parts[0];
        const durasi = parts.slice(1).join(" ");
        try{
            const expired = parseDurasi(durasi);
            db.members[userId] = expired;
            saveDB(db);
            let expiredText = expired === "permanen" ? "Permanen" : new Date(expired).toLocaleString("id-ID", {day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"});
            bot.sendMessage(chatId, `✅ User ${userId} aktif sampai ${expiredText}`);
            bot.sendMessage(userId, `🎉 Selamat! Kamu sekarang aktif berlangganan BOT REKAP sampai ${expiredText} ✅\nSilakan kirim list KB langsung`);
            delete waitingForAddUser[msg.from.id];
        } catch(e){ bot.sendMessage(chatId, "❌ Format durasi salah"); }
        return;
    }

    // --- HAPUS USER ---
    if(waitingForDeleteUser[msg.from.id]){
        const userId = text;
        if(db.members[userId]){
            delete db.members[userId];
            saveDB(db);
            bot.sendMessage(chatId, `✅ User ${userId} berhasil dihapus`);
            bot.sendMessage(userId, "❌ Masa aktif kamu telah habis ☹️, order lagi di @vixzaaFy");
        } else bot.sendMessage(chatId, `⚠️ User ${userId} tidak ditemukan`);
        delete waitingForDeleteUser[msg.from.id];
        return;
    }

    // --- ADD GROUP ---
    if(waitingForAddGroup[msg.from.id]){
        const parts = text.split(" ");
        if(parts.length < 2){ bot.sendMessage(chatId, "❌ Format salah"); return; }
        const groupId = parts[0];
        const durasi = parts.slice(1).join(" ");
        try{
            const expired = parseDurasi(durasi);
            db.groups[groupId] = expired;
            saveDB(db);
            let expiredText = expired === "permanen" ? "Permanen" : new Date(expired).toLocaleString("id-ID", {day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"});
            bot.sendMessage(chatId, `✅ Grup ${groupId} aktif sampai ${expiredText}`);
            bot.sendMessage(groupId, `🎉 Grup ini sekarang aktif berlangganan BOT REKAP sampai ${expiredText} ✅\nFungsi /rekap bisa digunakan di grup ini`);
            delete waitingForAddGroup[msg.from.id];
        } catch(e){ bot.sendMessage(chatId, "❌ Format durasi salah"); }
        return;
    }

    // --- HAPUS GRUP ---
    if(waitingForDeleteGroup[msg.from.id]){
        const groupId = text;
        if(db.groups[groupId]){
            delete db.groups[groupId];
            saveDB(db);
            bot.sendMessage(chatId, `✅ Grup ${groupId} berhasil dihapus`);
            bot.sendMessage(groupId, "❌ Masa aktif grup telah habis ☹️, order lagi di @vixzaaFy");
        } else bot.sendMessage(chatId, `⚠️ Grup ${groupId} tidak ditemukan`);
        delete waitingForDeleteGroup[msg.from.id];
        return;
    }

    // ===== HANDLE GROUP COMMANDS =====
    if(isGroup){
        try{
            const member = await bot.getChatMember(chatId, msg.from.id);
            if(member.status !== "administrator" && member.status !== "creator") return; // user biasa tidak bisa
        } catch(e){ return; }

        if(!db.groups[chatId]){
            bot.sendMessage(chatId, "Grub belum berlangganan ☹️ hubungi @vixzaaFy");
            return;
        }

        if(text.startsWith("/rekap")){
            if(!msg.reply_to_message){ bot.sendMessage(chatId, "⚠️ Reply list dengan /rekap"); return; }
            bot.sendMessage(chatId, hitungList(msg.reply_to_message.text));
        }
    } else {
        if(msg.from.id !== adminId){
            const status = cekMember(msg.from.id);
            if(status === "notfound"){ bot.sendMessage(chatId, "❌ Bot hanya untuk yang berlangganan"); return; }
            if(status === "expired"){ return; }
        }
        bot.sendMessage(chatId, hitungList(text));
    }
});

// ===== START COMMAND =====
bot.onText(/\/start/, msg => {
    const chatId = msg.chat.id;
    const status = cekMember(msg.from.id);

    if(msg.from.id !== adminId && status === "active"){
        bot.sendMessage(chatId, `🎉 Selamat! Kamu sekarang aktif berlangganan BOT REKAP
Silakan kirim list KB langsung`);
    } else {
        bot.sendMessage(chatId, `🎉 SELAMAT DATANG DI BOT REKAP 🙌
Agar bisa akses bot ini, Anda harus berlangganan terlebih dahulu, hubungi developer @vixzaaFy ✅`);
    }
});

// ===== CEK ID =====
bot.onText(/\/cekid/, async msg => {
    const chatId = msg.chat.id;
    if(msg.chat.type === "private") bot.sendMessage(chatId, `👤 ID Anda: ${msg.from.id}`);
    else {
        try{
            const member = await bot.getChatMember(chatId, msg.from.id);
            if(member.status !== "administrator" && member.status !== "creator") return bot.sendMessage(chatId, "❌ Hanya admin grup");
        } catch(e){ return; }
        bot.sendMessage(chatId, `📌 ID Grup: ${chatId}`);
    }
});

// ===== COMMAND LIST =====
bot.onText(/\/command/, msg => {
    const chatId = msg.chat.id;
    if(msg.from.id === adminId){
        bot.sendMessage(chatId, `📜 Command Admin:
/adduser, /hapususer, /listuser, /addgroup, /hapusgrub, /listgrub, /cekid, /start, /command`);
    } else if(msg.chat.type.includes("group")){
        bot.sendMessage(chatId, "❌ Hanya admin grup yang bisa menggunakan perintah ini");
    } else {
        bot.sendMessage(chatId, `📜 Command User:
/start, /rekap, /cekid`);
    }
});

// ===== NOTIFIKASI 1 JAM SEBELUM EXPIRED =====
function startExpiryReminder() {
    setInterval(() => {
        const db = loadDB();
        const now = Date.now();

        // User
        for (let userId in db.members) {
            if(db.members[userId] === "permanen") continue;
            const diff = db.members[userId] - now;
            if(diff > 0 && diff <= 3600000){ // <= 1 jam
                bot.sendMessage(userId, "⏰ PERINGATAN! Masa aktif kamu akan habis 1 jam lagi ☹️, order lagi di @vixzaaFy");
            }
        }

        // Grup
        for (let groupId in db.groups) {
            if(db.groups[groupId] === "permanen") continue;
            const diff = db.groups[groupId] - now;
            if(diff > 0 && diff <= 3600000){ // <= 1 jam
                bot.sendMessage(groupId, "⏰ PERINGATAN! Masa aktif grup akan habis 1 jam lagi ☹️, order lagi di @vixzaaFy");
            }
        }

    }, 5 * 60 * 1000); // cek tiap 5 menit
}

// Jalankan reminder
startExpiryReminder();

// ===== ERROR =====
bot.on("polling_error", err => console.log(err.message));
