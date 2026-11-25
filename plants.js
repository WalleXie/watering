/* plants.js — 内置花卉库（与小程序版一致） */
(function (global) {
  'use strict'
  var BUILTIN = [
    { name: '绿萝', scientific: 'Epipremnum aureum', cycle: 7, level: '喜湿', tip: '土表干了就浇，冬季减少。' },
    { name: '吊兰', scientific: 'Chlorophytum comosum', cycle: 7, level: '喜湿', tip: '保持盆土微润，忌积水。' },
    { name: '富贵竹', scientific: 'Dracaena sanderiana', cycle: 10, level: '水培', tip: '水培换水为主，土培见干见湿。' },
    { name: '多肉植物', scientific: 'Succulent', cycle: 14, level: '耐旱', tip: '宁干勿湿，夏季休眠控水。' },
    { name: '仙人掌', scientific: 'Cactaceae', cycle: 20, level: '耐旱', tip: '盆土完全干透再浇。' },
    { name: '月季', scientific: 'Rosa chinensis', cycle: 5, level: '喜湿', tip: '生长期需水多，早晚浇。' },
    { name: '茉莉', scientific: 'Jasminum sambac', cycle: 5, level: '喜湿', tip: '喜水怕涝，花期多浇。' },
    { name: '栀子花', scientific: 'Gardenia jasminoides', cycle: 5, level: '喜湿', tip: '保持湿润，缺铁易黄叶。' },
    { name: '薄荷', scientific: 'Mentha canadensis', cycle: 4, level: '喜湿', tip: '需水多，土表干即浇。' },
    { name: '发财树', scientific: 'Pachira aquatica', cycle: 15, level: '耐旱', tip: '怕涝，宁干勿湿。' },
    { name: '金钱树', scientific: 'Zamioculcas zamiifolia', cycle: 15, level: '耐旱', tip: '盆土干透再浇。' },
    { name: '幸福树', scientific: 'Radermachera sinica', cycle: 7, level: '喜湿', tip: '见干见湿，忌积水。' },
    { name: '橡皮树', scientific: 'Ficus elastica', cycle: 10, level: '中性', tip: '见干见湿。' },
    { name: '龟背竹', scientific: 'Monstera deliciosa', cycle: 7, level: '喜湿', tip: '保持湿润但不积水。' },
    { name: '琴叶榕', scientific: 'Ficus lyrata', cycle: 7, level: '喜湿', tip: '土表干即浇透。' },
    { name: '天堂鸟', scientific: 'Strelitzia reginae', cycle: 10, level: '中性', tip: '见干见湿。' },
    { name: '玫瑰', scientific: 'Rosa rugosa', cycle: 6, level: '喜湿', tip: '见干见湿，花期多水。' },
    { name: '绣球', scientific: 'Hydrangea', cycle: 4, level: '喜湿', tip: '需水多，夏季早晚浇。' },
    { name: '三角梅', scientific: 'Bougainvillea', cycle: 10, level: '耐旱', tip: '控水促花。' },
    { name: '君子兰', scientific: 'Clivia miniata', cycle: 10, level: '中性', tip: '见干见湿，忌积水。' },
    { name: '文竹', scientific: 'Asparagus setaceus', cycle: 7, level: '喜湿', tip: '保持湿润，忌暴晒。' },
    { name: '蕨类', scientific: 'Pteridophyta', cycle: 5, level: '喜湿', tip: '喜阴湿，常喷水。' },
    { name: '空气凤梨', scientific: 'Tillandsia', cycle: 3, level: '喷雾', tip: '每周喷水 2-3 次。' },
    { name: '蝴蝶兰', scientific: 'Phalaenopsis', cycle: 10, level: '中性', tip: '基质干透再浇。' },
    { name: '薰衣草', scientific: 'Lavandula', cycle: 12, level: '耐旱', tip: '耐旱怕涝。' },
    { name: '迷迭香', scientific: 'Rosmarinus officinalis', cycle: 12, level: '耐旱', tip: '盆土干透再浇。' },
    { name: '芦荟', scientific: 'Aloe vera', cycle: 15, level: '耐旱', tip: '宁干勿湿。' },
    { name: '虎皮兰', scientific: 'Sansevieria', cycle: 18, level: '耐旱', tip: '半个月左右一次。' },
    { name: '常春藤', scientific: 'Hedera helix', cycle: 7, level: '喜湿', tip: '见干见湿。' },
    { name: '白掌', scientific: 'Spathiphyllum', cycle: 6, level: '喜湿', tip: '缺水时叶片下垂。' },
    { name: '红掌', scientific: 'Anthurium', cycle: 7, level: '喜湿', tip: '保持湿润。' },
    { name: '铜钱草', scientific: 'Hydrocotyle vulgaris', cycle: 2, level: '水培', tip: '半水半土，需水多。' },
    { name: '睡莲', scientific: 'Nymphaea', cycle: 3, level: '水培', tip: '保持水位。' },
    { name: '荷花', scientific: 'Nelumbo nucifera', cycle: 3, level: '水培', tip: '保持水位。' }
  ]
  function search(keyword) {
    if (!keyword) return BUILTIN.slice(0, 20)
    var k = keyword.trim().toLowerCase()
    return BUILTIN.filter(function (p) {
      return p.name.toLowerCase().indexOf(k) >= 0 || p.scientific.toLowerCase().indexOf(k) >= 0
    })
  }
  global.WateringPlants = { BUILTIN: BUILTIN, search: search }
})(window)
