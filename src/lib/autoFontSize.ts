/**
 * Auto Font Size utility for Fabric.js textboxes
 * Automatically adjusts font size to fit text within a fixed bounding box
 */

interface AutoFontSizeOptions {
  minFontSize?: number;
  maxFontSize?: number;
  step?: number;
}

/**
 * Calculate the pixel height occupied by text when wrapped into lines.
 *
 * This function performs a simple word-by-word wrap simulation using the
 * provided 2D canvas context to measure each candidate line. It returns the
 * total height in pixels based on the supplied fontSize and lineHeight.
 *
 * @param {string} text - The text content to measure
 * @param {number} fontSize - Font size in pixels used for measurement
 * @param {string} fontFamily - Font family (e.g. 'Arial')
 * @param {string} fontWeight - Font weight (e.g. 'normal'|'bold')
 * @param {string} fontStyle - Font style (e.g. 'normal'|'italic')
 * @param {number} lineHeight - Line height multiplier (e.g. 1.2)
 * @param {number} maxWidth - Maximum line width in pixels for wrapping
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context used for measureText
 * @returns {number} Total height in pixels required to render the wrapped text
 */
function calculateWrappedTextHeight(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: string,
  fontStyle: string,
  lineHeight: number,
  maxWidth: number,
  ctx: CanvasRenderingContext2D
): number {
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  
  const words = text.split(' ');
  let currentLine = '';
  let lines = 0;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine !== '') {
      // Start a new line
      lines++;
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  
  // Add 1 for the last line
  if (currentLine !== '') lines++;
  
  // Return total height: lines * (fontSize * lineHeight)
  return lines > 0 ? lines * fontSize * lineHeight : fontSize * lineHeight;
}

/**
 * Calculate the optimal font size for a Fabric.js textbox so that its text
 * fits within the object's bounding box. The algorithm uses a binary search
 * between `minFontSize` and `maxFontSize` and measures text dimensions via
 * a temporary canvas context for precision.
 *
 * The function respects the textbox's `splitByGrapheme`/wrapping setting and
 * accounts for `lineHeight` and scale factors on the object.
 *
 * @param {any} textbox - Fabric.js textbox object (may include font properties)
 * @param {AutoFontSizeOptions} [options] - Optional configuration for min/max size
 * @returns {number} The calculated optimal font size in pixels
 */
export function calculateOptimalFontSize(
  textbox: any,
  options: AutoFontSizeOptions = {}
): number {
  const { minFontSize = 8, maxFontSize = 200, step = 1 } = options;
  
  if (!textbox || !textbox.text) return textbox?.fontSize || 16;
  
  const text = textbox.text;
  const fixedWidth = (textbox.width || 100) * (textbox.scaleX || 1);
  const fixedHeight = (textbox.height || 50) * (textbox.scaleY || 1);
  
  // Check if word wrap is enabled (splitByGrapheme property in Fabric v6)
  const wordWrapEnabled = textbox.splitByGrapheme !== false;
  
  // Create a temporary canvas for accurate text measurement
  const tempCanvas = document.createElement('canvas');
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) return textbox.fontSize || 16;
  
  const fontFamily = textbox.fontFamily || 'Arial';
  const fontWeight = textbox.fontWeight || 'normal';
  const fontStyle = textbox.fontStyle || 'normal';
  const lineHeight = textbox.lineHeight || 1.2;
  
  // Binary search for optimal font size
  let low = minFontSize;
  let high = maxFontSize;
  let optimalSize = minFontSize;
  
  while (low <= high) {
    const testSize = Math.floor((low + high) / 2);
    
    // Set canvas font to match textbox styling
    ctx.font = `${fontStyle} ${fontWeight} ${testSize}px ${fontFamily}`;
    
    let requiredWidth = 0;
    let requiredHeight = 0;
    const padding = 4;
    
    if (wordWrapEnabled) {
      // Calculate wrapped text height
      requiredHeight = calculateWrappedTextHeight(
        text,
        testSize,
        fontFamily,
        fontWeight,
        fontStyle,
        lineHeight,
        fixedWidth - padding,
        ctx
      );
      requiredWidth = fixedWidth; // Takes full width when wrapped
    } else {
      // Single line - measure as before
      const metrics = ctx.measureText(text);
      requiredWidth = metrics.width + padding;
      requiredHeight = testSize * lineHeight + padding;
    }
    
    // Check if text fits within bounds
    const fitsWidth = requiredWidth <= fixedWidth;
    const fitsHeight = requiredHeight <= fixedHeight;
    
    if (fitsWidth && fitsHeight) {
      optimalSize = testSize;
      low = testSize + step;
    } else {
      high = testSize - step;
    }
  }
  
  return Math.max(minFontSize, optimalSize);
}

/**
 * Apply calculated auto font size to a textbox when the object's
 * `data.autoFontSize` flag is set. This updates the object's `fontSize`
 * and requests a re-render on the canvas.
 *
 * @param {any} textbox - Fabric.js textbox object
 * @param {any} canvas - Fabric.js canvas instance to request render on
 * @returns {void}
 */
export function applyAutoFontSize(textbox: any, canvas: any): void {
  if (!textbox || !canvas) return;
  if (!textbox.data?.autoFontSize) return;
  
  const optimalSize = calculateOptimalFontSize(textbox, {
    minFontSize: 8,
    maxFontSize: textbox.data?.maxFontSize || 200,
  });
  
  textbox.set('fontSize', optimalSize);
  canvas.requestRenderAll();
}

/**
 * Register event listeners on a Fabric.js canvas to automatically
 * re-calculate and apply auto font sizes for text objects when their
 * content or editing state changes.
 *
 * The function returns a cleanup function that will remove the registered
 * listeners when called.
 *
 * @param {any} canvas - Fabric.js canvas instance
 * @returns {() => void} Cleanup function to unregister listeners
 */
export function setupAutoFontSizeListeners(canvas: any): () => void {
  if (!canvas) return () => {};
  
  const handleTextChange = (e: any) => {
    const textbox = e.target;
    if (!textbox) return;
    if (textbox.type !== 'textbox' && textbox.type !== 'i-text') return;
    
    applyAutoFontSize(textbox, canvas);
  };
  
  const handleTextEditingExited = (e: any) => {
    const textbox = e.target;
    if (!textbox) return;
    if (textbox.type !== 'textbox' && textbox.type !== 'i-text') return;
    
    applyAutoFontSize(textbox, canvas);
  };
  
  // Listen for text changes
  canvas.on('text:changed', handleTextChange);
  canvas.on('text:editing:exited', handleTextEditingExited);
  
  // Return cleanup function
  return () => {
    canvas.off('text:changed', handleTextChange);
    canvas.off('text:editing:exited', handleTextEditingExited);
  };
}
