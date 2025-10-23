import argparse
from extract_module import extract_text  # ✅ updated import
from text_to_speech import text_to_speech
import time
import os
import sys
import subprocess

def play_audio(filename: str):
    """Plays the audio file using the default system player."""
    try:
        if sys.platform == "win32":
            os.startfile(filename)
        elif sys.platform == "darwin":
            subprocess.run(["open", filename], check=True)
        else:
            subprocess.run(["xdg-open", filename], check=True)
    except Exception as e:
        print(f"⚠️ Could not auto-play. Please open '{filename}' manually. Error: {e}")

def main():
    parser = argparse.ArgumentParser(description="Extract Kannada text from an image and convert it to speech.")
    parser.add_argument("image_path", nargs="?", default="image.png", help="Path to the input image file (default: image.png)")
    parser.add_argument("--output", "-o", help="Path to save the output MP3 file.")
    args = parser.parse_args()

    try:
        # Step 1: Extract text from the image
        text = extract_text(args.image_path)
        print("------------------------------")
        print(text)
        print("------------------------------")

        # Step 2: Generate and save speech
        output_file = args.output or f"kannada_speech_{int(time.time())}.mp3"
        print(f"[TTS] Generating speech...")
        audio_bytes = text_to_speech(text=text, lang='kn', filename=output_file)
        print(f"[SUCCESS] ✅ Audio saved to '{output_file}'")
        play_audio(output_file)

    except (FileNotFoundError, ValueError, ConnectionError, OSError) as e:
        print(f"[ERROR] ❌ {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
