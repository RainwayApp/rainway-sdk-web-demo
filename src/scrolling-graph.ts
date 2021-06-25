export interface GraphConfig {
    min?: number;
    max?: number;
    x: number;
    y: number;
    width: number;
    height: number;
    fillStyle?: string;
    lineWidth?: number;
    dataStrokeStyle?: string;
    helperLineStrokeStyle?: string;
    helperLineFont?: string;
    caption?: string;
    captionFont?: string;
    unit?: string;
    helperLines?: number;
}

//const minValue = (values: number[]) => values.reduce((a, b) => Math.min())

export const drawGraph = (
    ctx: CanvasRenderingContext2D,
    samples: number[],
    config: GraphConfig,
) => {
    ctx.save();
    const {
        min = Math.min(...samples),
        max = Math.max(...samples),
        x: x0,
        y: y0,
        width,
        height,
        unit = "",
        fillStyle = "#eeeeee",
        lineWidth = 1,
        dataStrokeStyle = "#ff0000",
        helperLineStrokeStyle = "#bbbbbb",
        helperLineFont = "12px sans-serif",
        caption = "",
        captionFont = "bold 16px sans-serif",
        helperLines = 1,
    } = config;

    const n = samples.length;
    const value = samples[n - 1];

    ctx.fillStyle = fillStyle;
    ctx.fillRect(x0, y0, x0 + width, y0 + height);
    for (let i = 1; i <= helperLines; i++) {
        const lineFrac = i / helperLines;
        const lineValue = min + lineFrac * (max - min);
        const y = y0 + (1 - lineFrac) * height;
        const x = x0;
        ctx.strokeStyle = helperLineStrokeStyle;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.stroke();
        ctx.font = helperLineFont;
        ctx.textAlign = "start";
        ctx.textBaseline = "top";
        ctx.fillStyle = helperLineStrokeStyle;
        ctx.fillText(`${lineValue || 0} ${unit}`, x + 4, y + 2);
    }
    ctx.beginPath();
    const x = x0;
    const y = y0 + (1.0 - (samples[0] - min) / (max - min)) * height;
    ctx.moveTo(x, y);
    ctx.lineWidth = lineWidth;
    for (let i = 1; i < n; i++) {
        const x = x0 + (i / (n - 1)) * width;
        const y = y0 + (1.0 - (samples[i] - min) / (max - min)) * height;
        ctx.lineTo(x, y);
    }
    ctx.strokeStyle = dataStrokeStyle;
    ctx.stroke();

    ctx.font = captionFont;
    ctx.textBaseline = "top";
    ctx.textAlign = "end";
    ctx.fillStyle = helperLineStrokeStyle;
    ctx.fillText(caption, width - 4, 2);
    ctx.fillText(`${value.toFixed(1)} ${unit}`, width - 4, 2 + 16);
    ctx.restore();
};
