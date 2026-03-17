const TelegramBot = require('node-telegram-bot-api');
const fs = require("fs");

// ===== TOKEN BOT =====
const token = "8744867922:AAHetOKIAhRTMMQ-qRxlLCzrsdAmaZtA9VQ";
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
function saveDB(data) { fs.writeFileSync(dbFile, JSON.stringify(data, null, 2)); }

// ===== FORMAT TANGGAL =====
function formatTanggal(t) {
    let d = new Date(t);
    let day = String(d.getDate()).padStart(2,'0');
    let month = String(d.getMonth()+1).padStart(2,'0');
    let year = d.getFullYear();
    let hours = String(d.getHours()).padStart(2,'0');
    let minutes = String(d.getMinutes()).padStart(2,'0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// ===== PARSE DURASI =====
function parseDurasi(text) {
    let now = new Date();
    let match = text.match(/(\d+)/);
    if(!match) throw new Error("Format durasi salah");
    let angka = parseInt(match[1]);
    text = text.toLowerCase();

    if(text.includes("hari")) now.setDate(now.getDate()+angka);
    else if(text.includes("minggu")) now.setDate(now.getDate()+(angka*7));
    else if(text.includes("bulan")) now.setMonth(now.getMonth()+angka);
    else if(text.includes("tahun")) now.setFullYear(now.getFullYear()+angka);
    else throw new Error("Format durasi salah");

    return now.getTime();
}

// ===== CEK MEMBER EXPIRED =====
function cekMember(id){
    let db = loadDB();
    if(!db.members[id]) return "notfound";
    if(Date.now() > db.members[id]){
        delete db.members[id];
        saveDB(db);
        return "expired";
    }
    return "active";
}

// ===== HITUNG LIST =====
function hitungList(text){
    if(!text || !text.trim()) return "⚠️ Teks kosong";
    let kecil=[], besar=[], saldoKecil=0, saldoBesar=0;
    let lines = text.split("\n");
    let mode="";
    lines.forEach(line=>{
        line=line.trim();
        if(!line) return;
        if(line.toLowerCase().startsWith("kecil")){ mode="kecil"; return; }
        if(line.toLowerCase().startsWith("besar")){ mode="besar"; return; }
        let match=line.match(/(\d+)/g);
        if(!match) return;
        let angka=parseInt(match[match.length-1]);
        if(mode=="kecil"){ kecil.push(angka); saldoKecil+=angka; }
        if(mode=="besar"){ besar.push(angka); saldoBesar+=angka; }
    });
    let totalKecil=kecil.reduce((a,b)=>a+b,0);
    let totalBesar=besar.reduce((a,b)=>a+b,0);
    let saldo=saldoKecil+saldoBesar;
    let hasil="";
    if(totalKecil===totalBesar) hasil=`🥳 KECIL dan BESAR sama`;
    else if(totalKecil>totalBesar) hasil=`📉 BESAR kurang: ${totalKecil-totalBesar}`;
    else hasil=`📉 KECIL kurang: ${totalBesar-totalKecil}`;
    return `
🔶 KECIL : ${kecil.join(", ")} = ${totalKecil}

🔷 BESAR : ${besar.join(", ")} = ${totalBesar}

${hasil}

💰 Saldo Anda Seharusnya : ${saldo} K
`;
}

// ===== COMMAND ADMIN =====

// ADD USER
bot.onText(/\/adduser (\d+) (.+)/, (msg, match)=>{
    if(msg.from.id!==adminId) return;
    const userId = match[1];
    const durasi = match[2];
    try{
        const expired=parseDurasi(durasi);
        let db=loadDB();
        db.members[userId]=expired;
        saveDB(db);
        bot.sendMessage(msg.chat.id, `✅ User berhasil ditambahkan\nUser ID: ${userId}\nAktif sampai: ${formatTanggal(expired)}`);
        // Kirim pesan konfirmasi ke user
        bot.sendMessage(userId, `🎉 Anda sekarang berlangganan bot rekap hingga ${formatTanggal(expired)} ✅`);
    }catch(e){
        bot.sendMessage(msg.chat.id,"❌ Format durasi salah. Contoh: 1 hari, 7 hari, 1 bulan");
    }
});

// ADD GRUP
bot.onText(/\/addgroup (.+) (.+)/, (msg, match)=>{
    if(msg.from.id!==adminId) return;
    const groupId=match[1];
    const durasi=match[2];
    if(!groupId.startsWith("-")){
        bot.sendMessage(msg.chat.id,"❌ Format salah, ID grup harus diawali '-'");
        return;
    }
    try{
        const expired=parseDurasi(durasi);
        let db=loadDB();
        db.groups[groupId]=expired;
        saveDB(db);
        bot.sendMessage(msg.chat.id, `✅ Grup berhasil ditambahkan\nGrup ID: ${groupId}\nAktif sampai: ${formatTanggal(expired)}`);
    }catch(e){
        bot.sendMessage(msg.chat.id,"❌ Format durasi salah. Contoh: 1 hari, 7 hari, 1 bulan");
    }
});

// HAPUS USER
bot.onText(/\/hapususer (\d+)/, (msg, match)=>{
    if(msg.from.id!==adminId) return;
    const userId=match[1];
    let db=loadDB();
    if(db.members[userId]){
        delete db.members[userId];
        saveDB(db);
        bot.sendMessage(msg.chat.id, `✅ User berhasil dihapus\nUser ID: ${userId}`);
        bot.sendMessage(userId, `⚠️ Masa aktif Anda di bot rekap telah dicabut oleh admin.`);
    }else{
        bot.sendMessage(msg.chat.id, `⚠️ User ${userId} tidak ditemukan`);
    }
});

// HAPUS GRUP
bot.onText(/\/hapusgrub (.+)/, (msg, match)=>{
    if(msg.from.id!==adminId) return;
    const groupId=match[1];
    if(!groupId.startsWith("-")){
        bot.sendMessage(msg.chat.id,"❌ Format salah, ID grup harus diawali '-'");
        return;
    }
    let db=loadDB();
    if(db.groups[groupId]){
        delete db.groups[groupId];
        saveDB(db);
        bot.sendMessage(msg.chat.id, `✅ Grup berhasil dihapus\nGrup ID: ${groupId}`);
    }else{
        bot.sendMessage(msg.chat.id, `⚠️ Grup ${groupId} tidak ditemukan`);
    }
});

// LIST USER
bot.onText(/\/listuser/, (msg)=>{
    if(msg.from.id!==adminId) return;
    let db=loadDB();
    const members=Object.keys(db.members);
    if(members.length===0) bot.sendMessage(msg.chat.id,"⚠️ Tidak ada user yang berlangganan");
    else bot.sendMessage(msg.chat.id,`📋 List User Berlangganan:\n${members.join("\n")}`);
});

// LIST GRUP
bot.onText(/\/listgrub/, (msg)=>{
    if(msg.from.id!==adminId) return;
    let db=loadDB();
    const groups=Object.keys(db.groups);
    if(groups.length===0) bot.sendMessage(msg.chat.id,"⚠️ Tidak ada grup yang berlangganan");
    else bot.sendMessage(msg.chat.id,`📋 List Grup Berlangganan:\n${groups.join("\n")}`);
});

// CEK ID UNTUK SEMUA
bot.onText(/\/cekid/, msg=>{
    bot.sendMessage(msg.chat.id, `ID Chat Anda: ${msg.chat.id}`);
});

// CEK ID GRUP
bot.onText(/\/cekidgrub/, msg=>{
    if(!msg.chat.type.includes("group")) return;
    bot.sendMessage(msg.chat.id, `ID Grup : ${msg.chat.id}`);
});

// START COMMAND
bot.onText(/\/start/, msg=>{
    const chatId=msg.chat.id;
    const welcomeMessage=`
🎉 SELAMAT DATANG DI BOT REKAP 🙌

Agar bisa akses bot ini, Anda harus berlangganan terlebih dahulu, hubungi developer @vixzaaFy ✅

Keunggulan fitur:
- Rekap list KB
- Dapat dimasukkan ke grup KB

⚠️ NOTE: BOT INI HANYA BISA DIGUNAKAN UNTUK LIST KB.
`;
    bot.sendMessage(chatId,welcomeMessage);
});

// COMMAND LIST
bot.onText(/\/command/, msg=>{
    const chatId=msg.chat.id;
    if(msg.from.id===adminId){
        const adminCommands=`
📜 Command Admin Utama:

/start        - Menampilkan pesan selamat datang
/adduser      - Menambahkan user (format: /adduser <userId> <durasi>)
/hapususer    - Menghapus user (format: /hapususer <userId>)
/listuser     - Menampilkan semua user berlangganan
/addgroup     - Menambahkan grup (format: /addgroup <-groupId> <durasi>)
/hapusgrub    - Menghapus grup (format: /hapusgrub <-groupId>)
/listgrub     - Menampilkan semua grup berlangganan
/cekidgrub    - Menampilkan ID grup
/cekid        - Menampilkan ID chat (bisa digunakan siapa saja)
/command      - Menampilkan daftar semua command
`;
        bot.sendMessage(chatId,adminCommands);
    }else if(msg.chat.type.includes("group")){
        const groupCommands=`
📜 Command Grup:

/rekap        - Rekap list KB (harus reply pesan list)
/cekidgrub    - Menampilkan ID grup
/cekid        - Menampilkan ID chat
`;
        bot.sendMessage(chatId,groupCommands);
    }else{
        const userCommands=`
📜 Command User:

/start        - Menampilkan pesan selamat datang
/rekap        - Rekap list KB (jika berlangganan)
/cekid        - Menampilkan ID chat
`;
        bot.sendMessage(chatId,userCommands);
    }
});

// REKAP LIST
bot.on("message", async msg=>{
    let chatId=msg.chat.id;
    let text=(msg.text||"").trim();
    if(!text) return;

    if(text.startsWith("/start") || text.startsWith("/command") || text.match(/^\/(adduser|hapususer|listuser|addgroup|hapusgrub|listgrub|cekidgrub|cekid)/)) return;

    let db=loadDB();
    let isGroup=msg.chat.type.includes("group");

    if(isGroup){
        if(!text.startsWith("/rekap")) return;
        if(!db.groups[chatId]){
            bot.sendMessage(chatId,"Grub belum berlangganan☹️ hubungi @vixzaaFy");
            return;
        }
        try{
            let member=await bot.getChatMember(chatId,msg.from.id);
            if(member.status!=="administrator" && member.status!=="creator"){
                bot.sendMessage(chatId,"❌ Hanya admin grup yang bisa menggunakan bot ini");
                return;
            }
        }catch(e){ return; }
        if(!msg.reply_to_message){
            bot.sendMessage(chatId,"⚠️ Reply list dengan /rekap");
            return;
        }
        bot.sendMessage(chatId,hitungList(msg.reply_to_message.text));
    }else{
        if(msg.from.id!==adminId){
            let status=cekMember(msg.from.id);
            if(status==="notfound"){
                bot.sendMessage(chatId,"❌ bot rekap hanya untuk yang berlangganan, hubungi @vixzaaFy");
                return;
            }
            if(status==="expired"){
                bot.sendMessage(chatId,"❌ masa aktif kamu sudah habis");
                return;
            }
        }
        bot.sendMessage(chatId,hitungList(text));
    }
});

// ERROR POLLING
bot.on("polling_error", err=>{
    console.log(err.message);
});
