class KochHexagon {
    constructor() {
        this.canvas = document.getElementById('kochCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentLevel = null; // 初期状態では何も描画しない
        this.isAnimating = false;
        this.animationId = null;
        this.isOutward = false; // false: 内側, true: 外側
        this.isSingleEdgeMode = false; // false: 六角形, true: 1辺拡大

        this.setupCanvas();
        this.setupEventListeners();
        // 初期状態でレベル選択を促す
        setTimeout(() => this.showLevelPrompt(), 1000);
    }

    setupCanvas() {
        // 画面の高さも考慮して適切なサイズを決定
        const availableHeight = window.innerHeight - 300; // ヘッダーとコントロールの分を差し引く

        // デスクトップとモバイルでの最大サイズ設定
        let maxSize;
        if (window.innerWidth > 768) {
            // デスクトップ: 画面幅と高さの小さい方を基準に、最大600px
            maxSize = Math.min(600, window.innerWidth - 100, availableHeight);
        } else {
            // モバイル: 画面に収まるサイズ
            maxSize = Math.min(availableHeight, window.innerWidth - 60);
        }

        const size = Math.max(300, maxSize); // 最小サイズ300px確保

        this.canvas.width = size;
        this.canvas.height = size;
        this.canvas.style.width = size + 'px';
        this.canvas.style.height = size + 'px';

        // 中心点とサイズを設定（描画サイズを最大限に活用）
        this.centerX = size / 2;
        this.centerY = size / 2;
        this.baseRadius = size * 0.40; // 外側モードを考慮して調整（0.45 → 0.40）
    }

    setupEventListeners() {
        const buttons = document.querySelectorAll('.level-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = parseInt(e.target.dataset.level);
                this.selectLevel(level);
            });
        });

        // トグルボタンのイベント
        const toggleBtn = document.getElementById('directionToggle');
        const toggleText = toggleBtn.querySelector('.toggle-text');
        toggleBtn.addEventListener('click', () => {
            if (this.isAnimating) {
                this.showToast();
                return;
            }

            this.isOutward = !this.isOutward;
            toggleBtn.classList.toggle('outward', this.isOutward);
            toggleText.textContent = this.isOutward ? '外側' : '内側';

            // アクティブ状態をキャンセルしてレベル選択を促す
            this.cancelActiveState();
            this.showLevelPrompt();
        });

        // チェックボックスのイベント
        const edgeModeToggle = document.getElementById('edgeModeToggle');
        edgeModeToggle.addEventListener('change', () => {
            if (this.isAnimating) {
                this.showToast();
                return;
            }

            this.isSingleEdgeMode = edgeModeToggle.checked;

            // アクティブ状態をキャンセルしてレベル選択を促す
            this.cancelActiveState();
            this.showLevelPrompt();
        });

        // リサイズ対応
        window.addEventListener('resize', () => {
            this.setupCanvas();
            // レベルが選択されている場合のみ再描画
            if (this.currentLevel !== null) {
                this.drawLevel(this.currentLevel, false); // アニメーションなしで再描画
            }
        });
    }

    selectLevel(level) {
        if (this.isAnimating) {
            this.showToast();
            return;
        }

        // ボタンの状態更新
        document.querySelectorAll('.level-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-level="${level}"]`).classList.add('active');

        this.currentLevel = level;
        this.drawLevel(level, true);
    }

    showToast(message = '描画中です。お待ちください...') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    showLevelPrompt() {
        this.showToast('レベルボタン（0〜5）を押してください');
    }

    cancelActiveState() {
        // 全てのレベルボタンからアクティブ状態を削除
        document.querySelectorAll('.level-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        // 現在のレベルをクリア
        this.currentLevel = null;
        // キャンバスをクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // 六角形の頂点を生成
    getHexagonPoints() {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2; // -90度から開始
            points.push({
                x: this.centerX + this.baseRadius * Math.cos(angle),
                y: this.centerY + this.baseRadius * Math.sin(angle)
            });
        }
        return points;
    }

    // コッホ曲線変換を再帰的に適用
    applyKochTransform(start, end, level) {
        if (level === 0) {
            return [start, end];
        }

        const dx = end.x - start.x;
        const dy = end.y - start.y;

        // 線分を3等分する点
        const p1 = {
            x: start.x + dx / 3,
            y: start.y + dy / 3
        };
        const p3 = {
            x: start.x + (2 * dx) / 3,
            y: start.y + (2 * dy) / 3
        };

        // 正三角形の頂点を計算（内側/外側の切り替え）
        const heightDirection = this.isOutward ? -1 : 1;
        const p2 = {
            x: p1.x + (p3.x - p1.x) * 0.5 - (p3.y - p1.y) * Math.sqrt(3) / 2 * heightDirection,
            y: p1.y + (p3.y - p1.y) * 0.5 + (p3.x - p1.x) * Math.sqrt(3) / 2 * heightDirection
        };

        // 再帰的に各セグメントに変換を適用
        const segment1 = this.applyKochTransform(start, p1, level - 1);
        const segment2 = this.applyKochTransform(p1, p2, level - 1);
        const segment3 = this.applyKochTransform(p2, p3, level - 1);
        const segment4 = this.applyKochTransform(p3, end, level - 1);

        // 重複する点を除いて結合
        return [
            ...segment1.slice(0, -1),
            ...segment2.slice(0, -1),
            ...segment3.slice(0, -1),
            ...segment4
        ];
    }

    // 全ての描画ポイントを生成
    generateAllPoints(level) {
        // 1辺拡大モードの場合
        if (this.isSingleEdgeMode) {
            const start = {
                x: this.canvas.width * 0.05, // 左端から5%
                y: this.centerY
            };
            const end = {
                x: this.canvas.width * 0.95, // 右端まで95%
                y: this.centerY
            };
            return this.applyKochTransform(start, end, level);
        }

        // 通常の六角形モード
        const hexPoints = this.getHexagonPoints();
        let allPoints = [];

        for (let i = 0; i < 6; i++) {
            const start = hexPoints[i];
            const end = hexPoints[(i + 1) % 6];
            const edgePoints = this.applyKochTransform(start, end, level);

            // 重複する点を除いて追加
            if (i === 0) {
                allPoints = [...edgePoints];
            } else {
                allPoints = [...allPoints.slice(0, -1), ...edgePoints];
            }
        }

        return allPoints;
    }

    drawLevel(level, animate = true) {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const points = this.generateAllPoints(level);

        if (!animate) {
            this.drawStaticCurve(points);
            return;
        }

        this.animateCurve(points);
    }

    drawStaticCurve(points) {
        this.ctx.strokeStyle = '#2c3e50';

        // レベルに応じて線の太さを調整
        let lineWidth;
        switch(this.currentLevel) {
            case 0:
            case 1:
                lineWidth = 2;
                break;
            case 2:
            case 3:
                lineWidth = 1.5;
                break;
            case 4:
                lineWidth = 0.7;
                break;
            case 5:
                lineWidth = 0.7;
                break;
            default:
                lineWidth = 2;
        }

        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.stroke();
    }

    animateCurve(points) {
        this.isAnimating = true;
        const loadingOverlay = document.getElementById('loadingOverlay');

        let currentIndex = 0;
        const totalPoints = points.length;
        // 1辺拡大モードは3秒、通常モードは5秒
        const animationDuration = this.isSingleEdgeMode ? 3000 : 5000;
        const startTime = Date.now();

        this.ctx.strokeStyle = '#2c3e50';

        // レベルに応じて線の太さを調整
        let lineWidth;
        switch(this.currentLevel) {
            case 0:
            case 1:
                lineWidth = 2;
                break;
            case 2:
            case 3:
                lineWidth = 1.5;
                break;
            case 4:
                lineWidth = 0.7;
                break;
            case 5:
                lineWidth = 0.7;
                break;
            default:
                lineWidth = 2;
        }

        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // ローディングオーバーレイを表示してから描画開始
        loadingOverlay.classList.add('show');

        setTimeout(() => {
            loadingOverlay.classList.remove('show');

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / animationDuration, 1);
                const targetIndex = Math.floor(progress * (totalPoints - 1));

                // 新しい線分を描画
                if (targetIndex > currentIndex) {
                    this.ctx.beginPath();
                    for (let i = currentIndex; i <= targetIndex; i++) {
                        if (i === currentIndex) {
                            this.ctx.moveTo(points[i].x, points[i].y);
                        } else {
                            this.ctx.lineTo(points[i].x, points[i].y);
                        }
                    }
                    this.ctx.stroke();
                    currentIndex = targetIndex;
                }

                if (progress < 1) {
                    this.animationId = requestAnimationFrame(animate);
                } else {
                    this.isAnimating = false;
                    this.animationId = null;
                }
            };

            this.ctx.beginPath();
            this.ctx.moveTo(points[0].x, points[0].y);
            animate();
        }, 1000); // 1秒間ローディング表示
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    new KochHexagon();
});