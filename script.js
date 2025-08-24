    /* ====== LocalStorage Model ====== */
    const KEY = 'spendsense:v1';
    const state = {
      txns: JSON.parse(localStorage.getItem(KEY) || '[]')
    };
    function save(){ localStorage.setItem(KEY, JSON.stringify(state.txns)); }

    /* ====== Helpers ====== */
    const fmt = (n)=> '₹' + (Number(n||0)).toLocaleString('en-IN', {maximumFractionDigits:2});
    const todayISO = ()=> new Date().toISOString().slice(0,10);
    const thisMonthStr = ()=> new Date().toLocaleString('en-IN',{month:'long', year:'numeric'});

    const monthLabel = document.getElementById('monthLabel');
    monthLabel.textContent = thisMonthStr();

    // Set default date
    document.getElementById('date').value = todayISO();

    /* ====== Render Table ====== */
    function renderTable(){
      const wrap = document.getElementById('tableWrap');
      if(!state.txns.length){
        wrap.innerHTML = '<div class="empty">No expenses yet. Add some above or ask the chatbot: <span class="chip">add 120 food pizza</span></div>';
        updateStats();
        drawChart();
        document.getElementById('itemsCount').textContent = '0 items';
        return;
      }
      const rows = state.txns.map((t,i)=> `
        <tr data-i="${i}" tabindex="0">
          <td>${new Date(t.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</td>
          <td>${t.category}</td>
          <td>${t.note || '—'}</td>
          <td>${fmt(t.amount)}</td>
        </tr>
      `).join('');
      wrap.innerHTML = `
        <div style="overflow:auto">
          <table>
            <thead><tr><th>Date</th><th>Category</th><th>Notes</th><th>Amount</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
      document.getElementById('itemsCount').textContent = state.txns.length + ' items';

      // Row interactions: delete on Delete key, click to edit
      wrap.querySelectorAll('tbody tr').forEach(tr=>{
        tr.addEventListener('keydown', (e)=>{
          if(e.key==='Delete' || e.key==='Backspace'){
            const i = Number(tr.dataset.i);
            state.txns.splice(i,1); save(); renderAll();
          }
        });
        tr.addEventListener('click', ()=>{
          const i = Number(tr.dataset.i);
          const t = state.txns[i];
          // preload into form for editing
          document.getElementById('amount').value = t.amount;
          document.getElementById('category').value = t.category;
          document.getElementById('date').value = t.date.slice(0,10);
          document.getElementById('notes').value = t.note || '';
          // mark editing
          document.getElementById('expenseForm').dataset.editIndex = i;
          document.querySelector('#expenseForm button[type="submit"]').textContent = 'Update';
        });
      })
    }

    /* ====== Stats & Chart ====== */
    let chart;
    function updateStats(){
      const now = new Date();
      const thisMonth = now.getMonth(), thisYear = now.getFullYear();
      let sumMonth=0, sumToday=0, maxTxn=0;
      const cats = {};
      for(const t of state.txns){
        const d = new Date(t.date);
        if(d.getMonth()===thisMonth && d.getFullYear()===thisYear){
          sumMonth += t.amount;
          cats[t.category] = (cats[t.category]||0) + t.amount;
        }
        const sameDay = d.toDateString()===now.toDateString();
        if(sameDay) sumToday += t.amount;
        if(t.amount>maxTxn) maxTxn=t.amount;
      }
      document.getElementById('sumMonth').textContent = fmt(sumMonth);
      document.getElementById('sumToday').textContent = fmt(sumToday);
      document.getElementById('maxTxn').textContent = fmt(maxTxn);
      return cats;
    }

    function drawChart(){
      const cats = updateStats();
      const ctx = document.getElementById('catChart');
      const labels = Object.keys(cats);
      const data = Object.values(cats);
      if(chart) chart.destroy();
      chart = new Chart(ctx, {
        type:'bar',
        data:{labels,datasets:[{label:'This month',data}]},
        options:{
          scales:{
            x:{grid:{display:false},ticks:{color:'#9fb1c7'}},
            y:{grid:{color:'#1f2638'},ticks:{color:'#9fb1c7'}}
          },
          plugins:{legend:{labels:{color:'#c9d3e3'}}}
        }
      });
    }

    function renderAll(){ renderTable(); drawChart(); }

    /* ====== Form handlers ====== */
    document.getElementById('expenseForm').addEventListener('submit', (e)=>{
      e.preventDefault();
      const amount = Number(document.getElementById('amount').value);
      const category = document.getElementById('category').value;
      const date = document.getElementById('date').value;
      const note = document.getElementById('notes').value.trim();
      if(!amount || amount<=0) return alert('Enter a valid amount');
      const editIndex = e.currentTarget.dataset.editIndex;
      const txn = {amount, category, date, note};
      if(editIndex!==undefined){
        state.txns[Number(editIndex)] = txn;
        delete e.currentTarget.dataset.editIndex;
        e.currentTarget.querySelector('button[type="submit"]').textContent = 'Add';
      } else {
        state.txns.push(txn);
      }
      save();
      e.currentTarget.reset();
      document.getElementById('date').value = todayISO();
      renderAll();
    });

    document.getElementById('clearBtn').addEventListener('click', ()=>{
      if(confirm('Clear ALL transactions?')){
        state.txns = []; save(); renderAll();
      }
    });

    document.getElementById('demoBtn').addEventListener('click', ()=>{
      const sample = [
        {amount:199, category:'Food', date:todayISO(), note:'Pizza'},
        {amount:80, category:'Transport', date:todayISO(), note:'Bus pass'},
        {amount:1250, category:'Bills', date:new Date().toISOString().slice(0,10), note:'WiFi'},
        {amount:499, category:'Shopping', date:new Date(Date.now()-86400000*3).toISOString().slice(0,10), note:'T-shirt'},
      ];
      state.txns.push(...sample); save(); renderAll();
    });

    /* ====== Chatbot (Rule‑based) ====== */
    const chatFab = document.getElementById('chatFab');
    const chatPanel = document.getElementById('chatPanel');
    const chatBody = document.getElementById('chatBody');
    const chatInput = document.getElementById('chatInput');

    function pushMsg(text, who='bot'){
      const div = document.createElement('div');
      div.className = `msg ${who==='me'?'me':'bot'}`;
      div.textContent = text;
      chatBody.appendChild(div);
      chatBody.scrollTop = chatBody.scrollHeight;
    }

    function openChat(){ chatPanel.style.display='flex'; chatPanel.setAttribute('aria-hidden','false'); if(!chatBody.dataset.init){ greet(); chatBody.dataset.init=true } }
    function closeChat(){ chatPanel.style.display='none'; chatPanel.setAttribute('aria-hidden','true'); }

    chatFab.addEventListener('click', openChat);
    document.getElementById('closeChat').addEventListener('click', closeChat);

    const chips = document.getElementById('suggestChips');
    function setChips(list){
      chips.innerHTML='';
      list.forEach(t=>{
        const b=document.createElement('button'); b.className='chip'; b.type='button'; b.textContent=t; b.addEventListener('click',()=>{ chatInput.value=t; send() }); chips.appendChild(b);
      })
    }

    function greet(){
      pushMsg("Hey! I'm SpendBot. I can add, edit, and summarize. Try: 'add 250 food burger' or 'total this month' or 'spent on food'.");
      setChips(['add 120 food pizza','total this month','list last 5','spent on transport']);
    }

    function parseCommand(text){
      const t = text.toLowerCase().trim();
      // add 250 food burger
      let m = t.match(/(?:add|spent|spend)\s+(\d+(?:\.\d{1,2})?)\s+(food|transport|shopping|bills|entertainment|health|education|other)\s*(.*)?/i);
      if(m){
        const amount = Number(m[1]);
        const category = m[2][0].toUpperCase()+m[2].slice(1);
        const note = (m[3]||'').trim();
        const txn = {amount, category, date: todayISO(), note};
        state.txns.push(txn); save(); renderAll();
        return `Added ${fmt(amount)} in ${category}${note?` — ${note}`:''}.`;
      }

      // total this month / today
      if(/total\s+(this\s+month|month)/.test(t)){
        const cats = updateStats();
        const total = Object.values(cats).reduce((a,b)=>a+b,0);
        return `This month total: ${fmt(total)}.`;
      }
      if(/total\s+(today)/.test(t)){
        let sum=0; const now=new Date();
        for(const x of state.txns){ const d=new Date(x.date); if(d.toDateString()===now.toDateString()) sum+=x.amount; }
        return `Today total: ${fmt(sum)}.`;
      }

      // spent on <category>
      m = t.match(/spent\s+on\s+(food|transport|shopping|bills|entertainment|health|education|other)/);
      if(m){
        const cat = m[1][0].toUpperCase()+m[1].slice(1);
        let sum=0; const now=new Date(); const M=now.getMonth(),Y=now.getFullYear();
        for(const x of state.txns){ const d=new Date(x.date); if(d.getMonth()===M && d.getFullYear()===Y && x.category===cat) sum+=x.amount; }
        return `This month in ${cat}: ${fmt(sum)}.`;
      }

      // list last n
      m = t.match(/list\s+last\s+(\d+)/);
      if(m){
        const n = Math.min(Number(m[1]), 10);
        if(!state.txns.length) return 'No transactions yet.';
        const items = state.txns.slice(-n).map(x=> `${new Date(x.date).toLocaleDateString('en-IN',{month:'short',day:'2-digit'})} · ${x.category} · ${fmt(x.amount)}${x.note?` · ${x.note}`:''}`).join('\n');
        return `Last ${n}:\n${items}`;
      }

      if(/clear\s+all/.test(t)){
        state.txns=[]; save(); renderAll();
        return 'Cleared all transactions.';
      }

      return "I didn't get that. Try: 'add 120 food pizza', 'total this month', 'spent on food', 'list last 5'.";
    }

    function send(){
      const text = chatInput.value.trim(); if(!text) return; pushMsg(text,'me'); chatInput.value='';
      const reply = parseCommand(text);
      // support multi-line replies
      reply.split('\n').forEach(line=> pushMsg(line,'bot'));
    }
    document.getElementById('sendBtn').addEventListener('click', send);
    chatInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') send(); });

    // Initial render
    renderAll();