#!/bin/bash
set -e

echo "📦 Installing latest Tesseract OCR (AI-based LSTM engine)..."

apt-get update && apt-get install -y software-properties-common
add-apt-repository -y ppa:alex-p/tesseract-ocr-devel
apt-get update
apt-get install -y tesseract-ocr libtesseract-dev

echo "✅ Tesseract installation complete!"
tesseract --version
