# Use a full Debian image with Python
FROM python:3.11-slim

# Prevent prompts during apt install
ENV DEBIAN_FRONTEND=noninteractive

# Install AI-based Tesseract OCR + dependencies
RUN apt-get update && \
    apt-get install -y wget gnupg lsb-release apt-utils && \
    echo "deb http://deb.debian.org/debian bookworm-backports main contrib non-free" >> /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y -t bookworm-backports \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-hin \
        tesseract-ocr-kan && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set environment variables for Tesseract
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata
ENV PATH="/usr/bin:${PATH}"

# Copy and install your Python dependencies
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your project files
COPY . .

# Expose the Railway port
EXPOSE 8080

# Run the FastAPI app directly
CMD ["uvicorn", "backend.fastapi_backend:app", "--host", "0.0.0.0", "--port", "8080"]
