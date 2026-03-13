const TelegramBot = require("node-telegram-bot-api");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// ================= FIREBASE =================
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ikuti-wizard-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// ================= TOKEN BOT =================
const token = "8239827500:AAFGbp-UUBoHCQ6sLoDM1X1NSQ_imTgocwM";
const bot = new TelegramBot(token, { polling: true });

console.log("✅ Bot Rekap aktif...");

// ================= ADMIN =================
const adminId = 6623205535;

// ================= HELPER =================
function encodeKey(id){
  return String(id).replace("-", "neg_");
}

function decodeKey(key){
  return key.replace("neg_", "-");
}

// ================= CEK MEMBER =================
async function cekMember(userId){

  const snapshot = await db.ref("memberAktif/" + userId).once("value");
  const expired = snapshot.val();

  if(!expired) return {status:"notfound"};

  if(new Date() > new Date(expired)){
    await db.ref("memberAktif/" + userId).remove();
    return {status:"expired"};
  }

  return {status:"active", expired};
}

// ================= CEK GRUP =================
async function cekGrup(chatId){

  const key = encodeKey(chatId);

  const snapshot = await db.ref("grupAktif/" + key).once("value");
  const expired = snapshot.val();

  if(!expired) return {status:"notfound"};

  if(new Date() > new Date(expired)){
    await db.ref("grupAktif/" + key).remove();
    return {status:"expired"};
  }

  return {status:"active", expired};
}

// ================= HITUNG LIST =================
function hitungList(text){

  if(!text) return "⚠️ Tidak ada teks.";

  let kecil = [];
  let besar = [];

  let saldoKecil = 0;
  let saldoBesar = 0;

  const lines = text.split("\n");

  let mode = "";

  lines.forEach(line=>{

    line = line.trim();

    if(line.toLowerCase().startsWith("kecil")){
      mode="kecil";
      return;
    }

    if(line.toLowerCase().startsWith("besar")){
      mode="besar";
      return;
    }

    const angka = line.match(/(\d+)/g);

    if(!angka) return;

    const value = parseInt(angka[angka.length-1]);

    if(mode==="kecil"){
      kecil.push(value);
      saldoKecil += value;
    }

    if(mode==="besar"){
      besar.push(value);
      saldoBesar += value;
    }

  });

  const totalKecil = kecil.reduce((a,b)=>a+b,0);
  const totalBesar = besar.reduce((a,b)=>a+b,0);

  const saldo = saldoKecil + saldoBesar;

  let selisih="";

  if(totalKecil > totalBesar){
    selisih=`🐠 BESAR kurang ${totalKecil-totalBesar}`;
  }
  else if(totalBesar > totalKecil){
    selisih=`🐠 KECIL kurang ${totalBesar-totalKecil}`;
  }
  else{
    selisih="🐠 KECIL dan BESAR sama";
  }

  return `🔵 KECIL: ${kecil.join(", ")} = ${totalKecil}

🔴 BESAR: ${besar.join(", ")} = ${totalBesar}

${selisih}

💰 Saldo: ${saldo}K`;
}

// ================= PARSE DURASI =================
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

// ================= ADD USER =================
bot.onText(/\/adduser (\d+) (.+)/, async(msg,match)=>{

  if(msg.from.id !== adminId){
    bot.sendMessage(msg.chat.id,"❌ Kamu bukan admin");
    return;
  }

  const user = match[1];
  const expired = parseDurasi(match[2]);

  await db.ref("memberAktif/"+user).set(expired);

  bot.sendMessage(msg.chat.id,
  `✅ User ${user} ditambahkan\nExpired: ${expired}`);

});

// ================= ADD GROUP =================
bot.onText(/\/addgroup (\-?\d+) (.+)/, async(msg,match)=>{

  if(msg.from.id !== adminId){
    bot.sendMessage(msg.chat.id,"❌ Kamu bukan admin");
    return;
  }

  const group = encodeKey(match[1]);
  const expired = parseDurasi(match[2]);

  await db.ref("grupAktif/"+group).set(expired);

  bot.sendMessage(msg.chat.id,
  `✅ Grup ${match[1]} ditambahkan\nExpired: ${expired}`);

});

// ================= CEK ID GRUP =================
bot.onText(/\/cekidgrub/, (msg)=>{

  if(!msg.chat.type.includes("group")){
    bot.sendMessage(msg.chat.id,"❌ Hanya di grup");
    return;
  }

  bot.sendMessage(msg.chat.id,
  `📌 ID Grup: ${msg.chat.id}`);

});

// ================= COMMAND EXPIRED =================
bot.onText(/\/expired/, async(msg)=>{

  const user = msg.from.id;

  if(user === adminId){
    bot.sendMessage(msg.chat.id,
    "🎉 Anda Admin Premium");
    return;
  }

  const result = await cekMember(user);

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

// ================= MESSAGE HANDLER =================
bot.on("message", async(msg)=>{

  const text = msg.text || "";
  const chatId = msg.chat.id;
  const user = msg.from.id;

  const isGroup =
  msg.chat.type==="group" ||
  msg.chat.type==="supergroup";

  if(text.startsWith("/")) return;

  try{

    if(isGroup){

      if(!text.startsWith("/rekap")) return;

      const cek = await cekGrup(chatId);

      if(cek.status!=="active"){
        bot.sendMessage(chatId,"❌ Grup belum berlangganan");
        return;
      }

      if(!msg.reply_to_message){
        bot.sendMessage(chatId,"⚠️ Balas list dengan /rekap");
        return;
      }

      const hasil = hitungList(msg.reply_to_message.text);

      bot.sendMessage(chatId,hasil);

      return;

    }

    if(user !== adminId){

      const cek = await cekMember(user);

      if(cek.status!=="active"){
        bot.sendMessage(chatId,"❌ Akses tidak aktif");
        return;
      }

    }

    bot.sendMessage(chatId,hitungList(text));

  }
  catch(err){

    console.log(err);

    bot.sendMessage(chatId,"❌ Terjadi error");

  }

});

// ================= ERROR HANDLER =================
bot.on("polling_error",(err)=>{
  console.log("Polling error:",err.message);
});

process.on("unhandledRejection",(err)=>{
  console.log("Unhandled:",err);
});

process.on("uncaughtException",(err)=>{
  console.log("Crash:",err);
});

// ================= KEEP ALIVE =================
setInterval(()=>{
  console.log("Bot masih aktif...");
},60000);