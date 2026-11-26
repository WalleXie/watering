/* workbuddy.js — 借助 WorkBuddy 识别花草（曲线方案，无需后端、无需 Key）
 * 流程：
 *   1) 点「复制提问词」把提示词复制到剪贴板
 *   2) 点「复制照片」把照片复制到剪贴板（不支持时可「下载照片」）
 *   3) 到 WorkBuddy 粘贴提问 + 照片，让它识别
 *   4) 把 WorkBuddy 的回答粘贴回本页，点「解析并填入」
 * 解析：优先 JSON，失败则从中文自由文本里提取关键信息。
 */
(function (global) {
  'use strict'

  var PROMPT = [
    '请识别我发来的照片中的植物，并用中文回答。',
    '请严格按下面的 JSON 格式输出（只输出 JSON，不要其他文字），方便我导入小程序：',
    '',
    '{',
    '  "name": "中文常用名",',
    '  "scientific": "拉丁学名",',
    '  "family": "科名（如：天南星科）",',
    '  "cycle": 7,',
    '  "light": "光照需求（简短）",',
    '  "toxic": "是否有毒/可否食用（简短）",',
    '  "care": "养护要点（50字以内）"',
    '}',
    '',
    '其中 cycle 是建议浇水周期天数（整数）。如果无法识别，name 填"未知植物"。'
  ].join('\n')

  function buildPrompt() { return PROMPT }

  // 复制文字（带兼容回退）
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true }).catch(function () { return fallbackCopy(text) })
    }
    return Promise.resolve(fallbackCopy(text))
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      var ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch (e) { return false }
  }

  // dataURL -> Blob
  function dataUrlToBlob(dataUrl) {
    var parts = String(dataUrl).split(',')
    var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/png'
    var bstr = atob(parts[1] || '')
    var n = bstr.length
    var u8 = new Uint8Array(n)
    while (n--) u8[n] = bstr.charCodeAt(n)
    return new Blob([u8], { type: mime })
  }

  // 复制图片（浏览器支持时）
  function copyImage(dataUrl) {
    if (!dataUrl) return Promise.resolve(false)
    if (!navigator.clipboard || !navigator.clipboard.write || typeof ClipboardItem === 'undefined') {
      return Promise.resolve(false)
    }
    try {
      var blob = dataUrlToBlob(dataUrl)
      var item = new ClipboardItem({ 'image/png': blob })
      return navigator.clipboard.write([item]).then(function () { return true }).catch(function () { return false })
    } catch (e) { return Promise.resolve(false) }
  }

  // 下载照片（兜底）
  function downloadImage(dataUrl, name) {
    if (!dataUrl) return false
    try {
      var blob = dataUrlToBlob(dataUrl)
      var url = URL.createObjectURL(blob)
      var a = document.createElement('a')
      a.href = url
      a.download = name || ('花草照片-' + Date.now() + '.png')
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
      return true
    } catch (e) { return false }
  }

  // 从自由文本里提取关键信息（兜底）
  function extractFreeText(text) {
    var out = {}
    var t = String(text || '')
    // 花名：常见模式
    var namePatterns = [
      /(?:识别结果|这是|这是|应该是|植物名称|花名|名称)[：:是为]?\s*([^\s，。,\n]{2,10})/,
      /([一-龥]{2,8})(?:花|草|兰|竹|树|萝|莲|葵|薇|莉)/
    ]
    for (var i = 0; i < namePatterns.length; i++) {
      var m = t.match(namePatterns[i])
      if (m) { out.name = m[1]; break }
    }
    // 科名（去掉"属于/是"等前缀）
    var fam = t.match(/(?:属于|是)?\s*([一-龥]{2,10}科)/)
    if (fam) out.family = fam[1]
    // 周期：每N天 / N天浇 / 周期N天 / 5-7天
    var cyc = t.match(/(?:每\s*|周期\s*|大约\s*|约\s*)?(\d{1,2})\s*(?:-) ?(\d{1,2})?\s*天/)
    if (cyc) out.cycle = parseInt(cyc[2] || cyc[1], 10)
    // 光照
    var light = t.match(/(喜光|喜阳|耐阴|喜阴|半阴|散射光|明亮散射光|全日照)/)
    if (light) out.light = light[1]
    // 毒性
    if (/微毒|有毒|毒性|勿食|避免误食/.test(t)) out.toxic = '有毒/避免误食'
    else if (/无毒|可食用/.test(t)) out.toxic = '无毒/可食用'
    return out
  }

  // 解析 WorkBuddy 回答
  function parseResult(text) {
    var raw = String(text || '').trim()
    if (!raw) return { ok: false, error: '请先粘贴 WorkBuddy 的回答' }

    var json = null
    // 1) 严格 JSON
    try { json = JSON.parse(raw) } catch (e) {}
    // 2) ```json ... ``` 围栏
    if (!json) {
      var fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
      if (fence) { try { json = JSON.parse(fence[1]) } catch (e) {} }
    }
    // 3) 第一个 { ... }
    if (!json) {
      var obj = raw.match(/\{[\s\S]*\}/)
      if (obj) { try { json = JSON.parse(obj[0]) } catch (e) {} }
    }

    var d = {}
    if (json) {
      d = {
        name: json.name || '',
        scientific: json.scientific || '',
        family: json.family || '',
        cycle: parseInt(json.cycle, 10) || 0,
        light: json.light || '',
        toxic: json.toxic || '',
        care: json.care || ''
      }
    } else {
      d = extractFreeText(raw)
      d.care = raw.length > 80 ? raw.slice(0, 80) : raw
    }

    if (!d.name || d.name === '未知植物') {
      // 仍允许返回文本，让用户手动填名称
      d.name = d.name || ''
    }
    d.ok = true
    d.raw = raw
    d.info = {
      family: d.family || '',
      light: d.light || '',
      toxic: d.toxic || '',
      extra: d.care || ''
    }
    return d
  }

  global.WorkingBuddy = {
    buildPrompt: buildPrompt,
    copyText: copyText,
    copyImage: copyImage,
    downloadImage: downloadImage,
    parseResult: parseResult
  }
})(window)
