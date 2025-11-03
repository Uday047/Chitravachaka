#!/bin/bash
set -e

echo "🚀 Installing latest Tesseract (AI LSTM version) from source..."

# Install build tools and dependencies
apt-get update -y
apt-get install -y git cmake g++ pkg-config libtesseract-dev libleptonica-dev \
    libpng-dev libjpeg-dev libtiff-dev zlib1g-dev libwebp-dev \
    autoconf automake libtool libicu-dev python3-dev libpango1.0-dev libcairo2-dev

# Clone the official repo (latest stable branch)
cd /tmp
git clone --depth 1 https://github.com/tesseract-ocr/tesseract.git
cd tesseract

# Build and install
./autogen.sh
./configure
make -j$(nproc)
make install
ldconfig

# Verify installation
echo "✅ Tesseract installed successfully!"
tesseract --version
