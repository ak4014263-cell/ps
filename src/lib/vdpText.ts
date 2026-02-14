import { Group, Rect, FabricText, Textbox, GroupProps, Canvas } from 'fabric';

export enum VDPFunctionType {
    AUTOSIZE = 1,
    WORDWRAP = 2,
    COMBINED = 3
}

export interface VDPTextOptions extends Partial<GroupProps> {
    fontSize?: number;
    fontFamily?: string;
    textAlign?: string;
    width?: number;
    height?: number;
    fill?: string;
}

export class VDPText extends Group {
    static type = 'vdp-text';
    public functionType: VDPFunctionType;
    public originalFontSize: number;
    public currentFontSize: number;
    public minFontSize: number = 1;
    public textContent: string;
    public _containerRect: Rect;
    public _textElement: FabricText | Textbox;

    constructor(text: string, functionType: VDPFunctionType, options: VDPTextOptions = {}) {
        const initialWidth = options.width || 300;
        const initialHeight = options.height || 100;
        const originalFontSize = options.fontSize || 30;

        const containerRect = new Rect({
            left: 0,
            top: 0,
            width: initialWidth,
            height: initialHeight,
            fill: 'rgba(0, 212, 255, 0.1)',
            stroke: '#00d4ff',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
            originX: 'center',
            originY: 'center',
        });

        // Create initial text element (Function 1 uses FabricText, others use Textbox)
        let textElement: FabricText | Textbox;
        if (functionType === VDPFunctionType.AUTOSIZE) {
            textElement = new FabricText(text, {
                left: 0,
                top: 0,
                fontFamily: options.fontFamily || 'Arial',
                fontSize: originalFontSize,
                fill: options.fill || '#1e3c72',
                textAlign: (options.textAlign || 'center') as any,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false,
            });
        } else {
            textElement = new Textbox(text, {
                left: 0,
                top: 0,
                width: initialWidth,
                fontFamily: options.fontFamily || 'Arial',
                fontSize: originalFontSize,
                fill: options.fill || '#1e3c72',
                textAlign: (options.textAlign || 'center') as any,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false,
                splitByGrapheme: false
            });
        }

        super([containerRect, textElement], {
            left: options.left || 0,
            top: options.top || 0,
            selectable: true,
            hasControls: true,
            hasBorders: true,
            lockRotation: true,
            transparentCorners: false,
            cornerColor: '#00d4ff',
            cornerStrokeColor: '#fff',
            cornerSize: 10,
            padding: 0,
            originX: 'center',
            originY: 'center',
            ...options
        });

        this.functionType = functionType;
        this.originalFontSize = originalFontSize;
        this.currentFontSize = originalFontSize;
        this.textContent = text;
        this._containerRect = containerRect;
        this._textElement = textElement;

        this.setupListeners();
        this.applyFitting();
    }

    private setupListeners() {
        this.on('scaling', () => {
            // Calculate new dimensions based on scale
            const newWidth = this._containerRect.width * this.scaleX;
            const newHeight = this._containerRect.height * this.scaleY;

            // Update container dimensions
            this._containerRect.set({
                width: newWidth,
                height: newHeight,
            });

            // Reset group scale to 1 (we apply dimensions directly to the items)
            this.set({
                scaleX: 1,
                scaleY: 1,
                width: newWidth,
                height: newHeight
            });

            // Apply fitting in real-time during resize
            this.applyFitting();
        });
    }

    public applyFitting() {
        const containerWidth = this._containerRect.width;
        const containerHeight = this._containerRect.height;

        switch (this.functionType) {
            case VDPFunctionType.AUTOSIZE:
                this.applyAutoSizeOnly(containerWidth, containerHeight);
                break;
            case VDPFunctionType.WORDWRAP:
                this.applyWordWrapOnly(containerWidth, containerHeight);
                break;
            case VDPFunctionType.COMBINED:
                this.applyCombined(containerWidth, containerHeight);
                break;
        }

        this.centerText();
    }

    private applyAutoSizeOnly(containerWidth: number, containerHeight: number) {
        // Ensure we're using FabricText
        if (this._textElement.type === 'textbox') {
            const currentProps = {
                text: this._textElement.text,
                fontFamily: this._textElement.fontFamily,
                fontSize: this.originalFontSize,
                fill: this._textElement.fill,
                textAlign: this._textElement.textAlign as any,
                originX: 'center' as const,
                originY: 'center' as const,
                selectable: false,
                evented: false
            };
            this.remove(this._textElement);
            this._textElement = new FabricText(currentProps.text, currentProps);
            this.add(this._textElement);
            // The natural order (rect added first in constructor) is maintained
            // adding new text element puts it at the top of the group objects array.
        }

        this._textElement.set({
            fontSize: this.originalFontSize,
            scaleX: 1,
            scaleY: 1
        });

        const textWidth = this._textElement.width;
        let targetFontSize = this.originalFontSize;

        if (textWidth > containerWidth) {
            const scaleRatio = containerWidth / textWidth;
            targetFontSize = Math.floor(this.originalFontSize * scaleRatio);
            targetFontSize = Math.max(targetFontSize, this.minFontSize);
        }

        this.currentFontSize = targetFontSize;
        this._textElement.set('fontSize', targetFontSize);
    }

    private applyWordWrapOnly(containerWidth: number, containerHeight: number) {
        this.currentFontSize = this.originalFontSize;

        // Ensure we're using Textbox
        if (this._textElement.type === 'text') {
            const currentProps = {
                text: this._textElement.text,
                fontFamily: this._textElement.fontFamily,
                fontSize: this.originalFontSize,
                fill: this._textElement.fill,
                textAlign: this._textElement.textAlign as any,
                width: containerWidth,
                originX: 'center' as const,
                originY: 'center' as const,
                selectable: false,
                evented: false,
                splitByGrapheme: false
            };
            this.remove(this._textElement);
            this._textElement = new Textbox(currentProps.text, currentProps);
            this.add(this._textElement);
        }

        (this._textElement as Textbox).set({
            fontSize: this.originalFontSize,
            width: containerWidth
        });

        // Manual clipping for wrap only
        this._textElement.set({
            clipPath: new Rect({
                originX: 'center',
                originY: 'center',
                width: containerWidth,
                height: containerHeight,
                absolutePositioned: false // Relative to group/object
            })
        });
    }

    private applyCombined(containerWidth: number, containerHeight: number) {
        // Ensure Textbox
        if (this._textElement.type === 'text') {
            const currentProps = {
                text: this._textElement.text,
                fontFamily: this._textElement.fontFamily,
                fontSize: this.originalFontSize,
                fill: this._textElement.fill,
                textAlign: this._textElement.textAlign as any,
                width: containerWidth,
                originX: 'center' as const,
                originY: 'center' as const,
                selectable: false,
                evented: false,
                splitByGrapheme: false
            };
            this.remove(this._textElement);
            this._textElement = new Textbox(currentProps.text, currentProps);
            this.add(this._textElement);
        }

        let fontSize = this.originalFontSize;
        let fits = false;

        // Simple fixed height check for wrapping textbox
        while (fontSize >= this.minFontSize && !fits) {
            (this._textElement as Textbox).set({
                fontSize: fontSize,
                width: containerWidth
            });

            // Fabric v6 doesn't have initDimensions, it recalculated on set()
            if (this._textElement.height <= containerHeight) {
                fits = true;
                this.currentFontSize = fontSize;
            } else {
                fontSize--;
            }
        }

        this.currentFontSize = Math.max(this.minFontSize, fontSize);
        this._textElement.set({
            fontSize: this.currentFontSize,
            clipPath: new Rect({
                originX: 'center',
                originY: 'center',
                width: containerWidth,
                height: containerHeight,
                absolutePositioned: false
            })
        });
    }

    private centerText() {
        this._textElement.set({
            left: 0,
            top: 0,
            originX: 'center',
            originY: 'center'
        });
        this._containerRect.set({
            left: 0,
            top: 0,
            originX: 'center',
            originY: 'center'
        });
        this.setCoords();
    }

    // Helper methods to update from UI
    public setText(text: string) {
        this.textContent = text;
        this._textElement.set('text', text);
        this.applyFitting();
    }

    public setOriginalFontSize(size: number) {
        this.originalFontSize = size;
        this.applyFitting();
    }

    public setFunctionType(type: VDPFunctionType) {
        this.functionType = type;
        this.applyFitting();
    }

    public setContainerSize(width: number, height: number) {
        this._containerRect.set({ width, height });
        this.set({ width, height });
        this.applyFitting();
    }

    // Serialization
    public override toObject(propertiesToInclude: any[] = []): any {
        const obj = super.toObject([
            'functionType',
            'originalFontSize',
            'currentFontSize',
            'minFontSize',
            'textContent',
            ...propertiesToInclude,
        ] as any[]);
        // We recreate children in fromObject, so we don't need them in JSON
        delete obj.objects;
        return obj;
    }

    static async fromObject(object: any): Promise<VDPText> {
        const { objects, ...props } = object;
        const vdp = new VDPText(object.textContent, object.functionType, props);
        vdp.set(props);
        return vdp;
    }
}

import { classRegistry } from 'fabric';
classRegistry.setClass(VDPText);
