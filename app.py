
from flask import Flask, jsonify
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import numpy as np
import os

app = Flask(__name__)
CORS(app)

# Configure tickers via environment variable or default list
TICKERS = os.getenv("TICKERS", "PLTR,NVDA,NEM").split(",")

def compute_rsi(series: pd.Series, period: int = 14) -> float:
    delta = series.diff()
    up = delta.clip(lower=0)
    down = -1 * delta.clip(upper=0)
    gain = up.ewm(alpha=1/period, adjust=False).mean()
    loss = down.ewm(alpha=1/period, adjust=False).mean()
    rs = gain / (loss + 1e-9)
    rsi = 100 - (100 / (1 + rs))
    return float(rsi.iloc[-1])

@app.route("/health")
def health():
    return {"status": "ok"}

@app.route("/prices")
def prices():
    data = {}
    for raw_ticker in TICKERS:
        ticker = raw_ticker.strip().upper()
        try:
            stock = yf.Ticker(ticker)
            # Use 5m interval for near-real-time during market hours
            hist = stock.history(period="2d", interval="5m")
            if hist.empty:
                data[ticker] = {"error": "no data"}
                continue

            last_price = float(hist["Close"].iloc[-1])
            ma50 = float(hist["Close"].rolling(window=50, min_periods=1).mean().iloc[-1])
            rsi14 = compute_rsi(hist["Close"], 14)

            # Simple signal logic (you can customize thresholds)
            signal = "Hold"
            reasons = []
            if last_price < 0.97 * ma50 and rsi14 < 35:
                signal = "Buy"
                reasons = ["Price below 50-period MA", "RSI oversold-ish"]
            elif last_price > 1.03 * ma50 and rsi14 > 65:
                signal = "Sell"
                reasons = ["Price above 50-period MA", "RSI overbought-ish"]

            data[ticker] = {
                "price": last_price,
                "ma50": ma50,
                "rsi14": rsi14,
                "signal": signal,
                "reasons": reasons,
            }
        except Exception as e:
            data[ticker] = {"error": str(e)}
    return jsonify(data)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
