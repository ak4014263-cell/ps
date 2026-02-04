import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface TextboxInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (text: string, isVariable: boolean, asBox: boolean) => void;
  initialText?: string;
  isVariable?: boolean;
  asBox?: boolean;
}

export function TextboxInputDialog({
  open,
  onOpenChange,
  onConfirm,
  initialText = '',
  isVariable = false,
  asBox = false,
}: TextboxInputDialogProps) {
  const [text, setText] = useState(initialText);
  const [variable, setVariable] = useState(isVariable);
  const [boxMode, setBoxMode] = useState(asBox);

  useEffect(() => {
    setText(initialText);
    setVariable(isVariable);
    setBoxMode(asBox);
  }, [initialText, isVariable, asBox, open]);

  const handleConfirm = () => {
    if (text.trim()) {
      onConfirm(text.trim(), variable, boxMode && variable);
      setText('');
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card text-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {initialText ? 'Edit Text' : 'Add Text to Canvas'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="text-input">Text Content</Label>
            <Textarea
              id="text-input"
              placeholder="Enter text content or variable placeholder (e.g., {{name}})"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] resize-none bg-background text-foreground border-border"
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="variable"
                checked={variable}
                onCheckedChange={(checked) => setVariable(checked as boolean)}
              />
              <Label htmlFor="variable" className="font-normal cursor-pointer">
                This is a variable/placeholder field
              </Label>
            </div>

            {variable && (
              <div className="flex items-center space-x-2 ml-6">
                <Checkbox
                  id="boxMode"
                  checked={boxMode}
                  onCheckedChange={(checked) => setBoxMode(checked as boolean)}
                />
                <Label htmlFor="boxMode" className="font-normal cursor-pointer text-sm">
                  Use box mode for multi-line text
                </Label>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded border border-border">
            <p className="font-medium mb-1 text-foreground">Tips:</p>
            <ul className="space-y-1">
              <li>• Use <code className="bg-foreground/10 text-foreground px-1.5 py-0.5 rounded text-xs font-mono">{'{{fieldName}}'}</code> for variable placeholders</li>
              <li>• Enable "variable field" for fields that will be replaced with data</li>
              <li>• Use "box mode" for text that spans multiple lines</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!text.trim()}
          >
            Add Text
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
