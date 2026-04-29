import sys
import os


async def scan_folder(dir_path: str):
    """Scan a folder for images."""
    IMAGE_EXTENSIONS = {
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".bmp",
        ".webp",
        ".tiff",
        ".tif",
        ".svg",
        ".ico",
        ".heic",
        ".heif",
        ".avif",
    }

    image_count = 0
    total_size = 0

    try:
        for root, dirs, files in os.walk(dir_path):
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in IMAGE_EXTENSIONS:
                    image_count += 1
                    try:
                        total_size += os.path.getsize(os.path.join(root, file))
                    except Exception as e:
                        print(
                            f"[scan_folder] Could not get size of {file}: {e}",
                            file=sys.stderr,
                        )
    except Exception as e:
        print(f"[scan_folder] {e}", file=sys.stderr)

    return {"imageCount": image_count, "totalSize": total_size}
