let chart;

document.getElementById('fetchBtn').addEventListener('click', () => {
    const symbol = document.getElementById('symbol').value.toLowerCase();
    fetchData(symbol);
});

// Fetch crypto price history from CoinGecko
async function fetchData(symbol) {
    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=30&interval=hourly`);
        const data = await res.json();
        const prices = data.prices.map(p => ({time: new Date(p[0]), price: p[1]}));

        const closePrices = prices.map(p => p.price);
        const labels = prices.map(p => `${p.time.getMonth()+1}/${p.time.getDate()} ${p.time.getHours()}:00`);

        // Calculate indicators
        const sma50 = calculateSMA(closePrices, 50);
        const sma200 = calculateSMA(closePrices, 200);
        const rsi = calculateRSI(closePrices, 14);

        const latestRSI = rsi[rsi.length - 1];
        const latestClose = closePrices[closePrices.length - 1];
        const latestSMA50 = sma50[sma50.length - 1];
        const latestSMA200 = sma200[sma200.length - 1];

        // Determine signal
        let signal = 'HOLD';
        if(latestRSI < 30 && latestClose > latestSMA50) signal = 'BUY';
        else if(latestRSI > 70 && latestClose < latestSMA50) signal = 'SELL';

        document.getElementById('signal').textContent = `Signal: ${signal}`;
        document.getElementById('explanation').textContent =
            `RSI: ${latestRSI.toFixed(2)}, SMA50: ${latestSMA50.toFixed(2)}, SMA200: ${latestSMA200.toFixed(2)}, Latest Price: ${latestClose.toFixed(2)}`;

        renderChart(labels, closePrices, sma50, sma200);
    } catch (err) {
        console.error(err);
        alert('Error fetching data. Make sure symbol is correct (e.g., bitcoin, ethereum).');
    }
}

// SMA
function calculateSMA(prices, period) {
    const sma = [];
    for(let i=0; i<prices.length; i++){
        if(i < period) sma.push(prices[i]);
        else {
            const sum = prices.slice(i-period, i).reduce((a,b)=>a+b,0);
            sma.push(sum/period);
        }
    }
    return sma;
}

// RSI
function calculateRSI(prices, period = 14){
    const gains = [], losses = [], rsi = [];
    for(let i=1;i<prices.length;i++){
        const diff = prices[i] - prices[i-1];
        gains.push(Math.max(0,diff));
        losses.push(Math.max(0,-diff));
        if(i >= period){
            const avgGain = gains.slice(i-period,i).reduce((a,b)=>a+b,0)/period;
            const avgLoss = losses.slice(i-period,i).reduce((a,b)=>a+b,0)/period;
            const rs = avgGain/(avgLoss||1);
            rsi.push(100 - 100/(1+rs));
        } else rsi.push(50);
    }
    return rsi;
}

// Render Chart
function renderChart(labels, closePrices, sma50, sma200){
    if(chart) chart.destroy();
    chart = new Chart(document.getElementById('chart').getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Close', data: closePrices, borderColor: 'purple', fill: false },
                { label: 'SMA50', data: sma50, borderColor: 'blue', fill: false },
                { label: 'SMA200', data: sma200, borderColor: 'green', fill: false }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: true } },
            scales: { x: { display: true }, y: { display: true } }
        }
    });
}