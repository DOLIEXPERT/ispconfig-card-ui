#!/bin/bash
# =============================================================================
# DOLIEXPERT — branche l'habillage "cartes" (doliexpert.css / doliexpert.js)
# sur le design classic de ispconfig-theme-customizer, puis réinstalle classic.
#
# Usage (en root sur le serveur du panel), avec les 3 fichiers dans le même dossier :
#   bash install-doliexpert-ui.sh            # installe / met à jour
#   bash install-doliexpert-ui.sh --remove   # retire l'habillage
#
# Idempotent : on peut le relancer autant de fois que nécessaire (après une
# mise à jour d'ISPConfig, après avoir modifié le CSS, etc.).
# Ne touche à aucun fichier du cœur d'ISPConfig : seulement au clone
# /opt/ispconfig-theme-customizer, puis install.sh recopie le design.
# =============================================================================
set -euo pipefail

CLONE="${CLONE:-/opt/ispconfig-theme-customizer}"
SRC="$(cd "$(dirname "$0")" && pwd)"
CLASSIC="$CLONE/themes/classic"
DEST="$CLASSIC/doliexpert"
MODE="${1:-install}"

[ "$(id -u)" = "0" ] || { echo "ERREUR : à lancer en root (sudo -i)." >&2; exit 1; }
[ -f "$CLASSIC/brand.php" ] && [ -f "$CLASSIC/title.php" ] || { echo "ERREUR : clone introuvable dans $CLONE" >&2; exit 1; }
command -v php >/dev/null || { echo "ERREUR : php CLI introuvable." >&2; exit 1; }

# ---------------------------------------------------------------- retrait ----
if [ "$MODE" = "--remove" ]; then
  php -r '
    foreach (array($argv[1]."/brand.php", $argv[1]."/title.php") as $f) {
      $s = file_get_contents($f);
      $n = preg_replace("~\n?/\* DOLIEXPERT-HOOK-BEGIN \*/.*?/\* DOLIEXPERT-HOOK-END \*/\n?~s", "\n", $s);
      $n = preg_replace("~ ?/\* DOLIEXPERT-INLINE-BEGIN \*/.*?/\* DOLIEXPERT-INLINE-END \*/~s", "", $n);
      if (basename($f) === "title.php") { $n = rtrim($n) . "\n"; }
      if ($n !== $s) { file_put_contents($f, $n); echo "  crochet retiré de ".basename($f)."\n"; }
    }' "$CLASSIC"
  rm -rf "$DEST"
  echo "  dossier doliexpert/ supprimé du clone"
  cd "$CLONE" && ./install.sh --copy --design=classic --theme >/dev/null
  echo "OK — habillage retiré, classic réinstallé."
  exit 0
fi

# ------------------------------------------------------------- installation --
for f in doliexpert.css doliexpert.js; do
  [ -s "$SRC/$f" ] || { echo "ERREUR : $SRC/$f manquant ou vide." >&2; exit 1; }
done
mkdir -p "$DEST"
install -m 644 "$SRC/doliexpert.css" "$SRC/doliexpert.js" "$DEST/"
echo "  fichiers copiés dans $DEST"

# Crochets idempotents (balisés), injectés par PHP pour éviter tout souci
# d'échappement shell. Avant de patcher, on retire une éventuelle version
# précédente, puis on vérifie que les points d'ancrage existent.
php -r '
  $dir = $argv[1];

  /* ---- brand.php : @import du CSS + couleur d accent + cache ---- */
  $f = "$dir/brand.php";
  $s = file_get_contents($f);
  $s = preg_replace("~\n?/\* DOLIEXPERT-HOOK-BEGIN \*/.*?/\* DOLIEXPERT-HOOK-END \*/\n?~s", "\n", $s);
  $s = preg_replace("~ ?/\* DOLIEXPERT-INLINE-BEGIN \*/.*?/\* DOLIEXPERT-INLINE-END \*/~s", "", $s);

  // 1) le validateur de cache (ETag) tient compte de la date du CSS
  $etag_old = "\$company_name) . \x27\"\x27;";
  if (substr_count($s, $etag_old) !== 1) { fwrite(STDERR, "ERREUR : ancre ETag introuvable dans brand.php\n"); exit(1); }
  $s = str_replace($etag_old,
    "\$company_name /* DOLIEXPERT-INLINE-BEGIN */ . \x27|dx\x27 . @filemtime(__DIR__ . \x27/doliexpert/doliexpert.css\x27) /* DOLIEXPERT-INLINE-END */) . \x27\"\x27;",
    $s);

  // 2) juste avant l envoi : @import en tête de feuille + variable d accent
  if (substr_count($s, "\necho \$css;\n") !== 1) { fwrite(STDERR, "ERREUR : ancre echo \$css introuvable dans brand.php\n"); exit(1); }
  $hook = "\n/* DOLIEXPERT-HOOK-BEGIN */\n"
        . "if (\$scene !== \x27login\x27 && is_file(__DIR__ . \x27/doliexpert/doliexpert.css\x27)) {\n"
        . "    \$dx_head = \x27@import url(\"doliexpert/doliexpert.css?v=\x27 . filemtime(__DIR__ . \x27/doliexpert/doliexpert.css\x27) . \x27\");\x27 . \"\\n\";\n"
        . "    if (isset(\$accent) && is_string(\$accent) && preg_match(\x27/^#[0-9A-Fa-f]{6}\$/D\x27, \$accent)) {\n"
        . "        \$dx_head .= \x27:root{--dx-accent:\x27 . \$accent . \x27;}\x27 . \"\\n\";\n"
        . "    }\n"
        . "    \$css = \$dx_head . \$css;\n"
        . "}\n"
        . "/* DOLIEXPERT-HOOK-END */\n";
  $s = str_replace("\necho \$css;\n", $hook . "echo \$css;\n", $s);
  file_put_contents($f, $s);
  echo "  crochet posé dans brand.php\n";

  /* ---- title.php : chargement du JS (même dossier que title.php) ---- */
  $f = "$dir/title.php";
  $s = file_get_contents($f);
  $s = preg_replace("~\n?/\* DOLIEXPERT-HOOK-BEGIN \*/.*?/\* DOLIEXPERT-HOOK-END \*/\n?~s", "\n", $s);
  $s = rtrim($s);
  if (substr($s, -2) === "?>") { $s = substr($s, 0, -2); }
  $s .= "\n\n/* DOLIEXPERT-HOOK-BEGIN */\n"
      . "if (is_file(__DIR__ . \x27/doliexpert/doliexpert.js\x27)) {\n"
      . "    echo \"\\n(function(){var c=document.currentScript;if(!c)return;\"\n"
      . "       . \"var s=document.createElement(\x27script\x27);s.defer=true;\"\n"
      . "       . \"s.src=c.src.replace(/title\\\\.php.*\$/,\x27doliexpert/doliexpert.js?v=\" . filemtime(__DIR__ . \x27/doliexpert/doliexpert.js\x27) . \"\x27);\"\n"
      . "       . \"document.head.appendChild(s);})();\";\n"
      . "}\n"
      . "/* DOLIEXPERT-HOOK-END */\n";
  file_put_contents($f, $s);
  echo "  crochet posé dans title.php\n";
' "$CLASSIC"

php -l "$CLASSIC/brand.php" >/dev/null && php -l "$CLASSIC/title.php" >/dev/null \
  || { echo "ERREUR : erreur de syntaxe PHP après patch — rien n'a été déployé." >&2; exit 1; }
echo "  syntaxe PHP vérifiée"

cd "$CLONE"
./install.sh --copy --design=classic --theme >/dev/null
echo "  classic réinstallé dans ISPConfig"

TARGET=/usr/local/ispconfig/interface/web/themes/classic
[ -f "$TARGET/doliexpert/doliexpert.css" ] && grep -q "DOLIEXPERT-HOOK" "$TARGET/brand.php" \
  && echo "OK — habillage DOLIEXPERT en place. Rechargez le panel (Cmd+Shift+R)." \
  || { echo "ERREUR : le déploiement ne contient pas l'habillage." >&2; exit 1; }
