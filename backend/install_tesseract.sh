#!/bin/bash
set -e
echo "📦 Installing Tesseract OCR (latest AI-based LSTM engine)..."

apt-get update
apt-get install -y software-properties-common
add-apt-repository ppa:alex-p/tesseract-ocr-devel -y
apt-get update
apt-get install -y tesseract-ocr libtesseract-dev

echo "✅ Tesseract installed successfully with LSTM support!"
tesseract --version
