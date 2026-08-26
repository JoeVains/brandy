export function recolorSvg(svgText: string, color: string): string {
  return svgText
    .replace(/(fill|stroke)="(?!none")[^"]*"/gi, `$1="${color}"`)
    .replace(/(fill|stroke):\s*(?!none)[^;"]+/gi, `$1:${color}`);
}
