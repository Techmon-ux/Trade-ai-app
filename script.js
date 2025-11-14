const API_KEY = "PH4FBPIIKEK45N3M"; // Your Alpha Vantage API key
const symbolInput = document.getElementById("symbol");
const signalEl = document.getElementById("signal");
const explanationEl = document.getElementById("explanation");
let chart;

// Fetch interval in milliseconds (1 minute)
const REFRESH_INTERVAL = 60 * 1000;

// Start auto-refresh when page loads
window.addEventListener("load", () => {
    const symbol = symbolInput.value || "BTC-USD";
    fetchAndUpdate(symbol);
    setInterval(() => fetchAndUpdate(symbol), REFRESH_INTERVAL);
});

async function fetchAndUpdate(symbol) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=60min&apikey=${API_KEY}&outputsize=compact`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const series = data[`Time Series (60min)`];

        if (!series) {
            alert("Error fetching data. Check symbol or API key.");
            return;
        }

        const labels = Object.keys(series).sort();
        const closes = labels.map(time => parseFloat(series[time]["4. close"]));

        const analysis = analyze(closes);
        signalEl.textContent = "Signal: " + analysis.signal;
        explanationEl.textContent = "Explanation: " + analysis.explanation;

        renderChart(labels, closes);
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

// Indicators & analysis functions
function analyze(prices) {
    const rsi = calculateRSI(prices, 14);
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);
    const macdData = calculateMACD(prices);
    const macd = macdData.macd;
    const macdSignal = macdData.signal;

    const latestRSI = rsi[rsi.length - 1];
    const latestMACD = macd[macd.length - 1];
    const latestMACDSignal = macdSignal[macdSignal.length - 1];

    let signal = "HOLD";
    if (latestRSI < 30 && latestMACD > latestMACDSignal) signal = "BUY";
    else if (latestRSI > 70 && latestMACD < latestMACDSignal) signal = "SELL";

    const explanation = `RSI: ${latestRSI.toFixed(2)}, SMA50: ${sma50[sma50.length-1].toFixed(2)}, SMA200: ${sma200[sma200.length-1].toFixed(2)}, MACD: ${latestMACD.toFixed(2)}`;
    return { signal, explanation };
}

// RSI
function calculateRSI(prices, period = 14) {
    let gains = [], losses = [], rsi = [];
    for (let i = 1; i < prices.length; i++) {
        let diff = prices[i] - prices[i-1];
        gains.push(Math.max(0, diff));
        losses.push(Math.max(0, -diff));
        if (i >= period) {
            let avgGain = average(gains.slice(i-period, i));
            let avgLoss = average(losses.slice(i-period, i));
            let rs = avgGain / (avgLoss || 1);
            rsi.push(100 - (100 / (1 + rs)));
        } else {
            rsi.push(50);
        }
    }
    return rsi;
}

// SMA
function calculateSMA(prices, period) {
    let sma = [];
    for (let i = 0; i < prices.length; i++) {
        if (i < period) sma.push(prices[i]);
        else sma.push(average(prices.slice(i-period, i)));
    }
    return sma;
}

// MACD
function calculateMACD(prices, fast=12, slow=26, signal=9) {
    const emaFast = calculateEMA(prices, fast);
    const emaSlow = calculateEMA(prices, slow);
    const macd = emaFast.map((v,i)=>v - emaSlow[i]);
    const signalLine = calculateEMA(macd.slice(slow-1), signal);
    return { macd: macd.slice(slow-1), signal: signalLine };
}

// EMA
function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = [average(prices.slice(0, period))];
    for (let i = period; i < prices.length; i++) {
        ema.push(prices[i]*k + ema[ema.length-1]*(1-k));
    }
    return ema;
}

// Average helper
function average(arr) { return arr.reduce((a,b)=>a+b,0)/arr.length; }

// Render chart
function renderChart(labels, data) {
    if (chart) chart.destroy();
    chart = new Chart(document.getElementById("chart").getContext("2d"), {
        type: 'line',
        data: { labels, datasets: [{ label: 'Close Price', data, borderColor: 'purple', fill: false }] },
        options: { responsive: true }
    });
}