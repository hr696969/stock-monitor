
const API_URL = window.API_URL || "";
const TICKERS = (window.TICKERS || "PLTR,NVDA,NEM").split(",");

document.getElementById("tickersLabel").textContent = TICKERS.join(", ");

const cardsEl = document.getElementById("cards");
const statusEl = document.getElementById("status");

let chart;
const seriesStore = {}; // { TICKER: { labels:[], data:[] } }

function createCard(ticker){
  const div = document.createElement("div");
  div.className = "card";
  div.id = `card-${ticker}`;
  div.innerHTML = `
    <h3>${ticker}</h3>
    <div class="kv"><span>Price</span><strong id="price-${ticker}">-</strong></div>
    <div class="kv"><span>MA(50)</span><span id="ma50-${ticker}">-</span></div>
    <div class="kv"><span>RSI(14)</span><span id="rsi-${ticker}">-</span></div>
    <div class="kv"><span>Signal</span><span id="signal-${ticker}" class="badge hold">Hold</span></div>
  `;
  cardsEl.appendChild(div);
}

function badgeClass(signal){
  const s = (signal || "Hold").toLowerCase();
  if (s === "buy") return "badge buy";
  if (s === "sell") return "badge sell";
  return "badge hold";
}

async function fetchData(){
  try{
    const res = await fetch(`${API_URL}/prices`);
    const json = await res.json();
    statusEl.textContent = `Last update: ${new Date().toLocaleTimeString()}`;

    TICKERS.forEach(ticker => {
      if (!document.getElementById(`card-${ticker}`)) createCard(ticker);

      const item = json[ticker] || {};
      const pEl = document.getElementById(`price-${ticker}`);
      const maEl = document.getElementById(`ma50-${ticker}`);
      const rsiEl = document.getElementById(`rsi-${ticker}`);
      const sigEl = document.getElementById(`signal-${ticker}`);

      if (item.error){
        pEl.textContent = "n/a";
        maEl.textContent = "n/a";
        rsiEl.textContent = "n/a";
        sigEl.textContent = "Error";
        sigEl.className = "badge hold";
        return;
      }

      pEl.textContent = item.price?.toFixed ? item.price.toFixed(2) : item.price;
      maEl.textContent = item.ma50?.toFixed ? item.ma50.toFixed(2) : item.ma50;
      rsiEl.textContent = item.rsi14?.toFixed ? item.rsi14.toFixed(1) : item.rsi14;
      sigEl.textContent = item.signal || "Hold";
      sigEl.className = badgeClass(item.signal);

      // Update chart store
      const now = new Date().toLocaleTimeString();
      if (!seriesStore[ticker]) seriesStore[ticker] = { labels: [], data: [] };
      const s = seriesStore[ticker];
      s.labels.push(now);
      s.data.push(item.price);
      if (s.labels.length > 60){ s.labels.shift(); s.data.shift(); }
    });

    renderChart();
  }catch(e){
    statusEl.textContent = "Error fetching data. Check API_URL in config.js";
    console.error(e);
  }
}

function renderChart(){
  const ctx = document.getElementById("priceChart").getContext("2d");
  const datasets = Object.keys(seriesStore).map((ticker, idx) => ({
    label: ticker,
    data: seriesStore[ticker].data,
    borderWidth: 2,
    fill: false,
    tension: 0.2,
  }));
  const labels = Object.values(seriesStore)[0]?.labels || [];

  if (chart){ chart.destroy(); }
  chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { x: { display: true }, y: { display: true } }
    }
  });
}

fetchData();
setInterval(fetchData, 5000);
