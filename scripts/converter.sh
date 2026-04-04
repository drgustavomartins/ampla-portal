#!/bin/bash
# ============================================================
#  Conversor MP3 → Vídeo (YouTube) — Ampla Facial
#  Gera vídeos MP4 com capa estática para upload no YouTube
# ============================================================
#
#  PRÉ-REQUISITOS:
#    brew install ffmpeg    (se não tiver instalado)
#
#  COMO USAR:
#    1. Coloque este script na mesma pasta onde estão as subpastas
#       dos materiais (onde estão os MP3s)
#    2. Execute: chmod +x converter_mp3_para_video.sh
#    3. Execute: ./converter_mp3_para_video.sh
#
#  O script vai:
#    - Baixar os MP3s do Google Drive
#    - Baixar as capas do portal
#    - Converter cada MP3 em vídeo MP4 com a capa do tema
#    - Organizar os vídeos em pastas por tema
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORK_DIR="$SCRIPT_DIR/youtube_videos"
COVERS_DIR="$WORK_DIR/covers"
MP3_DIR="$WORK_DIR/mp3s"

mkdir -p "$COVERS_DIR" "$MP3_DIR"

echo "============================================"
echo "  Conversor MP3 → Vídeo — Ampla Facial"
echo "============================================"
echo ""

# Check ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg não encontrado. Instale com: brew install ffmpeg"
    exit 1
fi
echo "✅ ffmpeg encontrado"
echo ""

# ──────────────────────────────────────────────
# STEP 1: Download covers
# ──────────────────────────────────────────────
echo "📸 Baixando capas do portal..."
COVERS=(
    "cover_toxina_botulinica.png"
    "cover_preenchedores_faciais.png"
    "cover_bioestimuladores.png"
    "cover_moduladores_matriz.png"
    "cover_metodo_naturalup.png"
    "cover_ia_medicina.png"
)

for cover in "${COVERS[@]}"; do
    jpg="${cover%.png}.jpg"
    if [ ! -f "$COVERS_DIR/$jpg" ]; then
        echo "  ↓ $cover"
        curl -sL "https://portal.amplafacial.com.br/images/covers/$cover" -o "$COVERS_DIR/$cover"
        # Convert to 1920x1080 JPEG for YouTube
        ffmpeg -y -i "$COVERS_DIR/$cover" \
            -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black" \
            -q:v 3 "$COVERS_DIR/$jpg" 2>/dev/null
        rm -f "$COVERS_DIR/$cover"
    fi
done
echo "✅ Capas prontas"
echo ""

# ──────────────────────────────────────────────
# STEP 2: Define all MP3s
# Format: "DRIVE_ID|SAFE_NAME|COVER_JPG|THEME|ORIGINAL_NAME"
# ──────────────────────────────────────────────
MP3_ENTRIES=(
    "1g7S0Z3zAyyzWHGTXQ4vg7rndu-3q7m_6|Resumo_em_áudio_Toxina_Botulínica|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Toxina Botulínica"
    "12r-XaTfIQFvGb9qVfj5ZxOd7R0jKP-hG|Resumo_em_áudio_Apostila_Outros_Mecanismos|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Apostila Outros Mecanismos"
    "1vR1jdITazZ96tIlI80zc1--XYVTKdZTM|Resumo_em_áudio_Complications_of_Botulinum_Toxin|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Complications of Botulinum Toxin"
    "1FlhbkgEUL2dzPLLFmkzRa07V3MJHb1Qn|Resumo_em_áudio_Anatomia_do_Músculo_Frontal|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Anatomia do Músculo Frontal"
    "1QMB0OB_nkfZkMVzPds8LrAl8fmR7_zc8|Resumo_em_áudio_Mitos_e_Realidades_da_Toxina|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Mitos e Realidades da Toxina"
    "1r6IVELgrPaiDnpcNkdqK0DcQF9XdZGaF|Resumo_em_áudio_Síndrome_de_Dor_Miofascial|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Síndrome de Dor Miofascial"
    "177-wutULh_ETvNpYWoNbflBdJXzlGVB1|Resumo_em_áudio_Rugas_Faciais|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Rugas Faciais"
    "1YEC4l1Ax5nWGPeEW8sZ1njTyKC2U-yEa|Resumo_em_áudio_Fenômeno_Wear-off_na_Enxaqueca|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Fenômeno Wear-off na Enxaqueca"
    "1jsTRqm3jookYCYIubho5qjvpJp6hYQdl|Resumo_em_áudio_Funcionalidade_e_Sincinesias|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Funcionalidade e Sincinesias"
    "1c6yK8Jd9l3EKAB2cgUUWP5AgqHshbR86|Resumo_em_áudio_Padrões_de_Contração_Frontal|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Padrões de Contração Frontal"
    "1x1UUbcGokM0cCjnierDDapZxZrB9-8YA|Resumo_em_áudio_Duração_do_Efeito_da_Toxina|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Duração do Efeito da Toxina"
    "1uz5QeKt8Z-LjygMteDzC2cG7vDC3rfiO|Resumo_em_áudio_Consenso_Global_Revisão_Baseada_em_Evidências|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Consenso Global — Revisão Baseada em Evidências"
    "14O4a6A7NSf2i9TbYl7I4bfZrhUHMKwR3|Resumo_em_áudio_Consenso_Global_Preenchedores_e_Toxina|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Consenso Global — Preenchedores e Toxina"
    "1EAG2RthnnDbOtPDxJKj5-aGlCKgKWY_6|Resumo_em_áudio_Hipertrofia_Maseterina|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Hipertrofia Maseterina"
    "111tRaoKn8WgSJNusKjBO8uWiCRK6GMGv|Resumo_em_áudio_Sorriso_Gengival|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Sorriso Gengival"
    "1dWOdR5_UaShYGMqAA7iTk4MsJ_Lx8Fzr|Resumo_em_áudio_História_da_Toxina_no_Brasil|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: História da Toxina no Brasil"
    "1v4YuxFQCqGxbswwic9nJkypkx7eqZrvL|Resumo_em_áudio_Tolerância_Imune_à_Toxina|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Tolerância Imune à Toxina"
    "1sCSBnl7xGxAH2XsdWJ_tQ3AbBbCBm6r6|Resumo_em_áudio_DTM_Desórdenes_Temporomandibulares|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: DTM — Desórdenes Temporomandibulares"
    "1FfD28IjJmDF3Z-HZByzokt8gxSQpHEOd|Resumo_em_áudio_Tipos_de_Sorriso_Gengival|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Tipos de Sorriso Gengival"
    "1AAcwKyTHRjiNlcuh-77mC-f480SC5IiC|Resumo_em_áudio_Toxina_em_DTM|cover_toxina_botulinica.jpg|Toxina_Botulínica|Resumo em áudio: Toxina em DTM"
    "1uyp0eELLiihZV60eziV9pb6qPNn656ox|Resumo_em_áudio_CPM_e_Belotero|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: CPM e Belotero"
    "1WSODDQ-qTd-g2Fsk5bVDGtQuNTKwlX6X|Resumo_em_áudio_Crosslinkers|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Crosslinkers"
    "153fH77VoiUQI50AMQTc5W2JprQ2L2JKQ|Resumo_em_áudio_Processo_de_Fabricação|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Processo de Fabricação"
    "1BcIUfUoC7Lr-0pvrq6zx4gmoee9Z6T8u|Resumo_em_áudio_Reologia_e_Propriedades_Físicas|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Reologia e Propriedades Físicas"
    "1iGTPVrNWFFVsM0o7A8Y5pjDMRU8cT2qY|Resumo_em_áudio_Degradação_e_Longevidade|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Degradação e Longevidade"
    "1Hfmi1tdieyYKUbCZ_RckVtKjOaYs4ewr|Resumo_em_áudio_Segurança_e_Complicações|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Segurança e Complicações"
    "12WpA-n0ROmTN63rbNlp1ObzMJORWFsnx|Resumo_em_áudio_Revisões_Gerais_e_Perspectivas|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Revisões Gerais e Perspectivas"
    "16q358Nkk7HhAvrs_3VXIis2oOL0bivHH|Resumo_em_áudio_CPM-HA_Eventos_Adversos_NLF_Sattler|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: CPM-HA Eventos Adversos NLF (Sattler)"
    "1IKI1TK0QPShBQK1LW88FBfpY4fPtV2Pw|Resumo_em_áudio_CPM-HA20G_Revitalização_Cutânea_Gauglitz|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: CPM-HA20G Revitalização Cutânea (Gauglitz)"
    "1-bnM9VLM7c7iaAYLWm2be11UdbwXHUZS|Resumo_em_áudio_CPM_Revisão_Literatura_Nikolis|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: CPM Revisão Literatura (Nikolis)"
    "1SWOa-ia4r-j2ZXerV3coP6hzKbMujWxE|Resumo_em_áudio_CPM-HA20G_Intervenção_Precoce_Hanschmann|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: CPM-HA20G Intervenção Precoce (Hanschmann)"
    "1560RP4W_gs60WcvZa0k-o4stfvLUjk3C|Resumo_em_áudio_CPM_Volume_Mundo_Real_Vandeputte|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: CPM Volume Mundo Real (Vandeputte)"
    "1eCz7_T17blOYO0whf6psjeLWJCjkrPn7|Resumo_em_áudio_Crosslinking_HA_Modalidades_Chen|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Crosslinking HA Modalidades (Chen)"
    "1UJGN4CXsSiZbMq3NBeGo0fd13_jxLD3l|Resumo_em_áudio_BDDE_Riscos_Scoping_Review_Wojtkiewicz|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: BDDE Riscos Scoping Review (Wojtkiewicz)"
    "1mW4aFQQHIT890kSC2ZzGJgPvswi3f9_a|Resumo_em_áudio_DVS_vs_BDDE_InVivo_Hinsenkamp|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: DVS vs BDDE InVivo (Hinsenkamp)"
    "1klqBCb1kjXx7_2ehEzuaFL770A5Qi-_V|Resumo_em_áudio_DVS_BDDE_PEG_Nanogéis_Vilas-Vilela|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: DVS BDDE PEG Nanogéis (Vilas-Vilela)"
    "1NIRVTgudtAwlVJlzI04kgmPYc2FUeQmS|Resumo_em_áudio_PEG_Crosslinked_HA_Zerbinati|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: PEG Crosslinked HA (Zerbinati)"
    "1U5tqmy9QFPVQC92tvYP6DVYnCsUFZ3cw|Resumo_em_áudio_BDDE_Metabolismo_Review_Tezel|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: BDDE Metabolismo Review (Tezel)"
    "1o6kVgvWldJWtC-RK_sc-EjP8SvdVQGeR|Resumo_em_áudio_Crosslinker_Comprimento_Densidade_Luu|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Crosslinker Comprimento Densidade (Luu)"
    "1jJBnFylfW4K0DbjqHuD_gyJ4WhQ2l3oe|Resumo_em_áudio_Processo_Fabricação_HA_Fillers_Hong|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Processo Fabricação HA Fillers (Hong)"
    "1cRyjqbEnEcmfGE7QgP1pcma40IlPGxKi|Resumo_em_áudio_HA_CMC_Hidrogel_Compósito_Borzacchiello|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: HA CMC Hidrogel Compósito (Borzacchiello)"
    "1eDfy7PhNiUcDtwo8014DPxHEDCWhk0xb|Resumo_em_áudio_Crosslinker_Residual_GC_Rashid|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Crosslinker Residual GC (Rashid)"
    "1rXqtC57tPRwzz5yBYO390xPMN3E-ZAT0|Resumo_em_áudio_Dispersão_BDDE_Qualidade_Cho|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Dispersão BDDE Qualidade (Cho)"
    "1_OEb0MJZQrCpwYFt6V60N7T18FmKqsce|Resumo_em_áudio_RMN_Análise_Estrutural_HA_Yang_Lee|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: RMN Análise Estrutural HA (Yang & Lee)"
    "1XBt2h8KLZBQWe-rR39GaxQxPSapmAhoS|Resumo_em_áudio_Reologia_Fillers_Futuro_Soares|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Reologia Fillers Futuro (Soares)"
    "197GVmtyRJ7K65bmEeNN1IBMx4rVOEVRT|Resumo_em_áudio_Injetabilidade_28_Fillers_Micheels|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Injetabilidade 28 Fillers (Micheels)"
    "1TIT1yZIL9JTjAFp9977wRSx9NGwQJ31M|Resumo_em_áudio_Reológica_Físico-Química_HA_Bernardin|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Reológica Físico-Química HA (Bernardin)"
    "1ZLencT_GV3QphL57W3mH7St3ZiaOM0T_|Resumo_em_áudio_Reologia_Implicações_Clínicas_Malgapo|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Reologia Implicações Clínicas (Malgapo)"
    "1UE_ohaQJ53KFLcKY4RaEIx58u2vk7bp5|Resumo_em_áudio_BDDE_Análise_Físico-Química_Zerbinati|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: BDDE Análise Físico-Química (Zerbinati)"
    "1OOkt_djy-AiYERpax0zi-B_hmcINi5_m|Resumo_em_áudio_Condições_Escolha_Fillers_Hong|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Condições Escolha Fillers (Hong)"
    "1z1-s_5SIra6--XK-ug8P2dHes8cTpK8B|Resumo_em_áudio_Decomposição_InVivo_Pós-HA_Hong|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Decomposição InVivo Pós-HA (Hong)"
    "1NC63MnOIIjuWeyU_wXDdJiwGFCfTlwIl|Resumo_em_áudio_Hialuronidase_Cinética_Degradação_Gallagher|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Hialuronidase Cinética Degradação (Gallagher)"
    "1lZ8uXRQc8pghVM7WKdn3Q0oX4APXA7uU|Resumo_em_áudio_Degradação_Espontânea_Fillers_Wollina|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Degradação Espontânea Fillers (Wollina)"
    "1VgrHQ37p9_UhCCkGjaf-lJjVyXbsHLG3|Resumo_em_áudio_21_Fillers_Hialuronidase_Foster|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: 21 Fillers Hialuronidase (Foster)"
    "1QxR1fLxPBJBoWi0gLduVJ16A-6kfbqAv|Resumo_em_áudio_Hialuronidase_Medicina_Estética_Arrigoni|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Hialuronidase Medicina Estética (Arrigoni)"
    "1gF5SaNEmlR1oIXFd52y_9TfBceZ4z6Ec|Resumo_em_áudio_Oclusão_Vascular_MetaAnálise_Chakhachiro|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Oclusão Vascular MetaAnálise (Chakhachiro)"
    "1JY5IVayS6fBMJNRHx_TmoSeITcWeZy3k|Resumo_em_áudio_Reações_Tardias_HA_Fillers_Baranska|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Reações Tardias HA Fillers (Baranska)"
    "18U4-83E1BgeNnuB_LRRR2GE6gH7DQDTd|Resumo_em_áudio_FIVO_Patofisiologia_Soares|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: FIVO Patofisiologia (Soares)"
    "1euRk9If4xnJO77TAQUriX58I1QF_psfU|Resumo_em_áudio_Consenso_Global_Complicações_De_Boulle|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Consenso Global Complicações (De Boulle)"
    "1yMYWS_0zw_mkmoS3HYd_9iUG8Ck221RO|Resumo_em_áudio_10_Pontos_Complicações_Swift|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: 10 Pontos Complicações (Swift)"
    "11xMXNUl465mDIFBW5OnCsQ3bp9hbKWlB|Resumo_em_áudio_Visão_Geral_Soft_Tissue_Fillers_Schiraldi|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Visão Geral Soft Tissue Fillers (Schiraldi)"
    "1LQ9jPoddH2yiPqzcueeKrN8PHxjyJ0bc|Resumo_em_áudio_Parâmetros_Crosslinking_Guarise|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Parâmetros Crosslinking (Guarise)"
    "1YYn-NnSI58bxp7ilq-d3XFkNo8cX8WLi|Resumo_em_áudio_Melhores_Resultados_Rejuvenescimento_Akinbiyi|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Melhores Resultados Rejuvenescimento (Akinbiyi)"
    "1rjHOfusuW3PzSxZTvQkuNt-YcSDOe3sN|Resumo_em_áudio_Hidrogel_Estrutura_InVivo_Peng|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Resumo em áudio: Hidrogel Estrutura InVivo (Peng)"
    "1kHqq2DvI8g2Olz33JHt91-aBL4kK_Ev6|Resumo_em_áudio_Anti-inflamatórios_x_Bioestimuladores|cover_bioestimuladores.jpg|Bioestimuladores_de_Colágeno|Resumo em áudio: Anti-inflamatórios x Bioestimuladores"
    "1JASqeIBL2y0KnsZQPCKo6nHfnmj-nl0-|Resumo_em_áudio_Radiesse_Plus_Bioestimulação_e_Mecanotransdução|cover_bioestimuladores.jpg|Bioestimuladores_de_Colágeno|Resumo em áudio: Radiesse Plus — Bioestimulação e Mecanotransdução"
    "1JASqeIBL2y0KnsZQPCKo6nHfnmj-nl0-|Resumo_em_áudio_Mecanismos_de_Neocolagênese|cover_bioestimuladores.jpg|Bioestimuladores_de_Colágeno|Resumo em áudio: Mecanismos de Neocolagênese"
    "1ZeeeKTVPWMwv1j9jyANFyPqcEyElac4H|Resumo_em_áudio_Full_Face|cover_metodo_naturalup.jpg|Método_NaturalUp|Resumo em áudio: Full Face"
    "1S5zoXRX2CWhsja_uTAkhIx_LApAAknpK|Resumo_em_áudio_IA_na_Medicina|cover_ia_medicina.jpg|IA_na_Medicina|Resumo em áudio: IA na Medicina"
    "1nAywFOIYYiSVW-ACisMnu5g88YHTpOmD|Revisao_reticulacao_AH_audio|cover_preenchedores_faciais.jpg|Preenchedores_Faciais|Revisão Reticulação AH"
)

# ──────────────────────────────────────────────
# STEP 3: Download MP3s and convert
# ──────────────────────────────────────────────
TOTAL=${#MP3_ENTRIES[@]}
SUCCESS=0
FAILED=0

echo "🎵 Processando $TOTAL arquivos..."
echo ""

for i in "${!MP3_ENTRIES[@]}"; do
    IFS='|' read -r DRIVE_ID SAFE_NAME COVER THEME ORIGINAL_NAME <<< "${MP3_ENTRIES[$i]}"
    
    NUM=$((i + 1))
    THEME_DIR="$WORK_DIR/$THEME"
    mkdir -p "$THEME_DIR"
    
    MP3_FILE="$MP3_DIR/$SAFE_NAME.mp3"
    VIDEO_FILE="$THEME_DIR/$SAFE_NAME.mp4"
    
    # Skip if video already exists
    if [ -f "$VIDEO_FILE" ] && [ -s "$VIDEO_FILE" ]; then
        SUCCESS=$((SUCCESS + 1))
        echo "  [$NUM/$TOTAL] ⏭️  $ORIGINAL_NAME (já convertido)"
        continue
    fi
    
    # Skip placeholder IDs
    if [[ "$DRIVE_ID" == PENDENTE* ]]; then
        echo "  [$NUM/$TOTAL] ⚠️  $ORIGINAL_NAME (ID pendente — preencha no script)"
        FAILED=$((FAILED + 1))
        continue
    fi
    
    # Download MP3
    if [ ! -f "$MP3_FILE" ] || [ ! -s "$MP3_FILE" ]; then
        echo -n "  [$NUM/$TOTAL] ↓ Baixando $SAFE_NAME... "
        curl -sL "https://drive.google.com/uc?export=download&id=${DRIVE_ID}&confirm=t" -o "$MP3_FILE"
        if [ ! -s "$MP3_FILE" ]; then
            echo "❌ Falha no download"
            FAILED=$((FAILED + 1))
            continue
        fi
        echo "OK"
    fi
    
    # Convert to video
    echo -n "  [$NUM/$TOTAL] 🎬 Convertendo $ORIGINAL_NAME... "
    ffmpeg -y \
        -loop 1 -framerate 1 -i "$COVERS_DIR/$COVER" \
        -i "$MP3_FILE" \
        -c:v libx264 -tune stillimage \
        -c:a aac -b:a 128k \
        -r 1 \
        -pix_fmt yuv420p \
        -shortest \
        -movflags +faststart \
        "$VIDEO_FILE" 2>/dev/null
    
    if [ -f "$VIDEO_FILE" ] && [ -s "$VIDEO_FILE" ]; then
        SUCCESS=$((SUCCESS + 1))
        echo "✅"
    else
        FAILED=$((FAILED + 1))
        echo "❌"
    fi
done

echo ""
echo "============================================"
echo "  Resultado: $SUCCESS/$TOTAL convertidos"
if [ $FAILED -gt 0 ]; then
    echo "  ⚠️  $FAILED falharam"
fi
echo ""
echo "  📁 Vídeos em: $WORK_DIR/"
echo "     Organizados por tema:"
for d in "$WORK_DIR"/*/; do
    if [ -d "$d" ] && [ "$d" != "$COVERS_DIR/" ] && [ "$d" != "$MP3_DIR/" ]; then
        count=$(ls "$d"*.mp4 2>/dev/null | wc -l | tr -d ' ')
        echo "     - $(basename "$d"): $count vídeos"
    fi
done
echo ""
echo "  🎯 Próximo passo: faça upload dos vídeos no YouTube"
echo "     como 'Não listado' para cada tema."
echo "============================================"
