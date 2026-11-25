/* store.js — 纯本地存储层
 * 三层防护：
 *   1) IndexedDB 主存 + localStorage 镜像双写，读取时互相校验
 *   2) 每次改动自动生成带时间戳快照，保留最近 20 份，可一键回滚
 *   3) 超过 7 天未备份则提示；点一下导出 JSON（iOS 可存到「文件」）
 * 不依赖任何网络服务。
 */
(function (global) {
  'use strict'

  var DB_NAME = 'watering-db'
  var DB_VER = 1
  var STORE_KV = 'kv'
  var STORE_SNAP = 'snapshots'
  var K_ITEMS = 'wf_items'
  var K_RECORDS = 'wf_records'
  var K_BACKUP = 'wf_last_backup'
  var MAX_SNAPSHOTS = 20
  var BACKUP_INTERVAL = 7 * 86400000

  var db = null

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (db) { resolve(db); return }
      if (!global.indexedDB) { reject(new Error('IndexedDB 不可用')); return }
      var req = indexedDB.open(DB_NAME, DB_VER)
      req.onupgradeneeded = function () {
        var d = req.result
        if (!d.objectStoreNames.contains(STORE_KV)) d.createObjectStore(STORE_KV)
        if (!d.objectStoreNames.contains(STORE_SNAP)) {
          var s = d.createObjectStore(STORE_SNAP, { keyPath: 'id', autoIncrement: true })
          s.createIndex('createdAt', 'createdAt')
        }
      }
      req.onsuccess = function () { db = req.result; resolve(db) }
      req.onerror = function () { reject(req.error) }
    })
  }

  function idbGet(store, key) {
    return openDB().then(function (d) {
      return new Promise(function (resolve, reject) {
        var r = d.transaction(store, 'readonly').objectStore(store).get(key)
        r.onsuccess = function () { resolve(r.result) }
        r.onerror = function () { reject(r.error) }
      })
    })
  }

  function idbPut(store, key, value) {
    return openDB().then(function (d) {
      return new Promise(function (resolve, reject) {
        var t = d.transaction(store, 'readwrite')
        t.objectStore(store).put(value, key)
        t.oncomplete = function () { resolve() }
        t.onerror = function () { reject(t.error) }
      })
    })
  }

  function idbAddSnap(value) {
    return openDB().then(function (d) {
      return new Promise(function (resolve, reject) {
        var t = d.transaction(STORE_SNAP, 'readwrite')
        t.objectStore(STORE_SNAP).add(value)
        t.oncomplete = function () { resolve() }
        t.onerror = function () { reject(t.error) }
      })
    })
  }

  function idbGetAllSnaps() {
    return openDB().then(function (d) {
      return new Promise(function (resolve, reject) {
        var r = d.transaction(STORE_SNAP, 'readonly').objectStore(STORE_SNAP).getAll()
        r.onsuccess = function () {
          var list = r.result || []
          list.sort(function (a, b) { return b.createdAt - a.createdAt })
          resolve(list)
        }
        r.onerror = function () { reject(r.error) }
      })
    })
  }

  function idbClearSnaps() {
    return openDB().then(function (d) {
      return new Promise(function (resolve, reject) {
        var t = d.transaction(STORE_SNAP, 'readwrite')
        t.objectStore(STORE_SNAP).clear()
        t.oncomplete = function () { resolve() }
        t.onerror = function () { reject(t.error) }
      })
    })
  }

  function localGet(key, fallback) {
    try {
      var v = localStorage.getItem(key)
      return v ? JSON.parse(v) : fallback
    } catch (e) { return fallback }
  }
  function localSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)) } catch (e) { console.warn('localStorage 写入失败', e) }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  }

  var api = {
    // 读取：IndexedDB 优先，localStorage 兜底；不一致时取更新时间较新的
    load: function () {
      return Promise.all([
        idbGet(STORE_KV, 'data').catch(function () { return null }),
        Promise.resolve().then(function () { return localGet(K_ITEMS, null) }),
        Promise.resolve().then(function () { return localGet(K_RECORDS, null) })
      ]).then(function (res) {
        var idb = res[0]
        var lItems = res[1]
        var lRecords = res[2]
        var local = (lItems || lRecords) ? { items: lItems || [], records: lRecords || [] } : null
        var chosen = idb || local || { items: [], records: [] }
        if (idb && local) {
          var idbT = idb.updatedAt || 0
          var localT = 0
          ;(local.items || []).forEach(function (i) { localT = Math.max(localT, i.updatedAt || i.createdAt || 0) })
          ;(local.records || []).forEach(function (r) { localT = Math.max(localT, r.createdAt || 0) })
          if (localT > idbT) chosen = local
        }
        return { items: chosen.items || [], records: chosen.records || [] }
      })
    },

    // 保存：双写 + 快照
    save: function (data, label) {
      var payload = { items: data.items || [], records: data.records || [], updatedAt: Date.now() }
      localSet(K_ITEMS, payload.items)
      localSet(K_RECORDS, payload.records)
      return idbPut(STORE_KV, 'data', payload).catch(function (e) {
        console.warn('IndexedDB 主存写入失败，已保留 localStorage 镜像', e)
      }).then(function () {
        return idbAddSnap({ createdAt: Date.now(), label: label || '自动快照', items: payload.items, records: payload.records })
      }).catch(function (e) {
        console.warn('快照写入失败', e)
      }).then(function () { return api.pruneSnapshots().catch(function () {}) }).then(function () { return payload })
    },

    snapshots: function () { return idbGetAllSnaps().catch(function () { return [] }) },

    pruneSnapshots: function () {
      return idbGetAllSnaps().then(function (list) {
        if (list.length <= MAX_SNAPSHOTS) return
        var keep = list.slice(0, MAX_SNAPSHOTS)
        return idbClearSnaps().then(function () {
          return keep.reduce(function (p, s) {
            return p.then(function () { return idbAddSnap(s) })
          }, Promise.resolve())
        })
      })
    },

    restoreSnapshot: function (id) {
      return idbGetAllSnaps().then(function (list) {
        var snap = list.filter(function (s) { return s.id === id })[0]
        if (!snap) throw new Error('快照不存在')
        return api.save({ items: snap.items, records: snap.records }, '恢复快照')
      })
    },

    exportData: function (data) {
      return { app: 'watering-pwa', version: 1, exportedAt: Date.now(), items: data.items || [], records: data.records || [] }
    },

    markBackedUp: function () { localSet(K_BACKUP, Date.now()) },
    lastBackupAt: function () { return localGet(K_BACKUP, 0) },
    needBackup: function () { return Date.now() - api.lastBackupAt() > BACKUP_INTERVAL },

    uid: uid,
    available: function () { return !!global.indexedDB }
  }

  global.WateringStore = api
})(window)
