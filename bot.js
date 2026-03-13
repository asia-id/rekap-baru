const TelegramBot = require('node-telegram-bot-api');
const fs = require("fs");

// ===== TOKEN BOT =====
const token = "8239827500:AAFGbp-UUBoHCQ6sLoDM1X1NSQ_imTgocwM";
const bot = new TelegramBot(token, { polling: true });

console.log("✅ Bot Rekap aktif...");

// ===== ADMIN =====
const adminId = 6623205535;

// ===== DATABASE LOKAL =====
const dbFile = "database.json";

function loadDB() {
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({ members:{}, groups:{} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbFile));
}

function saveDB(data){
  fs.writeFileSync(dbFile, JSON.stringify(data,null,2));
}

// ===== HITUNG LIST =====
function hitungList(text){

  if (!text || !text.trim()) return "⚠️ Teks kosong";

  let kecil=[], besar=[];
  let saldoKecil=0;
  let saldoBesar=0;

  let lines=text.split("\n");
  let mode="";

  lines.forEach(line=>{
    line=line.trim();

    if(!line) return;

    if(line.toLowerCase().startsWith("kecil")){
      mode="kecil";
      return;
    }

    if(line.toLowerCase().startsWith("besar")){
      mode="besar";
      return;
    }

    let match=line.match(/(\d+)/g);

    if(!match) return;

    let angka=parseInt(match[match.length-1]);

    if(mode=="kecil"){
      kecil.push(angka);
      saldoKecil+=angka;
    }

    if(mode=="besar"){
      besar.push(angka);
      saldoBesar+=angka;
    }

  });

  let totalKecil=kecil.reduce((a,b)=>a+b,0);
  let totalBesar=besar.reduce((a,b)=>a+b,0);

  let saldo=saldoKecil+saldoBesar;

  let kurang="";

  if(totalKecil>totalBesar)
  kurang=`🐠 BESAR kurang ${totalKecil-totalBesar}`;

  else if(totalBesar>totalKecil)
  kurang=`🐠 KECIL kurang ${totalBesar-totalKecil}`;

  else
  kurang=`🐠 KECIL dan BESAR sama`;

  return `
🔵 KECIL : ${kecil.join(", ")} = ${totalKecil}

🔵 BESAR : ${besar.join(", ")} = ${totalBesar}

${kurang}

💰 Saldo : ${saldo} K
`;
}

// ===== TAMBAH USER =====
bot.onText(/\/adduser (\d+)/, (msg,match)=>{

  if(msg.from.id!==adminId) return;

  let db=loadDB();

  db.members[match[1]]=true;

  saveDB(db);

  bot.sendMessage(msg.chat.id,"✅ User ditambahkan");

});

// ===== TAMBAH GRUP =====
bot.onText(/\/addgroup (-?\d+)/,(msg,match)=>{

  if(msg.from.id!==adminId) return;

  let db=loadDB();

  db.groups[match[1]]=true;

  saveDB(db);

  bot.sendMessage(msg.chat.id,"✅ Grup ditambahkan");

});

// ===== CEK ID GRUP =====
bot.onText(/\/cekidgrub/,msg=>{

  if(!msg.chat.type.includes("group")) return;

  bot.sendMessage(msg.chat.id,`ID Grup : ${msg.chat.id}`);

});

// ===== MESSAGE HANDLER =====
bot.on("message",msg=>{

  let chatId=msg.chat.id;
  let text=(msg.text||"").trim();

  if(!text) return;

  let db=loadDB();

  let isGroup=msg.chat.type.includes("group");

  if(isGroup){

    if(!text.startsWith("/rekap")) return;

    if(!db.groups[chatId]){

      bot.sendMessage(chatId,"❌ Grup belum beli akses");

      return;
    }

    if(!msg.reply_to_message){

      bot.sendMessage(chatId,"⚠️ Reply list dengan /rekap");

      return;
    }

    bot.sendMessage(chatId,hitungList(msg.reply_to_message.text));

  }else{

    if(msg.from.id!==adminId && !db.members[msg.from.id]){

      bot.sendMessage(chatId,"❌ Kamu belum beli akses");

      return;
    }

    bot.sendMessage(chatId,hitungList(text));

  }

});

// ===== ERROR =====
bot.on("polling_error",err=>{
  console.log(err.message);
});
