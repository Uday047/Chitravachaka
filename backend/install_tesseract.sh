#!/bin/bash
set -e

echo "📦 Installing latest Tesseract OCR (AI-based LSTM engine)..."

# Update and install base dependencies
apt-get update -y
apt-get install -y wget gnupg apt-utils lsb-release

# Add Debian bookworm-backports for latest Tesseract
echo "deb http://deb.debian.org/debian bookworm-backports main contrib non-free" >> /etc/apt/sources.list
apt-get update -y

# Install latest Tesseract and essential language data
apt-get install -y -t bookworm-backports \
    tesseract-ocr tesseract-ocr-eng tesseract-ocr-hin tesseract-ocr-kan

# Verify installation and version
echo "✅ Installed Tesseract version:"
tesseract --version || (echo "❌ Tesseract failed to install!" && exit 1)
which tesseract

# Set environment variables for FastAPI
export TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata
export PATH=$PATH:/usr/bin

echo "✅ Tesseract OCR (AI-based LSTM) setup complete!"
