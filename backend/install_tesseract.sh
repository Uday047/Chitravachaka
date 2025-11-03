#!/bin/bash
set -e

echo "📦 Installing latest Tesseract OCR (AI-based LSTM engine) for Debian/Railway..."

# Update package list
apt-get update -y

# Install dependencies
apt-get install -y lsb-release apt-utils gnupg wget

# Add Debian backports (for newer Tesseract builds)
echo "deb http://deb.debian.org/debian bookworm-backports main" >> /etc/apt/sources.list
apt-get update -y

# Install latest Tesseract + Kannada, Hindi, English traineddata
apt-get install -y -t bookworm-backports tesseract-ocr \
    tesseract-ocr-eng tesseract-ocr-hin tesseract-ocr-kan

# Verify installation
tesseract --version || { echo "❌ Tesseract failed to install"; exit 1; }

echo "✅ Tesseract (AI-LSTM) successfully installed!"
