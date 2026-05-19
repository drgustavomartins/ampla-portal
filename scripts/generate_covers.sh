#!/usr/bin/env bash
# Generates 800x1000 Ampla Facial cover PNGs in the v2026 style:
# - navy background (#0A0E1A) with subtle inner border (#1A2238)
# - gold (#D4A843) double frame with corner squares
# - decorative diamond at top
# - title in bold gold, subtitle in muted off-white, two horizontal gold rules bracketing title
# - "AMPLA FACIAL" footer in gold
#
# Usage:
#   ./generate_covers.sh <output_path> <title> <subtitle>

set -euo pipefail

OUT="$1"
TITLE="$2"
SUBTITLE="$3"

W=800
H=1000
BG="#0A0E1A"
INNER_BG="#0E1426"
GOLD="#D4A843"
OFFWHITE="#C9CDD6"

# Pick a font available on the system
FONT_BOLD="$(fc-match -f '%{file}' 'DejaVu-Sans-Bold' 2>/dev/null || echo '')"
FONT_REG="$(fc-match -f '%{file}' 'DejaVu-Sans' 2>/dev/null || echo '')"
[ -z "$FONT_BOLD" ] && FONT_BOLD="DejaVu-Sans-Bold"
[ -z "$FONT_REG" ] && FONT_REG="DejaVu-Sans"

# Dynamic title font size by length so it always fits the inner frame width (~520px usable)
LEN=${#TITLE}
if [ "$LEN" -le 6 ]; then
  TITLE_PT=110
elif [ "$LEN" -le 12 ]; then
  TITLE_PT=80
elif [ "$LEN" -le 18 ]; then
  TITLE_PT=58
elif [ "$LEN" -le 28 ]; then
  TITLE_PT=44
else
  TITLE_PT=34
fi

magick -size ${W}x${H} canvas:"$BG" \
  \( -size $((W-60))x$((H-60)) canvas:"$INNER_BG" \) -geometry +30+30 -composite \
  -fill none -stroke "$GOLD" -strokewidth 3 \
  -draw "rectangle 22,22 $((W-22)),$((H-22))" \
  -strokewidth 1 \
  -draw "rectangle 40,40 $((W-40)),$((H-40))" \
  -fill "$GOLD" -stroke none \
  -draw "rectangle 50,50 76,76" \
  -draw "rectangle $((W-76)),50 $((W-50)),76" \
  -draw "rectangle 50,$((H-76)) 76,$((H-50))" \
  -draw "rectangle $((W-76)),$((H-76)) $((W-50)),$((H-50))" \
  -fill "$INNER_BG" -stroke none \
  -draw "rectangle 53,53 73,73" \
  -draw "rectangle $((W-73)),53 $((W-53)),73" \
  -draw "rectangle 53,$((H-73)) 73,$((H-53))" \
  -draw "rectangle $((W-73)),$((H-73)) $((W-53)),$((H-53))" \
  -fill "$GOLD" -stroke none \
  -draw "polygon 400,80 420,110 400,140 380,110" \
  -stroke "$GOLD" -strokewidth 2 \
  -draw "line 90,210 710,210" \
  -draw "line 90,460 710,460" \
  -draw "line 90,700 710,700" \
  -fill "$GOLD" -stroke none \
  -font "$FONT_BOLD" -pointsize "$TITLE_PT" \
  -gravity north -annotate +0+380 "$TITLE" \
  -fill "$OFFWHITE" -font "$FONT_REG" -pointsize 28 \
  -gravity north -annotate +0+520 "$SUBTITLE" \
  -fill "$GOLD" -font "$FONT_BOLD" -pointsize 22 \
  -gravity south -annotate +0+60 "AMPLA FACIAL" \
  "$OUT"

echo "Wrote $OUT"
