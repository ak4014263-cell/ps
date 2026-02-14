import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { VDPText, VDPFunctionType } from '@/lib/vdpText';
import { Type, Maximize2, AlignLeft, AlignCenter, AlignRight, AlignJustify, Sparkles } from 'lucide-react';

interface DesignerVDPPanelProps {
    selectedObject: any;
    canvas: any;
    onUpdate: () => void;
}

export function DesignerVDPPanel({ selectedObject, canvas, onUpdate }: DesignerVDPPanelProps) {
    const [properties, setProperties] = useState({
        text: '',
        functionType: VDPFunctionType.AUTOSIZE,
        fontSize: 20,
        fontFamily: 'Arial',
        width: 300,
        height: 100,
        textAlign: 'center',
    });

    const isVDP = selectedObject instanceof VDPText;

    useEffect(() => {
        if (isVDP) {
            setProperties({
                text: selectedObject.textContent,
                functionType: selectedObject.functionType,
                fontSize: selectedObject.originalFontSize,
                fontFamily: (selectedObject._textElement as any).fontFamily,
                width: Math.round(selectedObject._containerRect.width),
                height: Math.round(selectedObject._containerRect.height),
                textAlign: (selectedObject._textElement as any).textAlign,
            });
        }
    }, [selectedObject]);

    if (!isVDP) return null;

    const updateVDP = (key: string, value: any) => {
        if (!selectedObject || !canvas) return;

        setProperties(prev => ({ ...prev, [key]: value }));

        switch (key) {
            case 'text':
                selectedObject.setText(value);
                break;
            case 'functionType':
                selectedObject.setFunctionType(value as VDPFunctionType);
                break;
            case 'fontSize':
                selectedObject.setOriginalFontSize(parseInt(value));
                break;
            case 'fontFamily':
                selectedObject._textElement.set('fontFamily', value);
                selectedObject.applyFitting();
                break;
            case 'textAlign':
                selectedObject._textElement.set('textAlign', value);
                selectedObject.applyFitting();
                break;
            case 'width':
            case 'height':
                const newWidth = key === 'width' ? parseInt(value) : properties.width;
                const newHeight = key === 'height' ? parseInt(value) : properties.height;
                selectedObject.setContainerSize(newWidth, newHeight);
                break;
        }

        canvas.requestRenderAll();
        onUpdate();
    };

    return (
        <div className="space-y-4 p-1">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary">VDP Tool Settings</h3>
                </div>
                <Badge variant="secondary" className="text-[8px] h-3.5 px-1 bg-primary/10 text-primary border-primary/20">PRO</Badge>
            </div>

            <div className="space-y-3">
                <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase">Function Mode</Label>
                    <div className="grid grid-cols-1 gap-1.5">
                        <Button
                            variant={properties.functionType === VDPFunctionType.AUTOSIZE ? 'default' : 'outline'}
                            size="sm"
                            className="justify-start h-auto py-2 px-3 text-left"
                            onClick={() => updateVDP('functionType', VDPFunctionType.AUTOSIZE)}
                        >
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">1. Auto Size</span>
                                <span className="text-[9px] opacity-70">Single line shrinks to fit width</span>
                            </div>
                        </Button>
                        <Button
                            variant={properties.functionType === VDPFunctionType.WORDWRAP ? 'default' : 'outline'}
                            size="sm"
                            className="justify-start h-auto py-2 px-3 text-left"
                            onClick={() => updateVDP('functionType', VDPFunctionType.WORDWRAP)}
                        >
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">2. Word Wrap</span>
                                <span className="text-[9px] opacity-70">Fixed size, wraps to multiple lines</span>
                            </div>
                        </Button>
                        <Button
                            variant={properties.functionType === VDPFunctionType.COMBINED ? 'default' : 'outline'}
                            size="sm"
                            className="justify-start h-auto py-2 px-3 text-left"
                            onClick={() => updateVDP('functionType', VDPFunctionType.COMBINED)}
                        >
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">3. Combined</span>
                                <span className="text-[9px] opacity-70">Wraps first, then shrinks if needed</span>
                            </div>
                        </Button>
                    </div>
                </div>

                <Separator className="bg-border/50" />

                <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase">Text Content</Label>
                    <Input
                        value={properties.text}
                        onChange={(e) => updateVDP('text', e.target.value)}
                        className="h-8 text-xs"
                        placeholder="Support {{variable}} fields"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground uppercase">Base Font Size</Label>
                        <Input
                            type="number"
                            value={properties.fontSize}
                            onChange={(e) => updateVDP('fontSize', e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground uppercase">Alignment</Label>
                        <div className="flex bg-muted rounded-md p-0.5">
                            {(['left', 'center', 'right', 'justify'] as const).map((align) => (
                                <Button
                                    key={align}
                                    variant={properties.textAlign === align ? 'secondary' : 'ghost'}
                                    size="icon"
                                    className="h-7 w-full"
                                    onClick={() => updateVDP('textAlign', align)}
                                >
                                    {align === 'left' && <AlignLeft className="h-3.5 w-3.5" />}
                                    {align === 'center' && <AlignCenter className="h-3.5 w-3.5" />}
                                    {align === 'right' && <AlignRight className="h-3.5 w-3.5" />}
                                    {align === 'justify' && <AlignJustify className="h-3.5 w-3.5" />}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground uppercase">Box Width</Label>
                        <Input
                            type="number"
                            value={properties.width}
                            onChange={(e) => updateVDP('width', e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground uppercase">Box Height</Label>
                        <Input
                            type="number"
                            value={properties.height}
                            onChange={(e) => updateVDP('height', e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
