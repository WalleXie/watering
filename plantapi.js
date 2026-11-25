/* plantapi.js — 联网获取植物基本信息（可选，失败不影响本地功能）
 * 数据源：
 *   1) iNaturalist —— 完全免费、无需 key，提供学名/英文名/照片/维基链接（无浇水频次）
 *   2) Perenual —— 免费注册 key，提供浇水频次 watering_general_benchmark（可选填 key）
 * 设计：内置中文库优先（离线）；联网只作补充；任何失败都静默降级。
 */
(function (global) {
  'use strict'

  // 在设置里可填 Perenual 免费 key（https://perenual.com/user/developer）
  var KEY_STORE = 'wf_perenual_key'
  function getKey() { try { return localStorage.getItem(KEY_STORE) || '' } catch (e) { return '' } }
  function setKey(k) { try { localStorage.setItem(KEY_STORE, k || '') } catch (e) {} }

  function getJSON(url, timeout) {
    return new Promise(function (resolve, reject) {
      var done = false
      var timer = setTimeout(function () { if (!done) { done = true; reject(new Error('请求超时')) } }, timeout || 8000)
      fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
        .then(function (d) { if (!done) { done = true; clearTimeout(timer); resolve(d) } })
        .catch(function (e) { if (!done) { done = true; clearTimeout(timer); reject(e) } })
    })
  }

  // 浇水频次文字 -> 天数映射
  function wateringToDays(level) {
    var m = { frequent: 3, average: 7, minimum: 14, none: 30 }
    return m[String(level || '').toLowerCase()] || 7
  }

  /* iNaturalist 搜索：返回统一结构
   * { name, scientific, photo, wiki, source:'inaturalist', cycle:null, watering:'' }
   */
  function searchINat(keyword) {
    var q = encodeURIComponent(keyword.trim())
    var url = 'https://api.inaturalist.org/v1/taxa?q=' + q + '&rank=species&per_page=8'
    return getJSON(url).then(function (d) {
      var list = (d.results || []).filter(function (t) {
        return t.iconic_taxon_name === 'Plantae' || /plant|植物/i.test(t.iconic_taxon_name || '')
      })
      return list.map(function (t) {
        var photo = t.default_photo && (t.default_photo.medium_url || t.default_photo.square_url)
        return {
          name: t.preferred_common_name || t.name,
          scientific: t.name,
          photo: photo || '',
          wiki: t.wikipedia_url || '',
          watering: '',
          cycle: null,
          source: 'inaturalist'
        }
      })
    })
  }

  /* Perenual 搜索（需 key）：返回带浇水频次的结构 */
  function searchPerenual(keyword) {
    var key = getKey()
    if (!key) return Promise.resolve([])
    var q = encodeURIComponent(keyword.trim())
    var url = 'https://perenual.com/api/v2/species-list?key=' + encodeURIComponent(key) + '&q=' + q
    return getJSON(url).then(function (d) {
      return (d.data || []).slice(0, 8).map(function (p) {
        var img = p.default_image && (p.default_image.medium_url || p.default_image.small_url || p.default_image.thumbnail)
        return {
          id: p.id,
          name: p.common_name || '',
          scientific: (p.scientific_name || []).join(', '),
          photo: img || '',
          watering: p.watering || '',
          cycle: wateringToDays(p.watering),
          source: 'perenual'
        }
      })
    }).catch(function () { return [] })
  }

  /* Perenual 详情：拿到精确浇水天数，如 "5-7 days" -> 取均值 6 */
  function detailPerenual(id) {
    var key = getKey()
    if (!key) return Promise.resolve(null)
    return getJSON('https://perenual.com/api/v2/species/details/' + id + '?key=' + encodeURIComponent(key)).then(function (p) {
      var bench = p.watering_general_benchmark
      var cycle = null
      var txt = ''
      if (bench) {
        var v = bench.value
        if (typeof v === 'string') {
          var nums = v.match(/\d+/g)
          if (nums && nums.length) {
            var vals = nums.map(Number)
            cycle = Math.round(vals.reduce(function (a, b) { return a + b }, 0) / vals.length)
          }
          txt = v + ' ' + (bench.unit || 'days')
        } else if (typeof v === 'number') {
          cycle = v
          txt = v + ' ' + (bench.unit || 'days')
        }
      }
      var img = p.default_image && (p.default_image.medium_url || p.default_image.small_url)
      return {
        name: p.common_name || '',
        scientific: (p.scientific_name || []).join(', '),
        photo: img || '',
        watering: p.watering || '',
        wateringText: txt,
        cycle: cycle || wateringToDays(p.watering),
        sunlight: (p.sunlight || []).join('、'),
        description: p.description || '',
        source: 'perenual'
      }
    }).catch(function () { return null })
  }

  /* 综合搜索：两个源合并，Perenual 在前（有频次），iNat 兜底 */
  function search(keyword) {
    if (!keyword || !keyword.trim()) return Promise.resolve([])
    return Promise.all([
      searchPerenual(keyword),
      searchINat(keyword).catch(function () { return [] })
    ]).then(function (res) {
      var perenual = res[0] || []
      var inat = res[1] || []
      // 去重：按学名/名称
      var seen = {}
      var out = []
      perenual.concat(inat).forEach(function (p) {
        var k = (p.scientific || p.name || '').toLowerCase()
        if (k && seen[k]) return
        if (k) seen[k] = true
        out.push(p)
      })
      return out
    })
  }

  global.WateringPlantApi = {
    search: search,
    detailPerenual: detailPerenual,
    getKey: getKey,
    setKey: setKey,
    hasKey: function () { return !!getKey() }
  }
})(window)
