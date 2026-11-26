/* app.js — 浇花打卡 PWA 主逻辑（纯本地） */
(function () {
  'use strict'

  var Store = window.WateringStore
  var Plants = window.WateringPlants
  var S = { items: [], records: [] }
  var currentTab = 'home'

  var main = document.getElementById('main')
  var fab = document.getElementById('fabAdd')
  var titleEl = document.getElementById('pageTitle')
  var modalRoot = document.getElementById('modalRoot')
  var toastEl = document.getElementById('toast')

  var TITLES = { home: '🌿 浇花打卡', plants: '🌿 我的花草', calendar: '📅 日历', stats: '📊 统计', settings: '⚙️ 设置' }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n }
  function fmt(ts, withTime) {
    if (!ts) return '—'
    var d = new Date(ts)
    var s = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    return withTime ? s + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : s
  }
  function daysBetween(a, b) { return Math.round((new Date(fmt(b)) - new Date(fmt(a))) / 86400000) }
  function toast(msg) {
    toastEl.textContent = msg
    toastEl.classList.add('show')
    clearTimeout(toast._t)
    toast._t = setTimeout(function () { toastEl.classList.remove('show') }, 2000)
  }
  function persist(label) {
    return Store.save(S, label).then(function () { render() })
  }

  // 关键信息卡片（识别/选择花草后展示）
  function infoCard(p) {
    var info = p.info || {}
    var rows = ''
    if (p.family || info.family) rows += '<div>科属：' + esc(p.family || info.family) + '</div>'
    rows += '<div>浇水：建议每 ' + (p.cycle || 7) + ' 天一次' + (info.extra ? ' · ' + esc(info.extra) : '') + '</div>'
    if (p.light || info.light) rows += '<div>光照：' + esc(p.light || info.light) + '</div>'
    if (p.toxic || info.toxic) rows += '<div>毒性：' + esc(p.toxic || info.toxic) + '</div>'
    var head = '✅ 识别为 <b>' + esc(p.name || '未知植物') + '</b>'
    if (typeof p.confidence === 'number') head += ' · 置信度 ' + Math.round(p.confidence * 100) + '%'
    return '<div style="background:var(--primary-light);border-radius:10px;padding:12px;line-height:1.8;font-size:13px">' + head + '<div class="divider" style="margin:8px 0"></div>' + rows + '</div>'
  }

  // ---------- 派生 ----------
  function pending() {
    return S.items.filter(function (i) { return i.active !== false }).map(function (item) {
      var last = lastRecord(item.id)
      var cycle = item.customCycleDays || 7
      // 有打卡记录用最近一次；否则用用户填的"上次浇水日期"；再否则用添加日
      var lastAt = last ? last.checkedAt : (item.lastWateredAt || item.createdAt || Date.now())
      var nextAt = lastAt + cycle * 86400000
      var dueDays = Math.ceil((nextAt - Date.now()) / 86400000)
      var o = Object.assign({}, item, { lastAt: lastAt, nextAt: nextAt, cycle: cycle, dueDays: dueDays, overdue: dueDays < 0 })
      return o
    }).sort(function (a, b) { return a.dueDays - b.dueDays })
  }
  function lastRecord(itemId) {
    return S.records.filter(function (r) { return r.itemId === itemId })
      .sort(function (a, b) { return b.checkedAt - a.checkedAt })[0] || null
  }
  function streak() {
    var days = {}
    S.records.forEach(function (r) { days[fmt(r.checkedAt)] = true })
    var n = 0, d = new Date()
    while (days[fmt(d.getTime())]) { n++; d = new Date(d.getTime() - 86400000) }
    return n
  }

  // 生成一张花草卡片（首页/花草列表通用）
  function flowerCard(p, opts) {
    opts = opts || {}
    var tag = p.overdue ? '<span class="tag tag-danger">逾期 ' + Math.abs(p.dueDays) + ' 天</span>'
      : (p.dueDays === 0 ? '<span class="tag tag-warn">今天该浇了</span>' : '<span class="tag">' + p.dueDays + ' 天后</span>')
    var h = '<div class="card" data-open="' + esc(p.id) + '"><div class="row">' +
      (p.avatar ? '<img class="avatar" src="' + esc(p.avatar) + '" />' : '<div class="avatar"></div>') +
      '<div class="col flex1"><div class="row between"><span class="title">' + esc(p.name) + '</span>' + tag + '</div>' +
      '<div class="muted">上次：' + fmt(p.lastAt) + ' · 每 ' + p.cycle + ' 天</div>' +
      (opts.showNext !== false ? '<div class="muted">下次浇水：' + fmt(p.nextAt) + '</div>' : '') +
      '</div></div>'
    if (opts.actions !== false) {
      h += '<div class="divider"></div><div class="row between"><span class="muted">下次建议 ' + fmt(p.nextAt) + '</span>' +
        '<div class="row" style="gap:8px">' +
        '<button class="btn btn-ghost" data-edit="' + esc(p.id) + '">编辑</button>' +
        '<button class="btn btn-primary" data-checkin="' + esc(p.id) + '">浇水打卡</button></div></div>' +
        '<div class="row" style="justify-content:flex-end;margin-top:8px">' +
        '<button class="muted" data-del="' + esc(p.id) + '" style="background:none;border:none;font-size:12px">删除</button></div>'
    }
    return h + '</div>'
  }

  // ---------- 视图：首页（按日期分组：近三天 + 逾期） ----------
  function viewHome() {
    var list = pending()
    var h = ''
    if (Store.needBackup()) {
      h += '<div class="warn-banner"><span>好久没备份啦，建议保存一份数据</span><button id="warnBackup">立即备份</button></div>'
    }
    h += '<div class="card summary"><div class="col"><div class="title">我的花草</div><div class="muted">共 ' + S.items.length + ' 盆 · 待办 ' + list.length + ' 项</div></div>' +
      '<div class="stat-grid"><div><div class="stat-num">' + streak() + '</div><div class="muted">连续天数</div></div>' +
      '<div><div class="stat-num">' + S.records.length + '</div><div class="muted">累计打卡</div></div></div></div>'

    // 分组：逾期 / 今天 / 明天 / 后天 / 更晚
    var groups = [
      { key: 'overdue', label: '⚠️ 已逾期（该浇水了）', test: function (p) { return p.overdue } },
      { key: 'today', label: '📌 今天 (' + fmt(Date.now()) + ')', test: function (p) { return !p.overdue && p.dueDays === 0 } },
      { key: 'tomorrow', label: '🗓 明天 (' + fmt(Date.now() + 86400000) + ')', test: function (p) { return p.dueDays === 1 } },
      { key: 'dayafter', label: '🗓 后天 (' + fmt(Date.now() + 2 * 86400000) + ')', test: function (p) { return p.dueDays === 2 } },
      { key: 'later', label: '🌱 更晚（3 天后及以上）', test: function (p) { return p.dueDays >= 3 } }
    ]
    h += '<div class="section-title">待浇水（按日期）</div>'
    var any = false
    groups.forEach(function (g) {
      var items = list.filter(g.test)
      if (!items.length) return
      any = true
      h += '<div class="section-title" style="font-size:14px;color:var(--primary)">' + g.label + ' · ' + items.length + ' 盆</div>'
      items.forEach(function (p) { h += flowerCard(p) })
    })
    if (!any) h += '<div class="card empty">还没有花草，点右下角 ＋ 添加吧 🌱</div>'
    return h
  }

  // ---------- 视图：花草列表 ----------
  function viewPlants() {
    var list = pending()
    var h = '<div class="section-title">全部花草（共 ' + list.length + ' 盆）</div>'
    if (!list.length) return h + '<div class="card empty">还没有花草，点右下角 ＋ 添加吧 🌱</div>'
    list.forEach(function (p) { h += flowerCard(p, { showNext: true }) })
    return h
  }

  // ---------- 视图：日历 ----------
  var cal = { y: 0, m: 0, sel: '' }
  function viewCalendar() {
    var now = new Date()
    if (!cal.y) { cal.y = now.getFullYear(); cal.m = now.getMonth() + 1; cal.sel = fmt(now.getTime()) }
    var checked = {}
    S.records.forEach(function (r) { checked[fmt(r.checkedAt)] = true })
    var first = new Date(cal.y, cal.m - 1, 1)
    var startDow = first.getDay()
    var daysInMonth = new Date(cal.y, cal.m, 0).getDate()
    var daysInPrev = new Date(cal.y, cal.m - 1, 0).getDate()
    var cells = []
    for (var i = 0; i < 42; i++) {
      var d, m, y, other = false
      if (i < startDow) { d = daysInPrev - startDow + 1 + i; m = cal.m - 1; other = true }
      else if (i >= startDow + daysInMonth) { d = i - startDow - daysInMonth + 1; m = cal.m + 1; other = true }
      else { d = i - startDow + 1; m = cal.m }
      y = cal.y
      if (m < 1) { m = 12; y-- }
      if (m > 12) { m = 1; y++ }
      var key = y + '-' + pad(m) + '-' + pad(d)
      cells.push({ key: key, day: d, other: other, checked: !!checked[key], today: key === fmt(Date.now()) })
    }
    var h = '<div class="card"><div class="row between" style="margin-bottom:12px">' +
      '<button class="nav-btn" data-cal="prev">‹</button><div class="title">' + cal.y + ' 年 ' + cal.m + ' 月</div>' +
      '<button class="nav-btn" data-cal="next">›</button></div><div class="day-grid">'
    ;['日', '一', '二', '三', '四', '五', '六'].forEach(function (w) { h += '<div class="week-cell">' + w + '</div>' })
    cells.forEach(function (c) {
      h += '<div class="day-cell' + (c.other ? ' other' : '') + (c.today ? ' today' : '') + '" data-day="' + c.key + '">' +
        '<span>' + c.day + '</span>' + (c.checked ? '<span class="dot"></span>' : '') + '</div>'
    })
    h += '</div></div>'
    var recs = S.records.filter(function (r) { return fmt(r.checkedAt) === cal.sel })
    h += '<div class="card"><div class="row between"><div class="title">' + cal.sel + ' 的记录</div><span class="tag">连续 ' + streak() + ' 天</span></div><div class="divider"></div>'
    if (!recs.length) h += '<div class="muted">当天没有打卡记录</div>'
    recs.forEach(function (r) {
      var item = S.items.filter(function (i) { return i.id === r.itemId })[0]
      h += '<div class="list-item row between"><span class="muted">' + fmt(r.checkedAt, true) + '</span><span>' + esc(item ? item.name : '已删除') + '</span></div>'
    })
    h += '</div>'
    return h
  }

  // ---------- 视图：统计 ----------
  function viewStats() {
    var counts = {}
    S.records.forEach(function (r) { counts[r.itemId] = (counts[r.itemId] || 0) + 1 })
    var max = Math.max.apply(null, [1].concat(Object.keys(counts).map(function (k) { return counts[k] })))
    var h = '<div class="card"><div class="title">打卡概览</div><div class="stat-grid" style="margin-top:14px">' +
      '<div><div class="stat-num">' + S.records.length + '</div><div class="muted">累计打卡</div></div>' +
      '<div><div class="stat-num">' + S.items.length + '</div><div class="muted">花草数量</div></div>' +
      '<div><div class="stat-num">' + streak() + '</div><div class="muted">连续天数</div></div></div></div>'
    h += '<div class="card"><div class="title">各花草打卡次数</div><div class="divider"></div>'
    if (!S.items.length) h += '<div class="muted">暂无数据</div>'
    S.items.slice().sort(function (a, b) { return (counts[b.id] || 0) - (counts[a.id] || 0) }).forEach(function (i) {
      var c = counts[i.id] || 0
      h += '<div style="margin:12px 0"><div class="row between"><span>' + esc(i.name) + '</span><span class="muted">' + c + ' 次</span></div>' +
        '<div class="bar-bg"><div class="bar-fill" style="width:' + Math.round(c / max * 100) + '%"></div></div></div>'
    })
    h += '</div>'
    h += '<div class="card"><div class="title">数据保护</div><div class="divider"></div>' +
      '<div class="muted">数据只存在这台设备，不上传任何服务器。已启用双份存储 + 自动快照（最近 20 份），可在设置里恢复。</div>' +
      '<div style="margin-top:14px"><button class="btn btn-primary btn-block" id="statBackup">💾 立即备份（保存到文件）</button></div></div>'
    return h
  }

  // ---------- 视图：设置 ----------
  function viewSettings() {
    var last = Store.lastBackupAt()
    return '<div class="card"><div class="title">数据备份</div><div class="divider"></div>' +
      '<div class="muted">上次备份：' + (last ? fmt(last, true) : '从未备份') + '</div>' +
      '<div class="muted" style="margin-top:6px">建议每周备份一次，把 JSON 文件存到「文件」App 或发给自己。</div>' +
      '<button class="btn btn-primary btn-block" id="setBackup" style="margin-top:14px">💾 导出备份文件</button>' +
      '<button class="btn btn-ghost btn-block" id="setImport" style="margin-top:10px">📂 从备份恢复</button></div>' +
      '<div class="card"><div class="title">历史快照</div><div class="divider"></div>' +
      '<div class="muted">每次改动自动生成快照，误删可回滚。</div>' +
      '<button class="btn btn-ghost btn-block" id="setSnapshots" style="margin-top:14px">🕒 查看/恢复快照</button></div>' +
      '<div class="card"><div class="title">🤖 AI 识别配置</div><div class="divider"></div>' +
      '<div class="muted">拍照识别花名需要视觉大模型。推荐 SiliconFlow（国内可访问，新用户有免费额度）：siliconflow.cn 注册 → API Key → 复制填入。Key 只存本机。</div>' +
      '<div class="form-item" style="margin-top:12px"><span class="label">API Key</span>' +
      '<input class="input" id="aiKey" type="password" value="' + esc(AI ? AI.config().key : '') + '" placeholder="sk-..." /></div>' +
      '<div class="form-item"><span class="label">模型（可选）</span>' +
      '<input class="input" id="aiModel" value="' + esc(AI ? AI.config().model : '') + '" placeholder="' + (AI ? esc(AI.DEFAULTS.model) : '') + '" /></div>' +
      '<div class="form-item"><span class="label">接口地址（可选）</span>' +
      '<input class="input" id="aiEndpoint" value="' + esc(AI ? AI.config().endpoint : '') + '" placeholder="OpenAI 兼容的 /chat/completions 地址" /></div>' +
      '<button class="btn btn-primary btn-block" id="aiSave">保存 AI 配置</button></div>' +
      '<div class="card"><div class="title">关于</div><div class="divider"></div>' +
      '<div class="muted">浇花打卡 PWA v1.2 · 纯本地存储 · 核心功能无需联网</div></div>'
  }

  // ---------- 详情弹层 ----------
  function openDetail(id) {
    var item = S.items.filter(function (i) { return i.id === id })[0]
    if (!item) return
    var cycle = item.customCycleDays || 7
    var last = lastRecord(id)
    var recs = S.records.filter(function (r) { return r.itemId === id }).sort(function (a, b) { return b.checkedAt - a.checkedAt })
    var h = '<h3>' + esc(item.name) + '</h3>'
    h += '<div class="row">' + (item.avatar ? '<img class="avatar" src="' + esc(item.avatar) + '" style="width:72px;height:72px" />' : '') +
      '<div class="col flex1"><div class="muted">' + esc(item.species || '未填写品种') + '</div>' +
      (item.scientific ? '<div class="muted">' + esc(item.scientific) + '</div>' : '') +
      '<div class="muted" style="margin-top:6px">每 ' + cycle + ' 天浇一次</div></div></div>'
    if (item.info || item.family) {
      h += '<div style="margin-top:12px">' + infoCard({ name: item.name, family: item.family, cycle: cycle, info: item.info }) + '</div>'
    } else if (item.tip) {
      h += '<div class="tag" style="display:inline-block;margin-top:10px">' + esc(item.tip) + '</div>'
    }
    if (item.infoSource) h += '<div class="muted" style="margin-top:8px">信息来源：' + ({ builtin: '内置花卉库', inaturalist: '🌐 iNaturalist', perenual: '🌐 Perenual', ai: '🤖 AI 识别' }[item.infoSource] || item.infoSource) + '</div>'
    if (item.wiki) h += '<div style="margin-top:8px"><a href="' + esc(item.wiki) + '" target="_blank" rel="noopener" class="muted">🔗 查看植物百科</a></div>'
    h += '<div class="divider"></div><div class="row between"><span>上次浇水</span><span>' + fmt(last ? last.checkedAt : (item.lastWateredAt || item.createdAt), true) + '</span></div>'
    h += '<div class="row between" style="margin-top:8px"><span>累计打卡</span><span>' + recs.length + ' 次</span></div>'
    h += '<div class="divider"></div><div class="title" style="margin-bottom:8px">浇水记录</div>'
    if (!recs.length) h += '<div class="muted">还没有记录</div>'
    recs.forEach(function (r) {
      h += '<div class="list-item"><div class="record-time">' + fmt(r.checkedAt, true) + '</div>'
      if (r.note) h += '<div class="muted">' + esc(r.note) + '</div>'
      if (r.photos && r.photos.length) h += '<div class="photo-row" style="margin-top:6px">' + r.photos.map(function (p) { return '<img class="record-photo" src="' + esc(p) + '" />' }).join('') + '</div>'
      h += '</div>'
    })
    h += '<div class="modal-actions"><button class="btn btn-ghost" data-act="edit" data-id="' + esc(id) + '">编辑</button>' +
      '<button class="btn btn-primary" data-act="checkin" data-id="' + esc(id) + '">立即浇水</button>' +
      '<button class="btn btn-danger" data-act="delete" data-id="' + esc(id) + '">删除</button></div>'
    showModal(h)
  }

  // ---------- 添加/编辑弹层 ----------
  var draft = {}
  var ONLINE = window.WateringPlantApi
  var AI = window.WateringAI

  function openEdit(id) {
    var item = id ? S.items.filter(function (i) { return i.id === id })[0] : null
    var f = item || { name: '', species: '', avatar: '', customCycleDays: 7, location: '', tip: '', infoSource: '' }
    draft = { tip: f.tip || '', avatar: f.avatar || '', photo: '', scientific: f.scientific || '', infoSource: f.infoSource || '', wiki: f.wiki || '', perenualId: f.perenualId || null, info: f.info || null, family: f.family || '' }
    var h = '<h3>' + (item ? '编辑花草' : '添加花草') + '</h3>'
    h += '<div class="form-item"><span class="label">照片</span><div class="photo-row">' +
      '<img id="editAvatar" class="photo" style="display:' + (f.avatar ? 'block' : 'none') + '" src="' + esc(f.avatar) + '" />' +
      '<div class="photo-add" id="pickPhoto" title="添加照片">＋</div></div>' +
      '<input type="file" id="cameraFile" accept="image/*" capture="environment" style="display:none" />' +
      '<input type="file" id="albumFile" accept="image/*" style="display:none" />' +
      '<div class="muted" style="margin-top:6px">点 ＋ 选择拍照或从相册选；选完可点「AI 识别」自动填花名</div>' +
      '<button class="btn btn-ghost" id="btnAiRecognize" style="margin-top:8px">🤖 AI 识别照片中的植物</button>' +
      '<div class="muted" id="aiResult" style="margin-top:8px;display:none"></div></div>' +
      '<div class="form-item" style="background:#F0F6FF;border-radius:12px;padding:12px">' +
      '<span class="label">🌐 用 WorkBuddy 识别（免费、识别更准）</span>' +
      '<div class="muted" style="line-height:1.7">① 点下面按钮复制提问词和照片 → ② 打开 WorkBuddy 粘贴发送 → ③ 把回答复制回来粘贴到下方 → ④ 点「解析并填入」</div>' +
      '<div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">' +
      '<button class="btn btn-ghost" id="wbCopyPrompt">复制提问词</button>' +
      '<button class="btn btn-ghost" id="wbCopyPhoto">复制照片</button>' +
      '<button class="btn btn-ghost" id="wbDownloadPhoto">下载照片</button></div>' +
      '<textarea class="textarea" id="wbAnswer" placeholder="把 WorkBuddy 的回答粘贴到这里…" style="margin-top:10px"></textarea>' +
      '<button class="btn btn-primary btn-block" id="wbParse" style="margin-top:8px">解析并填入</button>' +
      '<div class="muted" id="wbStatus" style="margin-top:8px"></div></div>'
    h += '<div class="form-item"><span class="label">名称 *</span><input class="input" id="fName" value="' + esc(f.name) + '" placeholder="例如：客厅的绿萝" /></div>'
    h += '<div class="form-item"><span class="label">品种 / 联网搜索</span>' +
      '<input class="input" id="fSpecies" value="' + esc(f.species) + '" placeholder="输入花名搜索，如「绿萝」或 Monstera" />' +
      '<div class="muted" id="searchHint" style="margin-top:6px">内置花卉库离线可用；联网可获取更多信息' + (ONLINE && ONLINE.hasKey() ? '（已配置 Perenual，含浇水频次）' : '') + '</div>' +
      '<div id="plantResults" class="plant-list" style="display:none"></div></div>'
    h += '<div class="form-item"><span class="label">浇水周期（天）</span><input class="input" id="fCycle" type="number" min="1" value="' + (f.customCycleDays || 7) + '" /></div>'
    var lastWatered = f.lastWateredAt ? fmt(f.lastWateredAt) : (f.createdAt ? fmt(f.createdAt) : '')
    h += '<div class="form-item"><span class="label">上次浇水日期' + (id ? '' : '（不填则从添加日算起）') + '</span>' +
      '<input class="input" id="fLastWatered" type="date" value="' + esc(lastWatered) + '" />' +
      '<div class="muted" style="margin-top:6px">' + (id ? '改这里会重置浇水倒计时' : '填写真实的上次浇水日期，待办会据此计算；留空则默认今天。') + '</div></div>'
    h += '<div class="form-item"><span class="label">位置（可选）</span><input class="input" id="fLocation" value="' + esc(f.location || '') + '" placeholder="例如：阳台" /></div>'
    if (ONLINE && !ONLINE.hasKey()) {
      h += '<div class="form-item"><span class="label">🌐 高级：填入 Perenual 免费 API Key（可选）</span>' +
        '<input class="input" id="fApiKey" value="' + esc(ONLINE.getKey()) + '" placeholder="填了可获得精确浇水频次，留空则用内置库" />' +
        '<div class="muted" style="margin-top:6px">免费申请：perenual.com → Login → API Key。不填也能用，只是没有浇水频次。</div></div>'
    }
    h += '<div class="modal-actions"><button class="btn btn-ghost" data-act="close">取消</button><button class="btn btn-primary" data-act="save" data-id="' + (id || '') + '">保存</button></div>'
    showModal(h)
    bindEditPhoto()
    bindEditSearch()
    bindWorkBuddy()
  }

  // 底部选择菜单（拍照 / 相册）
  function showPhotoSheet(cbCamera, cbAlbum) {
    var sheet = document.getElementById('actionSheet')
    if (!sheet) return
    sheet.style.display = 'flex'
    function close() {
      sheet.style.display = 'none'
      document.getElementById('sheetCamera').onclick = null
      document.getElementById('sheetAlbum').onclick = null
      document.getElementById('sheetCancel').onclick = null
      sheet.onclick = null
    }
    document.getElementById('sheetCamera').onclick = function () { close(); cbCamera() }
    document.getElementById('sheetAlbum').onclick = function () { close(); cbAlbum() }
    document.getElementById('sheetCancel').onclick = close
    sheet.onclick = function (e) { if (e.target === sheet) close() }
  }

  // 照片选择 + AI 识别（统一 ＋ 号，弹出拍照/相册选择菜单）
  function bindEditPhoto() {
    var cameraInput = document.getElementById('cameraFile')
    var albumInput = document.getElementById('albumFile')
    var pickPhoto = document.getElementById('pickPhoto')
    var aiBtn = document.getElementById('btnAiRecognize')
    var resultBox = document.getElementById('aiResult')

    if (!pickPhoto || !cameraInput || !albumInput) return

    function handleFile(file) {
      if (!file) return
      compressImage(file, function (dataUrl) {
        draft.avatar = dataUrl
        draft._lastDataUrl = dataUrl
        var img = document.getElementById('editAvatar')
        img.src = dataUrl; img.style.display = 'block'
      })
    }

    // ＋ 号：弹出选择菜单
    pickPhoto.onclick = function () {
      showPhotoSheet(
        function () { cameraInput.value = ''; cameraInput.click() },
        function () { albumInput.value = ''; albumInput.click() }
      )
    }
    cameraInput.onchange = function () { handleFile(cameraInput.files[0]) }
    albumInput.onchange = function () { handleFile(albumInput.files[0]) }

    // AI 识别按钮
    if (aiBtn) {
      aiBtn.onclick = function () {
        if (!AI) { toast('AI 模块未加载'); return }
        if (!draft._lastDataUrl && draft.avatar) draft._lastDataUrl = draft.avatar
        if (!draft._lastDataUrl) { toast('请先拍照或从相册选照片'); albumInput.click(); return }
        if (!AI.configured()) {
          toast('请先在设置里配置 AI Key')
          if (resultBox) { resultBox.style.display = 'block'; resultBox.innerHTML = '未配置 AI Key：请到「设置 → AI 识别配置」填入免费服务商的 API Key。' }
          return
        }
        aiBtn.textContent = '🤖 识别中…'
        aiBtn.disabled = true
        AI.recognize(draft._lastDataUrl).then(function (r) {
          aiBtn.textContent = '🤖 AI 识别照片中的植物'
          aiBtn.disabled = false
          if (!r.ok) {
            if (resultBox) { resultBox.style.display = 'block'; resultBox.innerHTML = '❌ ' + esc(r.error) }
            return
          }
          // 自动填入中文花名 + 关键信息
          var nameInput = document.getElementById('fName')
          var speciesInput = document.getElementById('fSpecies')
          if (!nameInput.value.trim() && r.name !== '未知植物') nameInput.value = r.name
          speciesInput.value = r.name
          document.getElementById('fCycle').value = r.cycle
          draft.tip = r.care || ''
          draft.scientific = r.scientific || ''
          draft.infoSource = 'ai'
          draft.info = r.info || null
          if (resultBox) {
            resultBox.style.display = 'block'
            resultBox.innerHTML = infoCard(r) + '<div class="muted" style="margin-top:6px">名称/品种/周期已自动填入，可手动修改。</div>'
          }
          // 用识别到的中文名找内置库，补充权威关键信息；找不到再联网
          var builtin = Plants.getByName ? Plants.getByName(r.name) : null
          if (builtin) {
            draft.info = builtin.info || draft.info
            draft.tip = builtin.tip || draft.tip
            if (resultBox) resultBox.innerHTML = infoCard(Object.assign({}, r, { info: builtin.info || r.info, cycle: builtin.cycle || r.cycle })) + '<div class="muted" style="margin-top:6px">📚 已从内置中文花卉库补充权威信息。</div>'
          } else if (r.name !== '未知植物' && ONLINE) {
            ONLINE.search(r.name).then(function (list) {
              if (!list || !list.length) return
              var p = list[0]
              draft.scientific = draft.scientific || p.scientific || ''
              draft.wiki = p.wiki || ''
              if (p.source !== 'builtin') draft.infoSource = p.source
              if (resultBox) resultBox.innerHTML += '<br>🌐 已联网补充：' + esc(p.name) + (p.wateringText ? ' · ' + esc(p.wateringText) : '')
            })
          }
        })
      }
    }
  }

  // ---------- WorkBuddy 辅助识别 ----------
  function bindWorkBuddy() {
    var WB = window.WorkingBuddy
    if (!WB) return
    var copyPrompt = document.getElementById('wbCopyPrompt')
    var copyPhoto = document.getElementById('wbCopyPhoto')
    var downloadPhoto = document.getElementById('wbDownloadPhoto')
    var parseBtn = document.getElementById('wbParse')
    var answerEl = document.getElementById('wbAnswer')
    var statusEl = document.getElementById('wbStatus')
    if (!copyPrompt || !parseBtn) return

    function say(msg) { if (statusEl) statusEl.textContent = msg }
    function applyResult(d) {
      if (!d.ok) { say('❌ ' + (d.error || '解析失败')); return }
      var nameInput = document.getElementById('fName')
      var speciesInput = document.getElementById('fSpecies')
      if (d.name) {
        if (!nameInput.value.trim()) nameInput.value = d.name
        speciesInput.value = d.name
      }
      if (d.cycle) document.getElementById('fCycle').value = d.cycle
      draft.tip = d.care || draft.tip
      draft.scientific = d.scientific || draft.scientific
      draft.family = d.family || draft.family
      draft.info = d.info || null
      draft.infoSource = 'workbuddy'
      // 优先用内置中文库的权威信息补充/覆盖
      var builtin = d.name && Plants.getByName ? Plants.getByName(d.name) : null
      if (builtin) {
        draft.info = builtin.info || draft.info
        draft.tip = builtin.tip || draft.tip
        document.getElementById('fCycle').value = builtin.cycle || d.cycle
        d.info = builtin.info || d.info
        d.cycle = builtin.cycle || d.cycle
      }
      var rc = document.getElementById('aiResult')
      if (rc) {
        rc.style.display = 'block'
        rc.innerHTML = infoCard({ name: d.name || '识别结果', cycle: d.cycle, info: d.info, family: d.family }) +
          '<div class="muted" style="margin-top:6px">已从 WorkBuddy 回答填入' + (builtin ? '，并用内置中文库补充了权威信息' : '') + '，可手动修改。</div>'
      }
      say('✅ 已解析并填入，检查后点保存即可')
    }

    copyPrompt.onclick = function () {
      WB.copyText(WB.buildPrompt()).then(function (ok) {
        say(ok ? '✅ 提问词已复制，去 WorkBuddy 粘贴；再点「复制照片」' : '❌ 复制失败，请手动复制下方文字')
      })
    }
    if (copyPhoto) {
      copyPhoto.onclick = function () {
        WB.copyImage(draft._lastDataUrl || draft.avatar).then(function (ok) {
          say(ok ? '✅ 照片已复制，去 WorkBuddy 粘贴发送' : '❌ 当前浏览器不支持复制图片，请点「下载照片」后手动发送')
        })
      }
    }
    if (downloadPhoto) {
      downloadPhoto.onclick = function () {
        var ok = WB.downloadImage(draft._lastDataUrl || draft.avatar)
        say(ok ? '✅ 照片已下载，可发给 WorkBuddy' : '❌ 请先添加照片')
      }
    }
    parseBtn.onclick = function () {
      applyResult(WB.parseResult(answerEl ? answerEl.value : ''))
    }
  }

  function bindEditSearch() {
    var speciesInput = document.getElementById('fSpecies')
    var results = document.getElementById('plantResults')
    var hint = document.getElementById('searchHint')
    var apiKeyInput = document.getElementById('fApiKey')
    var searchSeq = 0

    // 保存 Perenual key（若本弹层里有输入框）
    if (apiKeyInput) {
      apiKeyInput.addEventListener('change', function () {
        ONLINE.setKey(apiKeyInput.value.trim())
        if (hint) hint.textContent = 'API Key 已保存，下次搜索即可获取浇水频次'
      })
    }

    function renderResults(list, onlineCount) {
      if (!list.length) { results.style.display = 'none'; return }
      results.style.display = 'block'
      results.innerHTML = list.slice(0, 14).map(function (p, idx) {
        var cycleTag = p.cycle ? '<span class="tag">' + p.cycle + '天</span>' : ''
        var srcTag = p.source === 'inaturalist' ? '<span class="muted">🌐 iNaturalist</span>'
          : p.source === 'perenual' ? '<span class="muted">🌐 Perenual</span>' : '<span class="muted">📚 内置</span>'
        var img = p.photo ? '<img src="' + esc(p.photo) + '" style="width:40px;height:40px;border-radius:8px;object-fit:cover;margin-right:8px" />' : ''
        var tip = p.wateringText || p.tip || p.watering || ''
        return '<div class="plant-item" data-pick-idx="' + idx + '">' +
          '<div class="row">' + img + '<div class="col flex1"><div class="row between"><span>' + esc(p.name) + ' <span class="muted">' + esc(p.scientific || '') + '</span></span>' + cycleTag + '</div>' +
          '<div class="muted">' + srcTag + (tip ? ' · ' + esc(tip) : '') + '</div></div></div></div>'
      }).join('')
      results._list = list
    }

    speciesInput.addEventListener('input', function () {
      var kw = speciesInput.value.trim()
      if (!kw) { results.style.display = 'none'; return }
      // 1) 立即显示内置库结果（离线）
      var local = (window.WateringPlants.search(kw) || []).map(function (p) {
        return { name: p.name, scientific: p.scientific, cycle: p.cycle, tip: p.tip, info: p.info, source: 'builtin' }
      })
      renderResults(local, 0)
      if (hint) hint.textContent = '内置结果已显示，正在联网补充…'
      // 2) 联网补充（防抖 + 序号防竞态）
      var seq = ++searchSeq
      ONLINE.search(kw).then(function (remote) {
        if (seq !== searchSeq) return
        var merged = local.concat(remote || [])
        // 去重：内置优先
        var seen = {}, out = []
        merged.forEach(function (p) {
          var k = (p.scientific || p.name || '').toLowerCase()
          if (k && seen[k]) return
          if (k) seen[k] = true
          out.push(p)
        })
        renderResults(out, (remote || []).length)
        if (hint) hint.textContent = (remote && remote.length) ? '已联网获取更多信息（含照片/学名）' : '未找到联网信息，已显示内置结果'
      }).catch(function () {
        if (seq === searchSeq && hint) hint.textContent = '联网失败，已使用内置花卉库'
      })
    })

    results.addEventListener('click', function (e) {
      var el = e.target.closest('[data-pick-idx]')
      if (!el) return
      var p = (results._list || [])[Number(el.getAttribute('data-pick-idx'))]
      if (!p) return
      speciesInput.value = p.name
      document.getElementById('fCycle').value = p.cycle || 7
      draft.tip = p.wateringText || p.tip || p.watering || ''
      draft.scientific = p.scientific || ''
      draft.infoSource = p.source || ''
      draft.wiki = p.wiki || ''
      draft.perenualId = p.id || null
      draft.info = p.info || null
      draft.family = (p.info && p.info.family) || ''
      // 选中后在弹层展示关键信息卡
      var rc = document.getElementById('aiResult')
      if (rc && (draft.info || p.cycle)) {
        rc.style.display = 'block'
        rc.innerHTML = infoCard({ name: p.name, cycle: p.cycle, info: draft.info, confidence: null }) + '<div class="muted" style="margin-top:6px">已选择「' + esc(p.name) + '」，周期和关键信息已填入。</div>'
      }
      // 注意：联网图片是外部 URL，离线会破图，因此只作参考不设为头像；头像仍用自己拍摄的照片
      // Perenual 结果可进一步拉详情，拿精确天数
      if (p.source === 'perenual' && p.id && ONLINE.hasKey()) {
        ONLINE.detailPerenual(p.id).then(function (d) {
          if (!d) return
          if (d.cycle) document.getElementById('fCycle').value = d.cycle
          draft.tip = d.wateringText || d.watering || d.description || draft.tip
          draft.scientific = d.scientific || draft.scientific
        })
      }
      results.style.display = 'none'
      if (hint) hint.textContent = '已选择：' + p.name + (p.source === 'builtin' ? '（内置库）' : '（联网信息）')
    })
  }

  // 图片压缩（降低本地存储占用）
  function compressImage(file, cb) {
    var reader = new FileReader()
    reader.onload = function (e) {
      var img = new Image()
      img.onload = function () {
        var max = 800
        var scale = Math.min(1, max / Math.max(img.width, img.height))
        var c = document.createElement('canvas')
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        cb(c.toDataURL('image/jpeg', 0.7))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  // ---------- 打卡弹层 ----------
  function openCheckin(id) {
    var item = S.items.filter(function (i) { return i.id === id })[0]
    if (!item) return
    var last = lastRecord(id)
    var lastAt = last ? last.checkedAt : (item.lastWateredAt || item.createdAt)
    var days = lastAt ? Math.max(0, daysBetween(lastAt, Date.now())) : 0
    var h = '<h3>给「' + esc(item.name) + '」浇水</h3>'
    h += '<div class="muted">已 ' + days + ' 天没浇水啦</div>'
    h += '<div class="form-item" style="margin-top:14px"><span class="label">拍张照片（可选）</span><div class="photo-row" id="ciPhotos">' +
      '<div class="photo-add" id="ciAdd">＋</div></div><input type="file" id="ciFile" accept="image/*" style="display:none" /></div>'
    h += '<div class="form-item"><span class="label">备注（可选）</span><textarea class="textarea" id="ciNote" placeholder="例如：浇透了、叶子有点黄…"></textarea></div>'
    h += '<div class="modal-actions"><button class="btn btn-ghost" data-act="close">取消</button><button class="btn btn-primary" data-act="submit-checkin" data-id="' + esc(id) + '">完成打卡</button></div>'
    showModal(h)
    var photos = []
    var file = document.getElementById('ciFile')
    document.getElementById('ciAdd').addEventListener('click', function () { file.click() })
    file.addEventListener('change', function () {
      var f = file.files[0]
      if (!f) return
      compressImage(f, function (url) {
        photos.push(url)
        var box = document.getElementById('ciPhotos')
        var img = document.createElement('img')
        img.className = 'photo'; img.src = url
        box.insertBefore(img, document.getElementById('ciAdd'))
      })
    })
    document.getElementById('modalRoot')._photos = photos
  }

  // ---------- 快照弹层 ----------
  function openSnapshots() {
    Store.snapshots().then(function (list) {
      var h = '<h3>历史快照</h3><div class="muted">点击恢复會覆盖当前数据（会再存一份新快照）。</div><div style="margin-top:12px">'
      if (!list.length) h += '<div class="muted">暂无快照</div>'
      list.slice(0, 20).forEach(function (s) {
        h += '<div class="list-item row between"><div class="col"><span>' + esc(s.label) + '</span><span class="muted">' + fmt(s.createdAt, true) + ' · ' + s.items.length + ' 盆花</span></div>' +
          '<button class="btn btn-ghost" data-restore="' + s.id + '">恢复</button></div>'
      })
      h += '</div><div class="modal-actions"><button class="btn btn-ghost" data-act="close">关闭</button></div>'
      showModal(h)
    })
  }

  // ---------- 弹层基础 ----------
  function showModal(html) {
    modalRoot.innerHTML = '<div class="modal-mask"><div class="modal">' + html + '</div></div>'
    modalRoot.querySelector('.modal-mask').addEventListener('click', function (e) {
      if (e.target === this) closeModal()
    })
  }
  function closeModal() { modalRoot.innerHTML = '' }

  // ---------- 备份/恢复 ----------
  function doBackup() {
    var data = Store.exportData(S)
    var json = JSON.stringify(data, null, 2)
    var blob = new Blob([json], { type: 'application/json' })
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url
    a.download = '浇花打卡备份-' + fmt(Date.now()) + '.json'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
    Store.markBackedUp()
    toast('备份已生成，请保存到「文件」')
    render()
  }
  function doImport() {
    var input = document.createElement('input')
    input.type = 'file'; input.accept = 'application/json,.json'
    input.onchange = function () {
      var f = input.files[0]
      if (!f) return
      var reader = new FileReader()
      reader.onload = function (e) {
        try {
          var d = JSON.parse(e.target.result)
          if (!Array.isArray(d.items) || !Array.isArray(d.records)) throw new Error('格式不对')
          S = { items: d.items, records: d.records }
          persist('导入备份').then(function () { toast('恢复成功'); render() })
        } catch (err) { toast('文件格式不正确') }
      }
      reader.readAsText(f)
    }
    input.click()
  }

  // ---------- 渲染 ----------
  function render() {
    titleEl.textContent = TITLES[currentTab]
    var html = currentTab === 'home' ? viewHome()
      : currentTab === 'plants' ? viewPlants()
        : currentTab === 'calendar' ? viewCalendar()
          : currentTab === 'stats' ? viewStats() : viewSettings()
    main.innerHTML = html
    fab.style.display = (currentTab === 'home' || currentTab === 'plants') ? 'block' : 'none'
    document.querySelectorAll('#tabbar button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === currentTab)
    })
    bindViewEvents()
  }

  function bindViewEvents() {
    var warn = document.getElementById('warnBackup')
    if (warn) warn.onclick = doBackup
    var el
    if ((el = document.getElementById('statBackup'))) el.onclick = doBackup
    if ((el = document.getElementById('setBackup'))) el.onclick = doBackup
    if ((el = document.getElementById('setImport'))) el.onclick = doImport
    if ((el = document.getElementById('setSnapshots'))) el.onclick = openSnapshots
    if ((el = document.getElementById('aiSave'))) el.onclick = function () {
      if (!AI) { toast('AI 模块未加载'); return }
      AI.saveConfig({
        key: document.getElementById('aiKey').value.trim(),
        model: document.getElementById('aiModel').value.trim(),
        endpoint: document.getElementById('aiEndpoint').value.trim()
      })
      toast('AI 配置已保存')
    }
    main.querySelectorAll('[data-open]').forEach(function (b) {
      b.onclick = function (e) {
        if (e.target.closest('[data-checkin]')) return
        openDetail(b.getAttribute('data-open'))
      }
    })
    main.querySelectorAll('[data-checkin]').forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); openCheckin(b.getAttribute('data-checkin')) }
    })
    main.querySelectorAll('[data-edit]').forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); openEdit(b.getAttribute('data-edit')) }
    })
    main.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation()
        var did = b.getAttribute('data-del')
        var target = S.items.filter(function (i) { return i.id === did })[0]
        if (!confirm('确定删除「' + (target ? target.name : '这盆花') + '」及其所有记录吗？')) return
        S.items = S.items.filter(function (i) { return i.id !== did })
        S.records = S.records.filter(function (r) { return r.itemId !== did })
        persist('删除花草').then(function () { toast('已删除，可在历史快照恢复') })
      }
    })
    main.querySelectorAll('[data-cal]').forEach(function (b) {
      b.onclick = function () {
        if (b.getAttribute('data-cal') === 'prev') { cal.m--; if (cal.m < 1) { cal.m = 12; cal.y-- } }
        else { cal.m++; if (cal.m > 12) { cal.m = 1; cal.y++ } }
        render()
      }
    })
    main.querySelectorAll('[data-day]').forEach(function (b) {
      b.onclick = function () { cal.sel = b.getAttribute('data-day'); render() }
    })
  }

  // ---------- 弹层事件委托 ----------
  modalRoot.addEventListener('click', function (e) {
    var t = e.target
    var act = t.closest('[data-act]')
    if (act) {
      var a = act.getAttribute('data-act')
      var id = act.getAttribute('data-id')
      if (a === 'close') return closeModal()
      if (a === 'edit') return openEdit(id)
      if (a === 'checkin') return openCheckin(id)
      if (a === 'delete') {
        if (!confirm('确定删除这盆花及其所有记录吗？')) return
        S.items = S.items.filter(function (i) { return i.id !== id })
        S.records = S.records.filter(function (r) { return r.itemId !== id })
        closeModal(); persist('删除花草').then(function () { toast('已删除') })
        return
      }
      if (a === 'save') {
        var name = document.getElementById('fName').value.trim()
        if (!name) { toast('请填写名称'); return }
        var old = id ? (S.items.filter(function (i) { return i.id === id })[0] || {}) : {}
        var entry = {
          name: name,
          species: document.getElementById('fSpecies').value.trim(),
          scientific: draft.scientific || old.scientific || '',
          customCycleDays: parseInt(document.getElementById('fCycle').value, 10) || 7,
          location: document.getElementById('fLocation').value.trim(),
          tip: draft.tip || old.tip || '',
          avatar: draft.avatar || '',
          infoSource: draft.infoSource || old.infoSource || '',
          wiki: draft.wiki || old.wiki || '',
          perenualId: draft.perenualId || old.perenualId || null,
          info: draft.info || old.info || null,
          family: draft.family || old.family || '',
          lastWateredAt: (function () {
            var el = document.getElementById('fLastWatered')
            if (!el || !el.value) return old.lastWateredAt || null
            var t = new Date(el.value + 'T12:00:00').getTime()
            return isNaN(t) ? null : t
          })(),
          updatedAt: Date.now()
        }
        if (id) {
          S.items = S.items.map(function (i) { return i.id === id ? Object.assign({}, i, entry) : i })
        } else {
          S.items.push(Object.assign({ id: Store.uid(), typeId: 'watering', active: true, createdAt: Date.now() }, entry))
        }
        closeModal(); persist(id ? '编辑花草' : '添加花草').then(function () { toast('已保存') })
        return
      }
      if (a === 'submit-checkin') {
        var note = document.getElementById('ciNote').value.trim()
        S.records.push({
          id: Store.uid(), itemId: id, typeId: 'watering', checkedAt: Date.now(),
          note: note, photos: (modalRoot._photos || []).slice(), source: 'manual'
        })
        closeModal(); persist('浇水打卡').then(function () { toast('打卡成功 🌿') })
        return
      }
    }
    var restore = t.closest('[data-restore]')
    if (restore) {
      var rid = Number(restore.getAttribute('data-restore'))
      if (!confirm('确定恢复这个快照吗？当前数据会被覆盖。')) return
      Store.restoreSnapshot(rid).then(function () {
        return Store.load().then(function (d) { S = d; closeModal(); render(); toast('已恢复快照') })
      })
    }
  })

  // ---------- 导航事件 ----------
  document.getElementById('tabbar').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]')
    if (!b) return
    currentTab = b.getAttribute('data-tab')
    render()
  })
  fab.onclick = function () { openEdit(null) }
  document.getElementById('btnBackup').onclick = doBackup

  // ---------- 启动 ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {})
    })
  }
  Store.load().then(function (d) { S = d; render() }).catch(function () { render() })
})()
