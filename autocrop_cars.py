"""
Autocrop-Skript fuer Auto-Bilder in public/cars/
Entfernt transparente Raender, sichert Originale in _backup/

Verwendung:
  python autocrop_cars.py --demo       Nur M5 analysieren (kein Speichern)
  python autocrop_cars.py --only m5    Nur M5-Bilder croppen (mit Backup)
  python autocrop_cars.py              Alle Bilder croppen (mit Backup)
"""

import os
import sys
import glob
import shutil
from PIL import Image

CARS_DIR = r"C:\Users\anony\.claude\sessions\auto-ki-web\public\cars"
BACKUP_DIR = os.path.join(CARS_DIR, "_backup")

PADDING_RATIO = 0.04  # 4% Padding pro Seite nach dem Crop


def analyze_and_crop(fpath, save):
    img = Image.open(fpath).convert("RGBA")
    orig_size = img.size

    alpha = img.split()[3]
    binary = alpha.point(lambda p: 255 if p > 8 else 0)
    bbox = binary.getbbox()

    if bbox is None:
        return (os.path.basename(fpath), orig_size, orig_size)

    w, h = orig_size
    content_w = bbox[2] - bbox[0]
    content_h = bbox[3] - bbox[1]
    pad_x = max(4, int(content_w * PADDING_RATIO))
    pad_y = max(4, int(content_h * PADDING_RATIO))

    left   = max(0, bbox[0] - pad_x)
    top    = max(0, bbox[1] - pad_y)
    right  = min(w, bbox[2] + pad_x)
    bottom = min(h, bbox[3] + pad_y)

    cropped = img.crop((left, top, right, bottom))
    new_size = cropped.size

    if save and new_size != orig_size:
        fname = os.path.basename(fpath)
        os.makedirs(BACKUP_DIR, exist_ok=True)
        backup_path = os.path.join(BACKUP_DIR, fname)
        if not os.path.exists(backup_path):
            shutil.copy2(fpath, backup_path)
        cropped.save(fpath)

    return (os.path.basename(fpath), orig_size, new_size)


def main():
    demo_mode = "--demo" in sys.argv

    only_filter = None
    if "--only" in sys.argv:
        idx = sys.argv.index("--only")
        if idx + 1 < len(sys.argv):
            only_filter = sys.argv[idx + 1].lower()

    all_files = [
        f for f in glob.glob(os.path.join(CARS_DIR, "*.png"))
        if "_backup" not in f
    ]

    if demo_mode:
        files = [f for f in all_files if "m5" in os.path.basename(f).lower()]
        save = False
        print("=== DEMO: M5-Bilder (kein Speichern) ===\n")
    elif only_filter:
        files = [f for f in all_files if only_filter in os.path.basename(f).lower()]
        save = True
        print("=== Filter '%s': %d Bilder (Backup -> _backup/) ===\n" % (only_filter, len(files)))
    else:
        files = all_files
        save = True
        print("=== Alle %d Bilder croppen (Backup -> _backup/) ===\n" % len(files))

    changed = 0
    unchanged = 0

    for fpath in sorted(files):
        fname, orig, new = analyze_and_crop(fpath, save=save)
        if orig != new:
            reduction_w = 100 - int(new[0] / orig[0] * 100)
            reduction_h = 100 - int(new[1] / orig[1] * 100)
            print("  CROP  %s" % fname)
            print("        %dx%d  ->  %dx%d  (-%d%% B, -%d%% H)" % (
                orig[0], orig[1], new[0], new[1], reduction_w, reduction_h))
            changed += 1
        else:
            print("  OK    %s  (%dx%d, kein Rand)" % (fname, orig[0], orig[1]))
            unchanged += 1

    print("\nErgebnis: %d gecroppt, %d unveraendert" % (changed, unchanged))
    if save and changed > 0:
        print("Originale gesichert in: %s" % BACKUP_DIR)


if __name__ == "__main__":
    main()
