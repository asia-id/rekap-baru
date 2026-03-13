const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

// ===== TOKEN BOT =====
const token = "8239827500:AAFGbp-UUBoHCQ6sLoDM1X1NSQ_imTgocwM";
const bot = new TelegramBot(token, { polling: true });

console.log("✅ Bot Rekap aktif...");

// ===== ADMIN =====
const adminId = 6623205535;

// ===== FILE DATABASE =====
const DB_FILE = "database.json";

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({
    memberAktif: {},
    grupAktif: {}
  }, null, 2));
}

function loadDB(){
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data){
  fs.writeFileSync(DB_FILE, JSON.stringify(data,null,2));
}

// ===== CEK MEMBER =====
function cekMember(userId){

  const db = loadDB();
  const expired = db.memberAktif[userId];

  if(!expired) return {status:"notfound"};

  if(new Date() > new Date(expired)){
    delete db.memberAktif[userId];
    saveDB(db);
    return {status:"expired"};
  }

  return {status:"active",expired};
}

// ===== CEK GRUP =====
function cekGrup(chatId){

  const db = loadDB();
  const expired = db.grupAktif[chatId];

  if(!expired) return {status:"notfound"};

  if(new Date() > new Date(expired)){
    delete db.grupAktif[chatId];
    saveDB(db);
    return {status:"expired"};
  }

  return {status:"active",expired};
}

// ===== PARSE DURASI =====
function parseDurasi(text){

  const now = new Date();
  const angka = parseInt(text.match(/\d+/));

  if(text.includes("hari"))
    now.setDate(now.getDate()+angka);

  else if(text.includes("minggu"))
    now.setDate(now.getDate()+(angka*7));

  else if(text.includes("bulan"))
    now.setMonth(now.getMonth()+angka);

  else if(text.includes("tahun"))
    now.setFullYear(now.getFullYear()+angka);

  return now.toISOString();
}

// ===== HITUNG LIST =====
function hitungList(text){

  let kecil=[],besar=[];
  let saldoKecil=0,saldoBesar=0;

  const lines=text.split("\n");
  let mode="";

  lines.forEach(line=>{

    line=line.trim();

    if(line.toLowerCase().startsWith("kecil")){
      mode="kecil";return;
    }

    if(line.toLowerCase().startsWith("besar")){
      mode="besar";return;
    }

    const angka=line.match(/(\d+)/g);
    if(!angka)return;

    const val=parseInt(angka[angka.length-1]);

    if(mode==="kecil"){
      kecil.push(val);
      saldoKecil+=val;
    }

    if(mode==="besar"){
      besar.push(val);
      saldoBesar+=val;
    }

  });

  const totalKecil=kecil.reduce((a,b)=>a+b,0);
  const totalBesar=besar.reduce((a,b)=>a+b,0);

  const saldo=saldoKecil+saldoBesar;

  let selisih="";

  if(totalKecil>totalBesar)
  selisih=`🐠 BESAR kurang ${totalKecil-totalBesar}`;

  else if(totalBesar>totalKecil)
  selisih=`🐠 KECIL kurang ${totalBesar-totalKecil}`;

  else
  selisih="🐠 KECIL dan BESAR sama";

  return `🔵 KECIL: ${kecil.join(", ")} = ${totalKecil}

🔴 BESAR: ${besar.join(", ")} = ${totalBesar}

${selisih}

💰 Saldo: ${saldo}K`;

}

// ===== ADD USER =====
bot.onText(/\/adduser (\d+) (.+)/,(msg,match)=>{

  if(msg.from.id!==adminId)return;

  const db=loadDB();

  const user=match[1];
  const expired=parseDurasi(match[2]);

  db.memberAktif[user]=expired;

  saveDB(db);

  bot.sendMessage(msg.chat.id,
  `✅ User ${user} ditambahkan\nExpired: ${expired}`);

});

// ===== ADD GROUP =====
bot.onText(/\/addgroup (\-?\d+) (.+)/,(msg,match)=>{

  if(msg.from.id!==adminId)return;

  const db=loadDB();

  const group=match[1];
  const expired=parseDurasi(match[2]);

  db.grupAktif[group]=expired;

  saveDB(db);

  bot.sendMessage(msg.chat.id,
  `✅ Grup ${group} ditambahkan\nExpired: ${expired}`);

});

// ===== CEK ID GRUP =====
bot.onText(/\/cekidgrub/,(msg)=>{

  if(!msg.chat.type.includes("group")){
  bot.sendMessage(msg.chat.id,"❌ Hanya di grup");
  return;
  }

  bot.sendMessage(msg.chat.id,
  `📌 ID Grup: ${msg.chat.id}`);

});

// ===== CEK EXPIRED =====
bot.onText(/\/expired/,(msg)=>{

  const result=cekMember(msg.from.id);

  if(result.status==="notfound"){
    bot.sendMessage(msg.chat.id,"❌ Belum membeli akses");
    return;
  }

  if(result.status==="expired"){
    bot.sendMessage(msg.chat.id,"❌ Akses expired");
    return;
  }

  bot.sendMessage(msg.chat.id,
  `⏳ Aktif sampai:\n${result.expired}`);

});

// ===== MESSAGE HANDLER =====
bot.on("message",(msg)=>{

  const text=msg.text||"";
  const chatId=msg.chat.id;
  const user=msg.from.id;

  const isGroup=
  msg.chat.type==="group"||
  msg.chat.type==="supergroup";

  if(text.startsWith("/"))return;

  if(isGroup){

    if(!text.startsWith("/rekap"))return;

    const cek=cekGrup(chatId);

    if(cek.status!=="active"){
      bot.sendMessage(chatId,"❌ Grup belum berlangganan");
      return;
    }

    if(!msg.reply_to_message){
      bot.sendMessage(chatId,"⚠️ Balas list dengan /rekap");
      return;
    }

    const hasil=hitungList(msg.reply_to_message.text);

    bot.sendMessage(chatId,hasil);

    return;

  }

  if(user!==adminId){

    const cek=cekMember(user);

    if(cek.status!=="active"){
      bot.sendMessage(chatId,"❌ Akses tidak aktif");
      return;
    }

  }

  bot.sendMessage(chatId,hitungList(text));

});

// ===== ERROR HANDLER =====
bot.on("polling_error",(err)=>{
  console.log("Polling error:",err.message);
});

setInterval(()=>{
  console.log("Bot masih aktif...");
},60000);
