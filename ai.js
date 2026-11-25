/* ai.js — AI 拍照识别植物（OpenAI 兼容视觉模型接口）
 * 支持 SiliconFlow / 其他 OpenAI 兼容服务商；配置只存本机。
 * 流程：图片压缩为 dataURL -> 发给 VLM -> 返回 JSON {name, scientific, confidence, care, cycle}
 */
(function (global) {
  'use strict'

  var K_ENDPOINT = 'wf_ai_endpoint'
  var K_KEY = 'wf_ai_key'
  var K_MODEL = 'wf_ai_model'

  var DEFAULTS = {
    endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
    model: 'Qwen/Qwen2.5-VL-72B-Instruct'
  }

  function get(k, def) { try { return localStorage.getItem(k) || def } catch (e) { return def } }
  function set(k, v) { try { localStorage.setItem(k, v || '') } catch (e) {} }

  function config() {
    return {
      endpoint: get(K_ENDPOINT, DEFAULTS.endpoint),
      key: get(K_KEY, ''),
      model: get(K_MODEL, DEFAULTS.model)
    }
  }
  function saveConfig(cfg) {
    set(K_ENDPOINT, cfg.endpoint || DEFAULTS.endpoint)
    set(K_KEY, cfg.key || '')
    set(K_MODEL, cfg.model || DEFAULTS.model)
  }
  function configured() { return !!get(K_KEY, '') }

  // 从各种可能的返回文本里提取 JSON
  function parseJSON(text) {
    if (!text) return null
    var s = String(text).trim()
    // 去掉 markdown 代码围栏
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    try { return JSON.parse(s) } catch (e) {}
    var m = s.match(/\{[\s\S]*\}/)
    if (m) { try { return JSON.parse(m[0]) } catch (e) {} }
    return null
  }

  /* 识别图片
   * @param {string} dataUrl 压缩后的图片 dataURL（image/jpeg;base64,...）
   * @returns {Promise<{ok, name, scientific, confidence, care, cycle, raw}>}
   */
  function recognize(dataUrl) {
    var cfg = config()
    if (!cfg.key) return Promise.resolve({ ok: false, error: '请先在设置里填写 AI API Key' })

    var prompt = '你是一位植物学家。请识别照片中的植物，并用严格的 JSON 格式回答（不要输出其他文字）。' +
      '字段：name(中文常用名，字符串)、scientific(拉丁学名，字符串)、confidence(置信度0-1，数字)、' +
      'cycle(建议浇水周期天数，整数)、care(简短养护建议，中文，50字以内)。' +
      '如果无法识别，name 填"未知植物"，confidence 填 0。' +
      '示例：{"name":"绿萝","scientific":"Epipremnum aureum","confidence":0.9,"cycle":7,"care":"喜阴湿，土表干了再浇。"}'

    var body = {
      model: cfg.model,
      messages: [
        { role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]}
      ],
      temperature: 0.2,
      max_tokens: 400
    }

    return new Promise(function (resolve) {
      var timer = setTimeout(function () { resolve({ ok: false, error: '识别超时，请重试' }) }, 30000)
      fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + cfg.key, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 200)) })
        return r.json()
      }).then(function (d) {
        clearTimeout(timer)
        var content = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content
        var parsed = parseJSON(content)
        if (!parsed) return resolve({ ok: false, error: '无法解析识别结果', raw: content })
        resolve({
          ok: true,
          name: parsed.name || '未知植物',
          scientific: parsed.scientific || '',
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
          cycle: parseInt(parsed.cycle, 10) || 7,
          care: parsed.care || '',
          raw: content
        })
      }).catch(function (e) {
        clearTimeout(timer)
        resolve({ ok: false, error: '识别失败：' + (e && e.message ? e.message : String(e)) })
      })
    })
  }

  global.WateringAI = {
    recognize: recognize,
    config: config,
    saveConfig: saveConfig,
    configured: configured,
    DEFAULTS: DEFAULTS
  }
})(window)
