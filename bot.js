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

// ===== PENDING ACTIONS =====
const pendingActions = {}; // menyimpan state sementara per admin

// ===== MESSAGE HANDLER =====
bot.on("message", async msg => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = (msg.text || "").trim();
    if (!text) return;

    // Hanya admin untuk fitur multi-step
    const isAdmin = userId === adminId;

    // ===== MULTI-STEP COMMAND =====
    if(isAdmin){

        // STEP 1: Memulai command
        if(text === "/adduser"){
            pendingActions[userId] = { action: "adduser", step: 1 };
            bot.sendMessage(chatId, "Masukkan ID user yang ingin ditambahkan:");
            return;
        }

        if(text === "/addgroup"){
            pendingActions[userId] = { action: "addgroup", step: 1 };
            bot.sendMessage(chatId, "Masukkan ID grup yang ingin ditambahkan (wajib diawali -):");
            return;
        }

        if(text === "/hapususer"){
            pendingActions[userId] = { action: "hapususer", step: 1 };
            bot.sendMessage(chatId, "Masukkan ID user yang ingin dihapus:");
            return;
        }

        if(text === "/hapusgrub"){
            pendingActions[userId] = { action: "hapusgrub", step: 1 };
            bot.sendMessage(chatId, "Masukkan ID grup yang ingin dihapus (wajib diawali -):");
            return;
        }

        // STEP 2: Proses input ID atau durasi
        if(pendingActions[userId]){
            const actionData = pendingActions[userId];

            if(actionData.step === 1){
                // Terima ID
                const id = text;

                // Validasi grup
                if(["addgroup","hapusgrub"].includes(actionData.action) && !id.startsWith("-")){
                    bot.sendMessage(chatId, "❌ Format salah, ID grup harus diawali dengan '-'");
                    delete pendingActions[userId];
                    return;
                }

                actionData.id = id;

                // Jika adduser, minta durasi
                if(actionData.action === "adduser"){
                    actionData.step = 2;
                    bot.sendMessage(chatId, `Masukkan durasi aktif user ${id} (contoh: 7 hari, 1 bulan):`);
                } else {
                    // Hapus atau add grup langsung
                    let db = loadDB();
                    if(actionData.action === "addgroup"){
                        db.groups[id] = true;
                        saveDB(db);
                        bot.sendMessage(chatId, `✅ Grup berhasil ditambahkan\nGrup ID: ${id}`);
                    }
                    if(actionData.action === "hapususer"){
                        if(db.members[id]){
                            delete db.members[id];
                            saveDB(db);
                            bot.sendMessage(chatId, `✅ User berhasil dihapus\nUser ID: ${id}`);
                        } else {
                            bot.sendMessage(chatId, `⚠️ User ${id} tidak ditemukan`);
                        }
                    }
                    if(actionData.action === "hapusgrub"){
                        if(db.groups[id]){
                            delete db.groups[id];
                            saveDB(db);
                            bot.sendMessage(chatId, `✅ Grup berhasil dihapus\nGrup ID: ${id}`);
                        } else {
                            bot.sendMessage(chatId, `⚠️ Grup ${id} tidak ditemukan`);
                        }
                    }

                    delete pendingActions[userId];
                }
                return;
            }

            if(actionData.step === 2){
                // STEP 2: durasi untuk adduser
                const durasi = text;
                try{
                    const expired = parseDurasi(durasi);
                    const db = loadDB();
                    db.members[actionData.id] = expired;
                    saveDB(db);

                    bot.sendMessage(chatId, `✅ User berhasil ditambahkan\nUser ID: ${actionData.id}\nAktif sampai: ${new Date(expired).toLocaleString()}`);
                } catch(e){
                    bot.sendMessage(chatId, "❌ Format durasi salah");
                }
                delete pendingActions[userId];
                return;
            }
        }
    }

    // ===== CEK MEMBER / GROUP =====
    let db = loadDB();
    let isGroup = msg.chat.type.includes("group");

    // Abaikan multi-step commands
    if(text.startsWith("/start") || text.startsWith("/command") || text.match(/^\/(listuser|listgrub|cekidgrub)/)) return;

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

// ===== LIST USER =====
bot.onText(/\/listuser/, (msg) => {
    if (msg.from.id !== adminId) return;
    let db = loadDB();
    let members = Object.keys(db.members);
    if(members.length === 0){
        bot.sendMessage(msg.chat.id, "⚠️ Tidak ada user yang berlangganan");
    } else {
        bot.sendMessage(msg.chat.id, `📋 List User Berlangganan:\n${members.join("\n")}`);
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
        bot.sendMessage(msg.chat.id, `📋 List Grup Berlangganan:\n${groups.join("\n")}`);
    }
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

// ===== COMMAND LIST =====
bot.onText(/\/command/, (msg) => {
    const chatId = msg.chat.id;

    if(msg.from.id === adminId){ 
        const adminCommands = `
📜 Command Admin Utama:

/start        - Menampilkan pesan selamat datang
/adduser      - Menambahkan user (multi-step)
/hapususer    - Menghapus user (multi-step)
/listuser     - Menampilkan semua user berlangganan
/addgroup     - Menambahkan grup (multi-step, wajib "-")
/hapusgrub    - Menghapus grup (multi-step, wajib "-")
/listgrub     - Menampilkan semua grup berlangganan
/cekidgrub    - Menampilkan ID grup tempat command dijalankan
/command      - Menampilkan daftar semua command
`;
        bot.sendMessage(chatId, adminCommands);
    } else if(msg.chat.type.includes("group")) {
        const groupCommands = `
📜 Command Grup:

/rekap        - Rekap list KB (harus reply pesan list)
/cekidgrub    - Menampilkan ID grup
`;
        bot.sendMessage(chatId, groupCommands);
    } else {
        const userCommands = `
📜 Command User:

/start        - Menampilkan pesan selamat datang
/rekap        - Rekap list KB (jika berlangganan)
`;
        bot.sendMessage(chatId, userCommands);
    }
});

// ===== ERROR =====
bot.on("polling_error", err => {
    console.log(err.message);
});
