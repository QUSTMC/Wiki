import ts from '../vendor/misode/node_modules/typescript/lib/typescript.js';

const attributes = new Set(['title', 'desc', 'placeholder', 'aria-label', 'label', 'alt']);
/** Only JSX text/display attributes, never values, data keys, event handlers or URLs. */
export function translateStaticJsx(code, id, translations, importPath) {
  if (!id.replaceAll('\\', '/').includes('/src/app/') || !/\.tsx?$/.test(id.split('?')[0])) return null;
  const ast = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const replacements = [];
  function visit(node) {
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim();
      if (translations.has(text)) {
        const leading = /^\s/.test(node.text) ? ' ' : '', trailing = /\s$/.test(node.text) ? ' ' : '';
        replacements.push({ start: node.getFullStart(), end: node.end, value: `{${JSON.stringify(leading)} + qustDisplayText(${JSON.stringify(text)}, 'ui') + ${JSON.stringify(trailing)}}` });
      }
    }
    if (ts.isJsxAttribute(node) && attributes.has(node.name.getText(ast)) && node.initializer && ts.isStringLiteral(node.initializer) && translations.has(node.initializer.text)) {
      replacements.push({ start: node.initializer.getStart(ast), end: node.initializer.end, value: `{qustDisplayText(${JSON.stringify(node.initializer.text)}, 'ui')}` });
    }
    if (ts.isNewExpression(node) && node.expression.getText(ast) === 'Error') {
      for (const arg of node.arguments || []) if ((ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) && translations.has(arg.text)) {
        replacements.push({ start: arg.getStart(ast), end: arg.end, value: `qustDisplayText(${JSON.stringify(arg.text)}, 'ui')` });
      }
    }
    if (ts.isPropertyAssignment(node) && ['label', 'tooltip', 'placeholder'].includes(node.name.getText(ast)) && ts.isStringLiteral(node.initializer) && translations.has(node.initializer.text)) {
      replacements.push({ start: node.initializer.getStart(ast), end: node.initializer.end, value: `qustDisplayText(${JSON.stringify(node.initializer.text)}, 'ui')` });
    }
    if (ts.isTemplateExpression(node) && ts.isBinaryExpression(node.parent) && node.parent.left.getText(ast).endsWith('.message')) {
      const source = node.head.text + node.templateSpans.map((span,i)=>`%${i}%` + span.literal.text).join('');
      if (translations.has(source)) replacements.push({ start: node.getStart(ast), end: node.end,
        value: `qustDisplayPattern(${JSON.stringify(source)}, [${node.templateSpans.map(span=>span.expression.getText(ast)).join(', ')}])` });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!replacements.length) return null;
  for (const r of replacements.sort((a,b)=>b.start-a.start)) code = code.slice(0,r.start)+r.value+code.slice(r.end);
  return `import { translateDisplay as qustDisplayText, translatePattern as qustDisplayPattern } from ${JSON.stringify(importPath)};\n`+code;
}
