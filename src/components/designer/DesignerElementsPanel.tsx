import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Type, Square, Circle, Triangle, Star, Minus, Image, QrCode, Barcode,
  ArrowRight, Hexagon, Pentagon, X, User, Sparkles
} from 'lucide-react';

export type PhotoShape = 'rect' | 'rounded-rect' | 'circle' | 'ellipse' | 'hexagon' | 'star' | 'heart' | 'octagon' | 'pentagon';

interface DesignerElementsPanelProps {
  onAddShape: (type: string) => void;
  onAddText: (text: string, isVariable?: boolean, asBox?: boolean, isVDP?: boolean) => void;
  onAddImage: (file: File) => void;
  onAddPlaceholder: (type: 'photo' | 'barcode' | 'qrcode', shape?: PhotoShape) => void;
  onClose?: () => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

const SHAPES = [
  { type: 'rect', icon: Square, label: 'Rectangle' },
  { type: 'circle', icon: Circle, label: 'Circle' },
  { type: 'triangle', icon: Triangle, label: 'Triangle' },
  { type: 'star', icon: Star, label: 'Star' },
  { type: 'polygon', icon: Hexagon, label: 'Hexagon' },
  { type: 'line', icon: Minus, label: 'Line' },
  { type: 'arrow', icon: ArrowRight, label: 'Arrow' },
];

export function DesignerElementsPanel({
  onAddShape,
  onAddText,
  onAddImage,
  onAddPlaceholder,
  onClose,
  canvasRef,
}: DesignerElementsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPopoverOpen, setPhotoPopoverOpen] = useState<string | null>(null);

  const [textboxDialogOpen, setTextboxDialogOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAddImage(file);
      e.target.value = '';
    }
  };

  const handleAddPhotoWithShape = (shape: PhotoShape) => {
    onAddPlaceholder('photo', shape);
    setPhotoPopoverOpen(null);
  };

  const handleTextboxConfirm = (text: string, isVariable: boolean, asBox: boolean) => {
    onAddText(text, isVariable, asBox);
    setTextboxDialogOpen(false);
  };



  return (
    <div className="w-72 bg-card border-r shadow-lg">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-base">Elements</h3>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <ScrollArea className="h-[calc(100%-60px)]">
        <div className="p-4 space-y-4">
          <Tabs defaultValue="shapes" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="shapes" className="text-xs">Shapes</TabsTrigger>
              <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
              <TabsTrigger value="text" className="text-xs">Text</TabsTrigger>
            </TabsList>

            {/* Shapes Tab */}
            <TabsContent value="shapes" className="mt-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {SHAPES.map((shape) => (
                  <Button
                    key={shape.type}
                    variant="outline"
                    className="h-16 flex-col gap-1 p-2"
                    onClick={() => onAddShape(shape.type)}
                  >
                    <shape.icon className="h-5 w-5" />
                    <span className="text-[10px]">{shape.label}</span>
                  </Button>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Quick Shapes</Label>
                <div className="grid grid-cols-4 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 p-1"
                    onClick={() => onAddShape('rounded-rect')}
                    title="Rounded Rectangle"
                  >
                    <Square className="h-4 w-4 rounded" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 p-1"
                    onClick={() => onAddShape('ellipse')}
                    title="Ellipse"
                  >
                    <Circle className="h-4 w-4 scale-x-125" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 p-1"
                    onClick={() => onAddShape('pentagon')}
                    title="Pentagon"
                  >
                    <Pentagon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 p-1"
                    onClick={() => onAddShape('diamond')}
                    title="Diamond"
                  >
                    <Square className="h-4 w-4 rotate-45" />
                  </Button>
                </div>
              </div>
            </TabsContent>



            {/* Media Tab */}
            <TabsContent value="media" className="mt-3 space-y-3">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full h-20 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="h-6 w-6" />
                  <span className="text-xs">Upload Image</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Placeholders</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start h-10"
                  onClick={() => onAddPlaceholder('photo', 'rect')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Photo Placeholder
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-10"
                  onClick={() => onAddPlaceholder('barcode')}
                >
                  <Barcode className="h-4 w-4 mr-2" />
                  Barcode Placeholder
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-10"
                  onClick={() => onAddPlaceholder('qrcode')}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Code Placeholder
                </Button>
              </div>
            </TabsContent>
            {/* Text Tab */}
            <TabsContent value="text" className="mt-3 space-y-3">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full h-12 justify-start px-4"
                  onClick={() => onAddText('Heading', false, false)}
                >
                  <Type className="h-5 w-5 mr-3" />
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-medium">Add Heading</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 justify-start px-4"
                  onClick={() => onAddText('Your text here', false, false)}
                >
                  <Type className="h-4 w-4 mr-3" />
                  <div className="flex flex-col items-start">
                    <span className="text-xs">Add Paragraph Text</span>
                  </div>
                </Button>

                <Separator className="my-2" />

                <div className="space-y-2">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold px-1">Advanced Text Tools</Label>
                  <Button
                    variant="outline"
                    className="w-full h-12 justify-start px-4 border-dashed bg-primary/5 hover:bg-primary/10 border-primary/20"
                    onClick={() => (onAddText as any)('VDP Text', false, false, true)}
                  >
                    <Sparkles className="h-4 w-4 mr-3 text-primary" />
                    <div className="flex flex-col items-start text-left">
                      <span className="text-xs font-medium text-primary">VDP Text Tool</span>
                      <span className="text-[9px] text-muted-foreground">Auto-sizing & wrapping container</span>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-12 justify-start px-4 border-dashed"
                    onClick={() => onAddText('{{variable}}', true, true)}
                  >
                    <div className="h-5 w-5 mr-3 flex items-center justify-center border border-dashed rounded text-[10px] font-mono">
                      {`{}`}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-medium">Add Variable Field</span>
                      <span className="text-[10px] text-muted-foreground">Dynamic data placeholder</span>
                    </div>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Textbox Input Dialog */}

    </div>
  );
}
