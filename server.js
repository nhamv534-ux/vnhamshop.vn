const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    users: [], products: [
      {id:1,name:'Blox Fruits Starter',category:'account',description:'Tài khoản khởi đầu — thông tin mẫu, hãy thay bằng sản phẩm thật của bạn.',price:49000,stock:5,active:true,image:'',tag:'Mới'},
      {id:2,name:'Blox Fruits Premium',category:'account',description:'Tài khoản mẫu cấp cao — chỉ đăng bán tài khoản bạn có quyền chuyển nhượng.',price:149000,stock:2,active:true,image:'',tag:'Premium'},
      {id:3,name:'Gói hỗ trợ game',category:'topup',description:'Đơn dịch vụ mẫu. Xác nhận nội dung và điều kiện trước khi mua.',price:25000,stock:20,active:true,image:'',tag:'Dịch vụ'}
    ], orders: [], nextProductId:4, nextOrderId:1
  }, null, 2));
}
function readDB(){ return JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); }
function writeDB(db){ fs.writeFileSync(DATA_FILE, JSON.stringify(db,null,2)); }
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'100kb'}));
app.use(express.urlencoded({extended:false}));
app.use(session({
  name:'vnham.sid', secret:process.env.SESSION_SECRET || 'DEV_ONLY_CHANGE_THIS_SECRET',
  resave:false, saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:8*60*60*1000}
}));
app.use(express.static(path.join(__dirname,'public')));

const safeUser = u => ({id:u.id,username:u.username,role:u.role});
function requireLogin(req,res,next){ if(!req.session.user) return res.status(401).json({error:'Vui lòng đăng nhập.'}); next(); }
function requireAdmin(req,res,next){ if(!req.session.user || req.session.user.role!=='admin') return res.status(403).json({error:'Chỉ quản trị viên mới được thực hiện thao tác này.'}); next(); }
function clean(s,max=160){ return String(s??'').trim().slice(0,max); }
function money(n){ return Number.isFinite(Number(n)) && Number(n)>=0 && Number(n)<=1000000000; }

app.get('/api/config',(req,res)=>res.json({
  shopName:process.env.SHOP_NAME||'VĂN NHÂM Blox Fruits',
  bankName:process.env.BANK_NAME||'YOUR_BANK_NAME',
  bankAccount:process.env.BANK_ACCOUNT||'YOUR_ACCOUNT_NUMBER',
  bankAccountName:process.env.BANK_ACCOUNT_NAME||'YOUR_ACCOUNT_HOLDER',
  bankNotePrefix:process.env.BANK_NOTE_PREFIX||'VNHAM',
  user:req.session.user||null
}));
app.get('/api/products',(req,res)=>{
  const db=readDB(); const products=db.products.filter(p=>p.active || req.session.user?.role==='admin');
  res.json(products);
});
app.post('/api/register', async (req,res)=>{
  const username=clean(req.body.username,24), password=String(req.body.password||'');
  if(!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return res.status(400).json({error:'Tên đăng nhập cần 3–24 ký tự chữ, số hoặc dấu gạch dưới.'});
  if(password.length<8 || password.length>128) return res.status(400).json({error:'Mật khẩu phải từ 8 đến 128 ký tự.'});
  const db=readDB(); if(db.users.some(u=>u.username.toLowerCase()===username.toLowerCase())) return res.status(409).json({error:'Tên đăng nhập đã tồn tại.'});
  const user={id:Date.now(),username,passwordHash:await bcrypt.hash(password,12),role:'user'};
  db.users.push(user); writeDB(db); req.session.user=safeUser(user); res.json({ok:true,user:req.session.user});
});
app.post('/api/login', async (req,res)=>{
  const username=clean(req.body.username,24), password=String(req.body.password||'');
  const db=readDB(); let user=db.users.find(u=>u.username.toLowerCase()===username.toLowerCase());
  if(!user && username===(process.env.ADMIN_USERNAME||'admin') && process.env.ADMIN_PASSWORD && password===process.env.ADMIN_PASSWORD){
    user={id:1,username,role:'admin',passwordHash:await bcrypt.hash(password,12)};
    db.users.push(user); writeDB(db);
  }
  if(!user || !await bcrypt.compare(password,user.passwordHash)) return res.status(401).json({error:'Sai tài khoản hoặc mật khẩu.'});
  req.session.user=safeUser(user); res.json({ok:true,user:req.session.user});
});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));

app.post('/api/orders',requireLogin,(req,res)=>{
  const productId=Number(req.body.productId), quantity=Math.max(1,Math.min(10,Number(req.body.quantity)||1));
  const method=['bank','card'].includes(req.body.method)?req.body.method:'bank';
  const buyerNote=clean(req.body.note,200);
  const db=readDB(), product=db.products.find(p=>p.id===productId&&p.active);
  if(!product) return res.status(404).json({error:'Sản phẩm không tồn tại.'});
  if(product.stock<quantity) return res.status(400).json({error:'Số lượng tồn kho không đủ.'});
  const order={id:db.nextOrderId++,userId:req.session.user.id,username:req.session.user.username,
    productId:product.id,productName:product.name,quantity,total:product.price*quantity,
    method,buyerNote,status:'pending',createdAt:new Date().toISOString()};
  db.orders.push(order); writeDB(db);
  res.json({ok:true,order:{id:order.id,total:order.total,status:order.status,method:order.method}});
});
app.get('/api/my-orders',requireLogin,(req,res)=>{
  const db=readDB(); res.json(db.orders.filter(o=>o.userId===req.session.user.id).reverse());
});
app.get('/api/admin/orders',requireAdmin,(req,res)=>res.json(readDB().orders.slice().reverse()));
app.patch('/api/admin/orders/:id',requireAdmin,(req,res)=>{
  const db=readDB(), order=db.orders.find(o=>o.id===Number(req.params.id));
  if(!order) return res.status(404).json({error:'Không tìm thấy đơn hàng.'});
  const status=clean(req.body.status,20);
  if(!['pending','paid','processing','completed','cancelled'].includes(status)) return res.status(400).json({error:'Trạng thái không hợp lệ.'});
  if(status==='cancelled' && order.status!=='cancelled'){
    const product=db.products.find(p=>p.id===order.productId); if(product) product.stock+=order.quantity;
  }
  order.status=status; writeDB(db); res.json({ok:true,order});
});
app.post('/api/admin/products',requireAdmin,(req,res)=>{
  const name=clean(req.body.name,100), category=['account','topup','service'].includes(req.body.category)?req.body.category:'account';
  const price=Number(req.body.price), stock=Number(req.body.stock);
  if(!name||!money(price)||!Number.isInteger(stock)||stock<0||stock>100000) return res.status(400).json({error:'Tên, giá hoặc tồn kho không hợp lệ.'});
  const db=readDB(), p={id:db.nextProductId++,name,category,description:clean(req.body.description,1000),price,stock,active:req.body.active!==false,image:clean(req.body.image,500),tag:clean(req.body.tag,40)};
  db.products.push(p); writeDB(db); res.json({ok:true,product:p});
});
app.put('/api/admin/products/:id',requireAdmin,(req,res)=>{
  const db=readDB(), p=db.products.find(p=>p.id===Number(req.params.id));
  if(!p) return res.status(404).json({error:'Không tìm thấy sản phẩm.'});
  const name=clean(req.body.name,100), price=Number(req.body.price), stock=Number(req.body.stock);
  if(!name||!money(price)||!Number.isInteger(stock)||stock<0||stock>100000) return res.status(400).json({error:'Tên, giá hoặc tồn kho không hợp lệ.'});
  Object.assign(p,{name,category:['account','topup','service'].includes(req.body.category)?req.body.category:'account',description:clean(req.body.description,1000),price,stock,active:req.body.active!==false,image:clean(req.body.image,500),tag:clean(req.body.tag,40)});
  writeDB(db); res.json({ok:true,product:p});
});
app.delete('/api/admin/products/:id',requireAdmin,(req,res)=>{
  const db=readDB(), idx=db.products.findIndex(p=>p.id===Number(req.params.id));
  if(idx<0) return res.status(404).json({error:'Không tìm thấy sản phẩm.'});
  db.products.splice(idx,1); writeDB(db); res.json({ok:true});
});
app.get('/api/admin/stats',requireAdmin,(req,res)=>{
  const db=readDB(); res.json({users:db.users.length,products:db.products.length,orders:db.orders.length,revenue:db.orders.filter(o=>['paid','processing','completed'].includes(o.status)).reduce((s,o)=>s+o.total,0)});
});
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`VĂN NHÂM Shop running at http://localhost:${PORT}`));