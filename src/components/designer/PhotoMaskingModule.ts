import { FabricImage, Shadow, Canvas as FabricCanvas } from 'fabric';

// Placeholder for CanvasEvents since CanvasEngine.js is not present
export const CanvasEvents = {
    OBJECT_ADDED: 'object:added',
    OBJECT_REMOVED: 'object:removed',
    SELECTION_CREATED: 'selection:created',
    SELECTION_UPDATED: 'selection:updated',
    SELECTION_CLEARED: 'selection:cleared'
};

// ============================================================================
// MASK SHAPE DEFINITIONS (Enhanced)
// ============================================================================

export const MaskShapes: any = {
    circle: {
        id: 'circle',
        name: 'Circle',
        icon: 'fa-circle',
        category: 'basic',
        createPath: (ctx: CanvasRenderingContext2D, size: number) => {
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        }
    },

    roundedRect: {
        id: 'rounded-rect',
        name: 'Rounded Rectangle',
        icon: 'fa-square',
        category: 'basic',
        createPath: (ctx: CanvasRenderingContext2D, size: number) => {
            const r = size * 0.15;
            const x = 0, y = 0, w = size, h = size;
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
        }
    },

    hexagon: {
        id: 'hexagon',
        name: 'Hexagon',
        icon: 'fa-hexagon',
        category: 'geometric',
        createPath: (ctx: CanvasRenderingContext2D, size: number) => {
            const cx = size / 2, cy = size / 2, r = size / 2;
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3 - Math.PI / 2;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
        }
    },

    star: {
        id: 'star',
        name: 'Star',
        icon: 'fa-star',
        category: 'decorative',
        createPath: (ctx: CanvasRenderingContext2D, size: number) => {
            const cx = size / 2, cy = size / 2, r = size / 2;
            const points = 5, inset = 0.4;
            for (let i = 0; i < points * 2; i++) {
                const angle = (i * Math.PI) / points - Math.PI / 2;
                const radius = i % 2 === 0 ? r : r * inset;
                const x = cx + radius * Math.cos(angle);
                const y = cy + radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
        }
    },

    heart: {
        id: 'heart',
        name: 'Heart',
        icon: 'fa-heart',
        category: 'decorative',
        createPath: (ctx: CanvasRenderingContext2D, size: number) => {
            const cx = size / 2, cy = size / 2, r = size / 2;
            const top = cy - r * 0.3;
            ctx.moveTo(cx, cy + r * 0.3);
            ctx.bezierCurveTo(cx, cy, cx - r, cy - r * 0.5, cx - r, cy - r * 0.2);
            ctx.bezierCurveTo(cx - r, cy + r * 0.3, cx - r * 0.2, cy + r * 0.8, cx, cy + r);
            ctx.bezierCurveTo(cx + r * 0.2, cy + r * 0.8, cx + r, cy + r * 0.3, cx + r, cy - r * 0.2);
            ctx.bezierCurveTo(cx + r, cy - r * 0.5, cx, cy, cx, cy + r * 0.3);
        }
    },

    diamond: {
        id: 'diamond',
        name: 'Diamond',
        icon: 'fa-gem',
        category: 'geometric',
        createPath: (ctx: CanvasRenderingContext2D, size: number) => {
            const cx = size / 2, cy = size / 2, r = size / 2;
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r, cy);
            ctx.lineTo(cx, cy + r);
            ctx.lineTo(cx - r, cy);
        }
    }
};

// ============================================================================
// MASKED PHOTO OBJECT (Canvas Designer Integration)
// ============================================================================

export class MaskedPhotoObject {
    id: string;
    type: string;
    name: string;
    photoSrc: string | null;
    photoSize: { width: number, height: number };
    photoPosition: { x: number, y: number };
    photoScale: number;
    shape: string;
    customMaskSrc: string | null;
    size: number;
    borderWidth: number;
    borderColor: string;
    borderStyle: string;
    shadow: { enabled: boolean, blur: number, offsetX: number, offsetY: number, color: string };
    effects: { grayscale: boolean, sepia: boolean, brightness: number, contrast: number, saturation: number };
    variableBinding: any;
    _fabricObject: any;
    _cachedCanvas: HTMLCanvasElement | null;
    _cacheKey: string | null;
    _maskData: ImageData | null;

    constructor(options: any = {}) {
        this.id = options.id || `masked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.type = 'masked-photo';
        this.name = options.name || 'Masked Photo';

        // Photo properties
        this.photoSrc = options.photoSrc || null;
        this.photoSize = options.photoSize || { width: 0, height: 0 };
        this.photoPosition = options.photoPosition || { x: 50, y: 50 };
        this.photoScale = options.photoScale || 100;

        // Mask properties
        this.shape = options.shape || 'circle';
        this.customMaskSrc = options.customMaskSrc || null;
        this.size = options.size || 100;

        // Style
        this.borderWidth = options.borderWidth || 0;
        this.borderColor = options.borderColor || '#3b82f6';
        this.borderStyle = options.borderStyle || 'solid';
        this.shadow = options.shadow || { enabled: false, blur: 10, offsetX: 0, offsetY: 4, color: 'rgba(0,0,0,0.3)' };

        // Effects
        this.effects = options.effects || {
            grayscale: false,
            sepia: false,
            brightness: 100,
            contrast: 100,
            saturation: 100
        };

        // VDP binding
        this.variableBinding = options.variableBinding || null;

        // Cached fabric object
        this._fabricObject = null;
        this._cachedCanvas = null;
        this._cacheKey = null;
        this._maskData = null;
    }

    async renderToFabric(fabric: any, engine: any) {
        await this._ensureCanvas();
        return this._createFabricImage(fabric, this._cachedCanvas!);
    }

    async _ensureCanvas() {
        const cacheKey = this._generateCacheKey();
        if (this._cachedCanvas && this._cacheKey === cacheKey) return;

        const canvas = document.createElement('canvas');
        canvas.width = this.size;
        canvas.height = this.size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        ctx.beginPath();
        if (this.shape === 'custom' && this.customMaskSrc) {
            await this._applyCustomMask(ctx);
        } else {
            const shapeDef = MaskShapes[this.shape];
            if (shapeDef) shapeDef.createPath(ctx, this.size);
        }
        ctx.closePath();
        ctx.clip();
        await this._drawPhoto(ctx);
        ctx.restore();

        if (this.borderWidth > 0) this._drawBorder(ctx);

        this._cachedCanvas = canvas;
        this._cacheKey = cacheKey;
    }

    async _applyCustomMask(ctx: CanvasRenderingContext2D) {
        if (!this.customMaskSrc) return;
        const img: any = await this._loadImage(this.customMaskSrc);
        ctx.drawImage(img, 0, 0, this.size, this.size);

        // Use as alpha mask
        const maskData = ctx.getImageData(0, 0, this.size, this.size);
        ctx.clearRect(0, 0, this.size, this.size);

        // Store for later application
        this._maskData = maskData;
    }

    async _drawPhoto(ctx: CanvasRenderingContext2D) {
        if (!this.photoSrc) return;

        const img: any = await this._loadImage(this.photoSrc);

        // Calculate dimensions with "Cover" strategy
        // Base scale ensures the image covers the entire mask area
        const scaleX = this.size / img.naturalWidth;
        const scaleY = this.size / img.naturalHeight;
        const baseScale = Math.max(scaleX, scaleY);

        // Apply user zoom (photoScale) relative to the cover scale
        // photoScale = 100 means "Fit to Cover"
        const finalScale = baseScale * (this.photoScale / 100);

        const w = img.naturalWidth * finalScale;
        const h = img.naturalHeight * finalScale;

        // Center alignment by default, adjusted by photoPosition
        // photoPosition {x:50, y:50} means center.
        const x = (this.size - w) * (this.photoPosition.x / 100);
        const y = (this.size - h) * (this.photoPosition.y / 100);

        // Apply effects
        const filters = [];
        if (this.effects.grayscale) filters.push('grayscale(100%)');
        if (this.effects.sepia) filters.push('sepia(100%)');
        if (this.effects.brightness !== 100) filters.push(`brightness(${this.effects.brightness}%)`);
        if (this.effects.contrast !== 100) filters.push(`contrast(${this.effects.contrast}%)`);
        if (this.effects.saturation !== 100) filters.push(`saturate(${this.effects.saturation}%)`);

        if (filters.length > 0) {
            ctx.filter = filters.join(' ');
        }

        ctx.drawImage(img, x, y, w, h);
        ctx.filter = 'none';

        // Apply custom mask alpha if exists
        if (this._maskData) {
            const imageData = ctx.getImageData(0, 0, this.size, this.size);
            const data = imageData.data;
            const mask = this._maskData.data;

            for (let i = 0; i < data.length; i += 4) {
                const luminance = (mask[i] + mask[i + 1] + mask[i + 2]) / 3;
                data[i + 3] = (mask[i + 3] * luminance) / 255;
            }

            ctx.putImageData(imageData, 0, 0);
            this._maskData = null;
        }
    }

    _drawBorder(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderWidth;

        if (this.borderStyle === 'dashed') {
            ctx.setLineDash([5, 3]);
        } else if (this.borderStyle === 'glow') {
            ctx.shadowColor = this.borderColor;
            ctx.shadowBlur = 10;
        }

        ctx.beginPath();
        const shapeDef = MaskShapes[this.shape];
        if (shapeDef) {
            shapeDef.createPath(ctx, this.size);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    async _createFabricImage(fabric: any, canvas: HTMLCanvasElement) {
        const img = await FabricImage.fromURL(canvas.toDataURL('image/png'));
        img.set({
            id: this.id,
            name: this.name,
            type: 'masked-photo',
            maskedPhoto: true,
            maskConfig: this.toJSON(),
            variableBinding: this.variableBinding,
            objectCaching: true
        });

        if (this.shadow.enabled) {
            img.set({
                shadow: new Shadow({
                    color: this.shadow.color,
                    blur: this.shadow.blur,
                    offsetX: this.shadow.offsetX,
                    offsetY: this.shadow.offsetY
                })
            });
        }

        // Override toObject to ensure custom properties are saved
        const originalToObject = img.toObject.bind(img);
        (img as any).toObject = (additionalProperties: any[] = []) => {
            return originalToObject(([
                'id',
                'name',
                'maskedPhoto',
                'maskConfig',
                'variableBinding',
                ...(additionalProperties || [])
            ]) as any);
        };

        this._fabricObject = img;
        return img;
    }

    _loadImage(src: string) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    _generateCacheKey() {
        return JSON.stringify({
            photoSrc: this.photoSrc,
            shape: this.shape,
            customMaskSrc: this.customMaskSrc,
            size: this.size,
            position: this.photoPosition,
            scale: this.photoScale,
            effects: this.effects,
            border: `${this.borderWidth}-${this.borderColor}-${this.borderStyle}`
        });
    }

    invalidateCache() {
        this._cachedCanvas = null;
        this._cacheKey = null;
    }

    async updatePhoto(newSrc: string, engine: any) {
        this.photoSrc = newSrc;
        this.invalidateCache();

        if (engine && this._fabricObject) {
            const newFabricObj: any = await this.renderToFabric(engine.fabric, engine);

            // Preserve transform
            newFabricObj.set({
                left: this._fabricObject.left,
                top: this._fabricObject.top,
                scaleX: this._fabricObject.scaleX,
                scaleY: this._fabricObject.scaleY,
                angle: this._fabricObject.angle,
                flipX: this._fabricObject.flipX,
                flipY: this._fabricObject.flipY
            });

            // Replace in canvas
            engine.removeObject(this._fabricObject);
            engine.addObject(newFabricObj, { select: false });
            this._fabricObject = newFabricObj;
        }
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            photoSrc: this.photoSrc,
            photoSize: this.photoSize,
            photoPosition: this.photoPosition,
            photoScale: this.photoScale,
            shape: this.shape,
            customMaskSrc: this.customMaskSrc,
            size: this.size,
            borderWidth: this.borderWidth,
            borderColor: this.borderColor,
            borderStyle: this.borderStyle,
            shadow: this.shadow,
            effects: this.effects,
            variableBinding: this.variableBinding
        };
    }

    static fromJSON(json: any) {
        return new MaskedPhotoObject(json);
    }
}

// ============================================================================
// MASKING TOOL (Canvas Designer Integration)
// ============================================================================

export class MaskingTool {
    engine: any;
    name: string;
    icon: string;
    cursor: string;
    category: string;
    modal: HTMLElement | null;
    currentConfig: any;
    editingObject: any;

    constructor(engine: any) {
        this.engine = engine;
        this.name = 'masked-image';
        this.icon = 'fa-mask';
        this.cursor = 'copy';
        this.category = 'media';

        this.modal = null;
        this.currentConfig = null;
        this.editingObject = null;
    }

    async activate() {
        this._ensureModal();
        this.openModal();
    }

    deactivate() {
        this.closeModal();
    }

    _ensureModal() {
        if (this.modal) return;

        const html = `
            <div id="masking-modal" class="vdp-modal hidden">
                <div class="vdp-modal-overlay"></div>
                <div class="vdp-modal-content" style="width: 600px;">
                    <header class="vdp-modal-header">
                        <h3><i class="fas fa-mask text-blue-400"></i> Photo Mask</h3>
                        <button class="close-btn"><i class="fas fa-times"></i></button>
                    </header>
                    
                    <div class="vdp-modal-body">
                        <!-- Photo Upload -->
                        <section class="mask-section">
                            <h4>1. Select Photo</h4>
                            <div class="upload-zone" id="mask-photo-upload">
                                <input type="file" accept="image/*" hidden>
                                <div class="upload-placeholder">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>Drop photo or click to browse</p>
                                </div>
                            </div>
                            <div class="photo-editor hidden" id="mask-photo-editor">
                                <img class="photo-thumb">
                                <div class="photo-controls">
                                    <div class="control-row">
                                        <label>Position</label>
                                        <div class="position-grid">
                                            ${['TL', 'T', 'TR', 'L', 'C', 'R', 'BL', 'B', 'BR'].map(pos =>
            `<button data-x="${pos.includes('L') ? 25 : pos.includes('R') ? 75 : 50}" 
                                                        data-y="${pos.includes('T') ? 25 : pos.includes('B') ? 75 : 50}">${pos}</button>`
        ).join('')}
                                        </div>
                                    </div>
                                    <div class="control-row">
                                        <label>Scale: <span class="value">100%</span></label>
                                        <input type="range" min="50" max="200" value="100" class="scale-slider">
                                    </div>
                                </div>
                            </div>
                        </section>

                        <!-- Shape Selection -->
                        <section class="mask-section">
                            <h4>2. Choose Shape</h4>
                            <div class="shape-grid">
                                ${Object.values(MaskShapes).map((shape: any) => `
                                    <button class="shape-btn" data-shape="${shape.id}" title="${shape.name}">
                                        <i class="fas ${shape.icon}"></i>
                                    </button>
                                `).join('')}
                            </div>
                        </section>

                        <!-- Styling -->
                        <section class="mask-section">
                            <h4>3. Style</h4>
                            <div class="style-controls">
                                <div class="control-row">
                                    <label>Size: <span class="value">100px</span></label>
                                    <input type="range" min="40" max="300" value="100" class="size-slider">
                                </div>
                                <div class="control-row">
                                    <label>Border: <span class="value">3px</span></label>
                                    <input type="range" min="0" max="20" value="3" class="border-slider">
                                </div>
                                <div class="control-row">
                                    <label>Border Color</label>
                                    <input type="color" value="#3b82f6" class="border-color">
                                </div>
                            </div>
                        </section>

                        <!-- Preview -->
                        <section class="mask-section">
                            <h4>Preview</h4>
                            <div class="preview-container">
                                <canvas id="mask-preview" width="200" height="200"></canvas>
                            </div>
                        </section>
                    </div>

                    <footer class="vdp-modal-footer">
                        <button class="btn-secondary cancel">Cancel</button>
                        <button class="btn-primary apply" disabled>Add to Design</button>
                    </footer>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        this.modal = document.getElementById('masking-modal');
        if (this.modal) this._setupEventListeners();
    }

    _setupEventListeners() {
        if (!this.modal) return;
        // Close
        const closeBtn = this.modal.querySelector('.close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());

        const cancelBtn = this.modal.querySelector('.cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

        const overlay = this.modal.querySelector('.vdp-modal-overlay');
        if (overlay) overlay.addEventListener('click', () => this.closeModal());

        // Photo upload
        const uploadZone = this.modal.querySelector('#mask-photo-upload') as HTMLElement;
        const fileInput = uploadZone.querySelector('input') as HTMLInputElement;

        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            if (e.dataTransfer && e.dataTransfer.files[0]) this._handlePhotoFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e: any) => {
            if (e.target.files[0]) this._handlePhotoFile(e.target.files[0]);
        });

        // Shape selection
        const shapeGrid = this.modal.querySelector('.shape-grid');
        if (shapeGrid) shapeGrid.addEventListener('click', (e: any) => {
            const btn = e.target.closest('.shape-btn');
            if (btn) {
                const buttons = this.modal?.querySelectorAll('.shape-btn');
                if (buttons) buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentConfig.shape = btn.dataset.shape;
                this._updatePreview();
            }
        });

        // Controls
        const sizeSlider = this.modal.querySelector('.size-slider');
        if (sizeSlider) sizeSlider.addEventListener('input', (e: any) => {
            this.currentConfig.size = parseInt(e.target.value);
            const valueSpan = e.target.previousElementSibling.querySelector('.value');
            if (valueSpan) valueSpan.textContent = `${this.currentConfig.size}px`;
            this._updatePreview();
        });

        const borderSlider = this.modal.querySelector('.border-slider');
        if (borderSlider) borderSlider.addEventListener('input', (e: any) => {
            this.currentConfig.borderWidth = parseInt(e.target.value);
            const valueSpan = e.target.previousElementSibling.querySelector('.value');
            if (valueSpan) valueSpan.textContent = `${this.currentConfig.borderWidth}px`;
            this._updatePreview();
        });

        const borderColor = this.modal.querySelector('.border-color');
        if (borderColor) borderColor.addEventListener('input', (e: any) => {
            this.currentConfig.borderColor = e.target.value;
            this._updatePreview();
        });

        // Position presets
        const posBtns = this.modal.querySelectorAll('.position-grid button');
        if (posBtns) posBtns.forEach((btn: any) => {
            btn.addEventListener('click', () => {
                this.currentConfig.photoPosition = {
                    x: parseInt(btn.dataset.x),
                    y: parseInt(btn.dataset.y)
                };
                this._updatePreview();
            });
        });

        // Scale
        const scaleSlider = this.modal.querySelector('.scale-slider');
        if (scaleSlider) scaleSlider.addEventListener('input', (e: any) => {
            this.currentConfig.photoScale = parseInt(e.target.value);
            const valueSpan = e.target.previousElementSibling.querySelector('.value');
            if (valueSpan) valueSpan.textContent = `${this.currentConfig.photoScale}%`;
            this._updatePreview();
        });

        // Apply
        const applyBtn = this.modal.querySelector('.apply');
        if (applyBtn) applyBtn.addEventListener('click', () => this._apply());
    }

    async _handlePhotoFile(file: File) {
        const dataUrl: any = await this._readFile(file);
        this.currentConfig.photoSrc = dataUrl;

        const img = new Image();
        img.onload = () => {
            this.currentConfig.photoSize = {
                width: img.naturalWidth,
                height: img.naturalHeight
            };

            if (this.modal) {
                const uploadZone = this.modal.querySelector('#mask-photo-upload');
                if (uploadZone) uploadZone.classList.add('hidden');

                const editor = this.modal.querySelector('#mask-photo-editor');
                if (editor) editor.classList.remove('hidden');

                const thumb = this.modal.querySelector('.photo-thumb') as HTMLImageElement;
                if (thumb) thumb.src = dataUrl;

                const applyBtn = this.modal.querySelector('.apply') as HTMLButtonElement;
                if (applyBtn) applyBtn.disabled = false;
            }

            this._updatePreview();
        };
        img.src = dataUrl;
    }

    _readFile(file: File) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e: any) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    async _updatePreview() {
        if (!this.modal) return;
        const canvas = this.modal.querySelector('#mask-preview') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, 200, 200);

        if (!this.currentConfig.photoSrc) {
            // Draw placeholder text or something?
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 200, 200);
            ctx.fillStyle = '#999';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Upload a photo to preview', 100, 100);
            return;
        }

        // Render mask
        const maskedPhoto = new MaskedPhotoObject(this.currentConfig);

        // We only need the internal canvas rendering, not the Fabric object
        await maskedPhoto._ensureCanvas();

        // Draw scaled to preview
        if (maskedPhoto._cachedCanvas) {
            const size = this.currentConfig.size;
            const scale = 200 / size;
            ctx.save();
            ctx.scale(scale, scale);
            ctx.drawImage(maskedPhoto._cachedCanvas, 0, 0);
            ctx.restore();
        }

        // Enable apply button
        const applyBtn = this.modal.querySelector('.apply') as HTMLButtonElement;
        if (applyBtn) applyBtn.disabled = !this.currentConfig.photoSrc;
    }


    async _apply() {
        // Assuming global fabric is available or passed in engine
        // In this environment, we might need to use window.fabric or import it.
        // For now trusting engine.fabric has it.
        const maskedPhoto = new MaskedPhotoObject(this.currentConfig);
        const fabricObj: any = await maskedPhoto.renderToFabric(this.engine.fabric || (window as any).fabric, this.engine);

        // Center on canvas
        const artboard = this.engine.activeArtboard || { width: 800, height: 600 };
        fabricObj.set({
            left: (artboard.width - this.currentConfig.size) / 2,
            top: (artboard.height - this.currentConfig.size) / 2
        });

        this.engine.addObject(fabricObj, {
            type: 'masked-photo',
            layerName: 'Masked Photo'
        });

        this.closeModal();
        this.engine.emit(CanvasEvents.OBJECT_ADDED, { object: fabricObj });
    }

    openModal(editObject: any = null) {
        this.editingObject = editObject;
        this.currentConfig = editObject ?
            MaskedPhotoObject.fromJSON(editObject.maskConfig).toJSON() :
            {
                photoSrc: null,
                photoPosition: { x: 50, y: 50 },
                photoScale: 100,
                shape: 'circle',
                size: 100,
                borderWidth: 3,
                borderColor: '#3b82f6',
                borderStyle: 'solid',
                shadow: { enabled: false },
                effects: { grayscale: false, sepia: false, brightness: 100, contrast: 100, saturation: 100 }
            };

        if (this.modal) this.modal.classList.remove('hidden');

        if (editObject) {
            this._loadForEdit(editObject);
        }
    }

    closeModal() {
        if (this.modal) this.modal.classList.add('hidden');
        this.editingObject = null;
        this.currentConfig = null;
    }

    _loadForEdit(obj: any) {
        if (!this.modal) return;
        // Populate UI with existing values
        const cfg = obj.maskConfig;

        // Photo
        if (cfg.photoSrc) {
            const uploadZone = this.modal.querySelector('#mask-photo-upload');
            if (uploadZone) uploadZone.classList.add('hidden');

            const editor = this.modal.querySelector('#mask-photo-editor');
            if (editor) editor.classList.remove('hidden');

            const thumb = this.modal.querySelector('.photo-thumb') as HTMLImageElement;
            if (thumb) thumb.src = cfg.photoSrc;
        }

        // Shape
        const shapeBtn = this.modal.querySelector(`[data-shape="${cfg.shape}"]`);
        if (shapeBtn) shapeBtn.classList.add('active');

        // Controls
        const sizeSlider: any = this.modal.querySelector('.size-slider');
        if (sizeSlider) sizeSlider.value = cfg.size;

        const borderSlider: any = this.modal.querySelector('.border-slider');
        if (borderSlider) borderSlider.value = cfg.borderWidth;

        const borderColor: any = this.modal.querySelector('.border-color');
        if (borderColor) borderColor.value = cfg.borderColor;

        this._updatePreview();
    }
}

// ============================================================================
// VDP BATCH PROCESSING SUPPORT
// ============================================================================

export class MaskingBatchProcessor {
    engine: any;
    constructor(engine: any) {
        this.engine = engine;
    }

    async processRecord(record: any, maskedPhotos: any[]) {
        const results = [];

        for (const photo of maskedPhotos) {
            if (!photo.variableBinding) continue;

            const fieldValue = record[photo.variableBinding.field];
            if (!fieldValue) continue;

            try {
                const newPhoto = new MaskedPhotoObject(photo.toJSON());
                await newPhoto.updatePhoto(fieldValue, this.engine);
                results.push(newPhoto);
            } catch (err) {
                console.error('Failed to update masked photo:', err);
            }
        }

        return results;
    }

    async generateBatchPreview(records: any[], maskedPhotoTemplate: any, maxPreviews = 5) {
        const previews = [];
        const sampleRecords = records.slice(0, maxPreviews);

        for (const record of sampleRecords) {
            const photo = new MaskedPhotoObject(maskedPhotoTemplate.toJSON());

            if (maskedPhotoTemplate.variableBinding) {
                const fieldValue = record[maskedPhotoTemplate.variableBinding.field];
                if (fieldValue) {
                    await photo.updatePhoto(fieldValue, null);
                }
            }

            // Ensure canvas is generated for preview
            await photo._ensureCanvas();

            previews.push({
                record,
                canvas: photo._cachedCanvas
            });
        }

        return previews;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    MaskShapes,
    MaskedPhotoObject,
    MaskingTool,
    MaskingBatchProcessor
};
