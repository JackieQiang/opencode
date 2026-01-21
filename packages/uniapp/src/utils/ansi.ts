export interface ANSISpan {
  text: string
  style: {
    color?: string
    backgroundColor?: string
    fontWeight?: string
    textDecoration?: string
  }
}

const colorMap: Record<number, string> = {
  0: '#000000',
  1: '#ff0000',
  2: '#00ff00',
  3: '#ffff00',
  4: '#0000ff',
  5: '#ff00ff',
  6: '#00ffff',
  7: '#ffffff',
  8: '#808080',
  9: '#ff8080',
  10: '#80ff80',
  11: '#ffff80',
  12: '#8080ff',
  13: '#ff80ff',
  14: '#80ffff',
  15: '#ffffff',
  30: '#808080',
  31: '#ff0000',
  32: '#00ff00',
  33: '#ffff00',
  34: '#0000ff',
  35: '#ff00ff',
  36: '#00ffff',
  37: '#ffffff',
  90: '#808080',
  91: '#ff0000',
  92: '#00ff00',
  93: '#ffff00',
  94: '#0000ff',
  95: '#ff00ff',
  96: '#00ffff',
  97: '#ffffff',
  40: '#000000',
  41: '#ff0000',
  42: '#00ff00',
  43: '#ffff00',
  44: '#0000ff',
  45: '#ff00ff',
  46: '#00ffff',
  47: '#ffffff',
  100: '#808080',
  101: '#ff0000',
  102: '#00ff00',
  103: '#ffff00',
  104: '#0000ff',
  105: '#ff00ff',
  106: '#00ffff',
  107: '#ffffff',
}

export function parseAnsiLine(line: string): ANSISpan[] {
  const spans: ANSISpan[] = []
  let currentText = ''
  let currentStyle = {
    color: undefined as string | undefined,
    backgroundColor: undefined as string | undefined,
    fontWeight: undefined as string | undefined,
    textDecoration: undefined as string | undefined,
  }

  const resetStyle = () => {
    currentStyle = {
      color: undefined,
      backgroundColor: undefined,
      fontWeight: undefined,
      textDecoration: undefined,
    }
  }

  const pushCurrentText = () => {
    if (currentText) {
      spans.push({
        text: currentText,
        style: { ...currentStyle },
      })
      currentText = ''
    }
  }

  const regex = /\x1b\[(\d*(?:;\d*)*)m/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(line)) !== null) {
    currentText += line.slice(lastIndex, match.index)

    if (currentText) {
      pushCurrentText()
    }

    const codes = match[1].split(';').filter(Boolean).map(Number)

    for (const code of codes) {
      if (code === 0) {
        resetStyle()
      } else if (code === 1) {
        currentStyle.fontWeight = 'bold'
      } else if (code === 3) {
        currentStyle.fontWeight = 'italic'
      } else if (code === 4) {
        currentStyle.textDecoration = 'underline'
      } else if (code === 9) {
        currentStyle.textDecoration = 'line-through'
      } else if (code === 22) {
        currentStyle.fontWeight = 'normal'
      } else if (code === 23) {
        currentStyle.fontWeight = 'normal'
        currentStyle.fontWeight = undefined
      } else if (code === 24) {
        currentStyle.textDecoration = undefined
      } else if (code === 29) {
        currentStyle.textDecoration = undefined
      } else if (code >= 30 && code <= 37) {
        currentStyle.color = colorMap[code]
      } else if (code >= 40 && code <= 47) {
        currentStyle.backgroundColor = colorMap[code]
      } else if (code >= 90 && code <= 97) {
        currentStyle.color = colorMap[code]
      } else if (code >= 100 && code <= 107) {
        currentStyle.backgroundColor = colorMap[code]
      }
    }

    lastIndex = regex.lastIndex
  }

  currentText += line.slice(lastIndex)
  if (currentText) {
    pushCurrentText()
  }

  if (spans.length === 0 && line) {
    spans.push({
      text: line,
      style: {},
    })
  }

  return spans
}

export function stripAnsi(line: string): string {
  return line.replace(/\x1b\[[\d;]*m/g, '')
}

export function processOutput(output: string[]): ANSISpan[][] {
  return output.map(line => parseAnsiLine(line))
}
