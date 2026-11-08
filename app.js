const ACCOUNTS=['Cash','GoPay','DANA','SeaBank','Pulsa Dataku'];
const KEY='mbstore_data_v1';
const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const rupiah=n=>'Rp'+Math.round(Number(n)||0).toLocaleString('id-ID');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fresh(){let balances={};ACCOUNTS.forEach(a=>balances[a]=0);return {version:1,accounts:balances,transactions:[],closings:[],lastDate:todayKey()}}
let db;
try{db=JSON.parse(localStorage.getItem(KEY))||fresh()}catch(e){db=fresh()}
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function ensureDay(){let t=todayKey();if(db.lastDate!==t){let old=db.lastDate,arr=db.transactions.filter(x=>x.date===old);if(old&&!db.closings.some(c=>c.date===old)){let m=metrics(arr);db.closings.push({date:old,count:arr.length,...m,balance:totalBalance(),accounts:{...db.accounts},automatic:true})}db.lastDate=t;save()}}
function dayTx(){return db.transactions.filter(t=>t.date===todayKey())}
function sum(arr,fn){return arr.reduce((s,x)=>s+fn(x),0)}
function metrics(arr){let sales=arr.filter(t=>t.type==='sale'),income=sum(arr,t=>t.type==='income'?t.amount: t.type==='sale'?t.salePrice:0),expense=sum(arr,t=>t.type==='expense'?t.amount:0),cost=sum(sales,t=>t.saleCost),gross=sum(sales,t=>t.salePrice-t.saleCost);return {sales:sum(sales,t=>t.salePrice),income,expense,cost,gross,net:gross+sum(arr,t=>t.type==='income'?t.amount:0)-expense}}
function totalBalance(){return sum(ACCOUNTS,a=>db.accounts[a]||0)}
function totalCapital(){return sum(ACCOUNTS,a=>db.accounts[a]||0)}
function accountOptions(){return ACCOUNTS.map(a=>`<option>${a}</option>`).join('')}
function render(){
 ensureDay();let arr=dayTx(),m=metrics(arr);
 document.getElementById('today').textContent=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 document.getElementById('totalCapital').textContent=rupiah(totalCapital());
 document.getElementById('heroProfit').textContent=rupiah(m.net);
 document.getElementById('heroBalance').textContent=rupiah(totalBalance());
 document.getElementById('incomeToday').textContent=rupiah(m.income);
 document.getElementById('expenseToday').textContent=rupiah(m.expense);
 document.getElementById('salesToday').textContent=rupiah(m.sales);
 document.getElementById('countToday').textContent=arr.length;
 document.getElementById('accountCards').innerHTML=ACCOUNTS.map(a=>`<div class="account"><div class="name">${a}</div><b>${rupiah(db.accounts[a])}</b><button class="secondary small" onclick="editAccount('${a}')">Ubah saldo</button></div>`).join('');
 document.getElementById('recentList').innerHTML=arr.slice(-5).reverse().map(txHtml).join('')||'<div class="empty">Belum ada transaksi hari ini.</div>';
 document.getElementById('txList').innerHTML=db.transactions.slice().reverse().slice(0,100).map(txHtml).join('')||'<div class="empty">Belum ada transaksi.</div>';
 document.getElementById('txCount').textContent=db.transactions.length+' transaksi tersimpan';
 document.getElementById('closingDate').textContent=todayKey();
 document.getElementById('rIncome').textContent=rupiah(m.income);document.getElementById('rExpense').textContent=rupiah(m.expense);document.getElementById('rSales').textContent=rupiah(m.sales);document.getElementById('rCost').textContent=rupiah(m.cost);document.getElementById('rGross').textContent=rupiah(m.gross);document.getElementById('rNet').textContent=rupiah(m.net);document.getElementById('rBalance').textContent=rupiah(totalBalance());
 document.getElementById('closingList').innerHTML=db.closings.slice().reverse().map(c=>`<div class="item"><div><b>${c.date}</b><small>${c.count} transaksi • saldo akhir ${rupiah(c.balance)}</small></div><div class="amount positive">${rupiah(c.net)}<small>laba bersih</small></div></div>`).join('')||'<div class="empty">Belum ada arsip closing.</div>';
}
function txHtml(t){let label={sale:'Penjualan',income:'Pemasukan',expense:'Pengeluaran',transfer:'Transfer'}[t.type]||t.type;let amount=t.type==='sale'?t.salePrice:t.amount;let sign=t.type==='expense'?'-':t.type==='transfer'?'↔':'+';let cls=t.type==='expense'?'negative':t.type==='sale'||t.type==='income'?'positive':'';return `<div class="item"><div><b>${esc(t.note)}</b><small>${t.date} • ${label} • ${esc(t.account||t.from||'')}</small>${t.type==='sale'?`<small>Modal ${rupiah(t.saleCost)} • Untung ${rupiah(t.salePrice-t.saleCost)}</small>`:''}</div><div class="amount ${cls}">${sign}${rupiah(amount)}</div></div>`}
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));render()}
window.showPage=showPage;
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
document.getElementById('txAccount').innerHTML=accountOptions();document.getElementById('txFrom').innerHTML=accountOptions();
const type=document.getElementById('txType');
function syncType(){let sale=type.value==='sale',transfer=type.value==='transfer';document.getElementById('saleFields').style.display=sale?'grid':'none';document.getElementById('amountField').style.display=sale?'none':'grid';document.getElementById('accountFields').style.display=transfer?'grid':'grid';document.getElementById('txFrom').parentElement.style.display=transfer||type.value==='expense'||sale?'block':'none';document.getElementById('txAccount').parentElement.querySelector('label').textContent=type.value==='expense'?'Akun sumber pengeluaran':'Akun penerima pembayaran';document.getElementById('txFrom').parentElement.querySelector('label').textContent=sale?'Akun modal pulsa (sumber)':type.value==='expense'?'Akun sumber pengeluaran':'Akun asal transfer';document.getElementById('txHint').textContent=sale?'Keuntungan otomatis = harga jual dikurangi modal pulsa. Pilih akun penerima uang dan akun sumber modal pulsa.':transfer?'Transfer memindahkan saldo antar akun tanpa dihitung sebagai pemasukan atau keuntungan.':'Pemasukan menambah saldo; pengeluaran mengurangi saldo dan keuntungan bersih.'}
type.addEventListener('change',syncType);syncType();
document.getElementById('txForm').addEventListener('submit',e=>{e.preventDefault();let t=type.value,note=document.getElementById('txNote').value.trim(),account=document.getElementById('txAccount').value,from=document.getElementById('txFrom').value;let tx={id:Date.now(),date:todayKey(),type:t,note};
 if(t==='sale'){let price=+document.getElementById('salePrice').value,cost=+document.getElementById('saleCost').value;if(!(price>0)||cost<0||!Number.isFinite(cost)){alert('Masukkan harga jual dan modal dengan benar.');return}tx.salePrice=price;tx.saleCost=cost;tx.account=account;tx.from=from;if(account===from){alert('Akun penerima pembayaran dan akun modal pulsa harus berbeda.');return}db.accounts[account]+=price;db.accounts[from]-=cost; }
 else{let amount=+document.getElementById('txAmount').value;if(!(amount>0)){alert('Nominal harus lebih dari 0.');return}tx.amount=amount;if(t==='income'){tx.account=account;db.accounts[account]+=amount}else if(t==='expense'){tx.account=from;db.accounts[from]-=amount}else{if(account===from){alert('Pilih dua akun yang berbeda.');return}tx.account=account;tx.from=from;db.accounts[from]-=amount;db.accounts[account]+=amount}}
 db.transactions.push(tx);save();e.target.reset();syncType();render();alert('Transaksi berhasil disimpan.');showPage('dashboard');
});
let editing='';
function editAccount(a){editing=a;document.getElementById('editTitle').textContent='Ubah saldo '+a;document.getElementById('editBalance').value=db.accounts[a]||0;document.getElementById('editDialog').showModal()}
window.editAccount=editAccount;
document.getElementById('editForm').addEventListener('submit',e=>{e.preventDefault();let v=+document.getElementById('editBalance').value;if(v<0)return;let delta=v-(db.accounts[editing]||0);db.accounts[editing]=v;db.transactions.push({id:Date.now(),date:todayKey(),type:delta>=0?'income':'expense',amount:Math.abs(delta),note:'Koreksi saldo '+editing,account:editing,adjustment:true});save();document.getElementById('editDialog').close();render()});
document.getElementById('closeDay').addEventListener('click',()=>{let date=todayKey();if(db.closings.some(c=>c.date===date)){alert('Closing tanggal ini sudah tersimpan.');return}let arr=dayTx(),m=metrics(arr);db.closings.push({date,count:arr.length,...m,balance:totalBalance(),accounts:{...db.accounts}});save();render();alert('Closing '+date+' berhasil disimpan. Riwayat dan saldo tetap aman.')});
function backup(){let blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='MBSTORE-backup-'+todayKey()+'.json';a.click();URL.revokeObjectURL(a.href)}
document.getElementById('exportBtn').onclick=backup;document.getElementById('backupTop').onclick=backup;
document.getElementById('importBtn').onclick=()=>document.getElementById('importFile').click();
document.getElementById('importFile').addEventListener('change',async e=>{let f=e.target.files[0];if(!f)return;try{let x=JSON.parse(await f.text());if(!x.accounts||!Array.isArray(x.transactions)||!Array.isArray(x.closings))throw Error();if(confirm('Impor backup akan mengganti data yang ada. Lanjutkan?')){db=x;save();render();alert('Backup berhasil dipulihkan.')}}catch(err){alert('File backup tidak valid.')}e.target.value=''});
document.getElementById('resetBtn').onclick=()=>{if(confirm('PERINGATAN: Hapus semua transaksi, saldo, dan arsip closing? Ekspor backup terlebih dahulu.'))if(confirm('Yakin menghapus seluruh data MBSTORE?')){db=fresh();save();render();alert('Data telah direset.')}};
const capitalForm=document.getElementById('capitalForm');
capitalForm.innerHTML=ACCOUNTS.map(a=>`<div class="field"><label>Modal awal ${a} (Rp)</label><input type="number" min="0" inputmode="numeric" id="cap_${ACCOUNTS.indexOf(a)}" value="${db.accounts[a]||0}"></div>`).join('')+'<button type="submit">Simpan modal awal</button>';
capitalForm.addEventListener('submit',e=>{e.preventDefault();ACCOUNTS.forEach((a,i)=>{let v=+document.getElementById('cap_'+i).value;if(v>=0){let d=v-(db.accounts[a]||0);db.accounts[a]=v;if(d!==0)db.transactions.push({id:Date.now()+i,date:todayKey(),type:d>0?'income':'expense',amount:Math.abs(d),note:'Penyesuaian modal awal '+a,account:a,adjustment:true})}});save();render();alert('Modal awal berhasil diperbarui.')});
let deferredPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.getElementById('installBtn').hidden=false});
document.getElementById('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}else alert('Gunakan menu browser lalu pilih Tambahkan ke layar utama.')};
if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();