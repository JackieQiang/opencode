export function base64Encode(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(str)
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  let i = 0

  while (i < str.length) {
    const a = str.charCodeAt(i++)
    const b = str.charCodeAt(i++)
    const c = str.charCodeAt(i++)

    const enc1 = a >> 2
    const enc2 = ((a & 3) << 4) | (b >> 4)
    const enc3 = isNaN(b) ? 64 : ((b & 15) << 2) | (c >> 6)
    const enc4 = isNaN(c) ? 64 : c & 63

    result += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4)
  }

  return result
}

export function base64Decode(str: string): string {
  if (typeof atob !== 'undefined') {
    return atob(str)
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  str = str.replace(/[^A-Za-z0-9+/]/g, '')

  for (let i = 0; i < str.length; i += 4) {
    const enc1 = chars.indexOf(str[i])
    const enc2 = chars.indexOf(str[i + 1])
    const enc3 = chars.indexOf(str[i + 2])
    const enc4 = chars.indexOf(str[i + 3])

    const a = (enc1 << 2) | (enc2 >> 4)
    const b = ((enc2 & 15) << 4) | (enc3 >> 2)
    const c = ((enc3 & 3) << 6) | enc4

    result += String.fromCharCode(a)
    if (enc3 !== 64) result += String.fromCharCode(b)
    if (enc4 !== 64) result += String.fromCharCode(c)
  }

  return result
}
