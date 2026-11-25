/* plants.js — 内置中文花卉库（含关键信息）+ 中文别名映射 */
(function (global) {
  'use strict'
  // info: { family:科属, light:光照, water:浇水要点, toxic:毒性, extra:其他要点 }
  var BUILTIN = [
    { name: '绿萝', scientific: 'Epipremnum aureum', cycle: 7, level: '喜湿', tip: '土表干了就浇，冬季减少。', info: { family: '天南星科', light: '耐阴，散射光', toxic: '汁液微毒，避免误食', extra: '可用水培，叶黄多因缺水或低温' } },
    { name: '吊兰', scientific: 'Chlorophytum comosum', cycle: 7, level: '喜湿', tip: '保持盆土微润，忌积水。', info: { family: '百合科', light: '半阴', toxic: '无毒', extra: '会抽匍匐茎，可剪小苗繁殖' } },
    { name: '富贵竹', scientific: 'Dracaena sanderiana', cycle: 10, level: '水培', tip: '水培换水为主，土培见干见湿。', info: { family: '天门冬科', light: '耐阴', toxic: '无毒', extra: '水培 2-3 周换一次水，避免烂根' } },
    { name: '多肉植物', scientific: 'Succulent', cycle: 14, level: '耐旱', tip: '宁干勿湿，夏季休眠控水。', info: { family: '多科属', light: '喜光', toxic: '多数无毒，少数汁液刺激', extra: '需要疏松透气颗粒土，忌积水' } },
    { name: '仙人掌', scientific: 'Cactaceae', cycle: 20, level: '耐旱', tip: '盆土完全干透再浇。', info: { family: '仙人掌科', light: '喜强光', toxic: '刺有毒，避免扎伤', extra: '冬季休眠几乎停水' } },
    { name: '月季', scientific: 'Rosa chinensis', cycle: 5, level: '喜湿', tip: '生长期需水多，早晚浇。', info: { family: '蔷薇科', light: '喜阳', toxic: '无毒', extra: '需勤修剪残花，注意白粉病' } },
    { name: '茉莉', scientific: 'Jasminum sambac', cycle: 5, level: '喜湿', tip: '喜水怕涝，花期多浇。', info: { family: '木犀科', light: '喜阳', toxic: '无毒', extra: '花香浓郁，花期需充足光照' } },
    { name: '栀子花', scientific: 'Gardenia jasminoides', cycle: 5, level: '喜湿', tip: '保持湿润，缺铁易黄叶。', info: { family: '茜草科', light: '喜光耐半阴', toxic: '无毒', extra: '喜酸性土，黄叶可补硫酸亚铁' } },
    { name: '薄荷', scientific: 'Mentha canadensis', cycle: 4, level: '喜湿', tip: '需水多，土表干即浇。', info: { family: '唇形科', light: '喜光耐半阴', toxic: '无毒可食用', extra: '长势快，建议单独盆栽防蔓延' } },
    { name: '发财树', scientific: 'Pachira aquatica', cycle: 15, level: '耐旱', tip: '怕涝，宁干勿湿。', info: { family: '木棉科', light: '明亮散射光', toxic: '无毒', extra: '根系浅，浇水过多极易烂根' } },
    { name: '金钱树', scientific: 'Zamioculcas zamiifolia', cycle: 15, level: '耐旱', tip: '盆土干透再浇。', info: { family: '天南星科', light: '耐阴', toxic: '汁液微毒', extra: '块茎储水，极少浇水也能活' } },
    { name: '幸福树', scientific: 'Radermachera sinica', cycle: 7, level: '喜湿', tip: '见干见湿，忌积水。', info: { family: '紫葳科', light: '散射光', toxic: '无毒', extra: '怕冷风，冬季注意保暖' } },
    { name: '橡皮树', scientific: 'Ficus elastica', cycle: 10, level: '中性', tip: '见干见湿。', info: { family: '桑科', light: '明亮散射光', toxic: '汁液微毒', extra: '叶片可擦拭除尘，喜温暖' } },
    { name: '龟背竹', scientific: 'Monstera deliciosa', cycle: 7, level: '喜湿', tip: '保持湿润但不积水。', info: { family: '天南星科', light: '散射光', toxic: '汁液微毒', extra: '可攀爬，需给支撑；叶裂是正常现象' } },
    { name: '琴叶榕', scientific: 'Ficus lyrata', cycle: 7, level: '喜湿', tip: '土表干即浇透。', info: { family: '桑科', light: '明亮散射光', toxic: '汁液微毒', extra: '怕移动，环境变化易掉叶' } },
    { name: '天堂鸟', scientific: 'Strelitzia reginae', cycle: 10, level: '中性', tip: '见干见湿。', info: { family: '旅人蕉科', light: '喜光', toxic: '无毒', extra: '需较大花盆，开花需充足光照' } },
    { name: '玫瑰', scientific: 'Rosa rugosa', cycle: 6, level: '喜湿', tip: '见干见湿，花期多水。', info: { family: '蔷薇科', light: '喜阳', toxic: '无毒', extra: '需通风防黑斑病' } },
    { name: '绣球', scientific: 'Hydrangea', cycle: 4, level: '喜湿', tip: '需水多，夏季早晚浇。', info: { family: '绣球花科', light: '半阴', toxic: '全株有毒', extra: '土壤酸碱决定花色：酸蓝碱红' } },
    { name: '三角梅', scientific: 'Bougainvillea', cycle: 10, level: '耐旱', tip: '控水促花。', info: { family: '紫茉莉科', light: '喜强光', toxic: '无毒', extra: '控水+充足光照才易开花' } },
    { name: '君子兰', scientific: 'Clivia miniata', cycle: 10, level: '中性', tip: '见干见湿，忌积水。', info: { family: '石蒜科', light: '半阴', toxic: '汁液微毒', extra: '需定期转盆，否则叶片长歪' } },
    { name: '文竹', scientific: 'Asparagus setaceus', cycle: 7, level: '喜湿', tip: '保持湿润，忌暴晒。', info: { family: '天门冬科', light: '半阴', toxic: '无毒', extra: '空气干燥时叶尖易发黄' } },
    { name: '蕨类', scientific: 'Pteridophyta', cycle: 5, level: '喜湿', tip: '喜阴湿，常喷水。', info: { family: '蕨类', light: '耐阴', toxic: '多数无毒', extra: '喜高湿度，怕干燥和暴晒' } },
    { name: '空气凤梨', scientific: 'Tillandsia', cycle: 3, level: '喷雾', tip: '每周喷水 2-3 次。', info: { family: '凤梨科', light: '明亮散射光', toxic: '无毒', extra: '无需土，靠叶面吸收水分' } },
    { name: '蝴蝶兰', scientific: 'Phalaenopsis', cycle: 10, level: '中性', tip: '基质干透再浇。', info: { family: '兰科', light: '散射光', toxic: '无毒', extra: '花期长，水苔基质干得慢要少浇' } },
    { name: '薰衣草', scientific: 'Lavandula', cycle: 12, level: '耐旱', tip: '耐旱怕涝。', info: { family: '唇形科', light: '喜强光', toxic: '无毒', extra: '需通风、碱性土，忌闷湿' } },
    { name: '迷迭香', scientific: 'Rosmarinus officinalis', cycle: 12, level: '耐旱', tip: '盆土干透再浇。', info: { family: '唇形科', light: '喜强光', toxic: '无毒可食用', extra: '耐修剪，可做香料' } },
    { name: '芦荟', scientific: 'Aloe vera', cycle: 15, level: '耐旱', tip: '宁干勿湿。', info: { family: '阿福花科', light: '喜光', toxic: '表皮汁液有刺激', extra: '冬季控水，怕积水烂根' } },
    { name: '虎皮兰', scientific: 'Sansevieria', cycle: 18, level: '耐旱', tip: '半个月左右一次。', info: { family: '天门冬科', light: '耐阴耐光', toxic: '汁液微毒', extra: '夜间释放氧气，适合卧室' } },
    { name: '常春藤', scientific: 'Hedera helix', cycle: 7, level: '喜湿', tip: '见干见湿。', info: { family: '五加科', light: '半阴', toxic: '全株有毒', extra: '可垂吊，避免宠物误食' } },
    { name: '白掌', scientific: 'Spathiphyllum', cycle: 6, level: '喜湿', tip: '缺水时叶片下垂。', info: { family: '天南星科', light: '耐阴', toxic: '汁液微毒', extra: '缺水时叶片会明显耷拉，是浇水信号' } },
    { name: '红掌', scientific: 'Anthurium', cycle: 7, level: '喜湿', tip: '保持湿润。', info: { family: '天南星科', light: '散射光', toxic: '汁液微毒', extra: '花期长，需保持高湿度' } },
    { name: '铜钱草', scientific: 'Hydrocotyle vulgaris', cycle: 2, level: '水培', tip: '半水半土，需水多。', info: { family: '伞形科', light: '喜光', toxic: '无毒', extra: '半水半土养最佳，长势极快' } },
    { name: '睡莲', scientific: 'Nymphaea', cycle: 3, level: '水培', tip: '保持水位。', info: { family: '睡莲科', light: '喜阳', toxic: '无毒', extra: '水面植物，夏季注意补水' } },
    { name: '荷花', scientific: 'Nelumbo nucifera', cycle: 3, level: '水培', tip: '保持水位。', info: { family: '莲科', light: '喜阳', toxic: '无毒', extra: '需充足光照和较大容器' } }
  ]

  // 常见中文别名/俗名 -> 学名（用于联网搜索桥接）
  var ALIASES = {
    '绿萝': ['Epipremnum aureum', 'Pothos', 'Devils Ivy', 'Scindapsus aureus'],
    '吊兰': ['Chlorophytum comosum', 'Spider Plant'],
    '富贵竹': ['Dracaena sanderiana', 'Lucky Bamboo'],
    '多肉': ['Succulent', 'Succulents'],
    '多肉植物': ['Succulent', 'Succulents'],
    '仙人掌': ['Cactaceae', 'Cactus'],
    '月季': ['Rosa chinensis', 'China Rose'],
    '玫瑰': ['Rosa rugosa', 'Rose'],
    '茉莉': ['Jasminum sambac', 'Jasmine'],
    '栀子花': ['Gardenia jasminoides', 'Gardenia'],
    '薄荷': ['Mentha canadensis', 'Mint'],
    '发财树': ['Pachira aquatica', 'Money Tree'],
    '金钱树': ['Zamioculcas zamiifolia', 'ZZ Plant'],
    '幸福树': ['Radermachera sinica', 'China Doll'],
    '橡皮树': ['Ficus elastica', 'Rubber Plant'],
    '龟背竹': ['Monstera deliciosa', 'Swiss Cheese Plant'],
    '龟背芋': ['Monstera deliciosa', 'Swiss Cheese Plant'],
    '琴叶榕': ['Ficus lyrata', 'Fiddle Leaf Fig'],
    '天堂鸟': ['Strelitzia reginae', 'Bird of Paradise'],
    '绣球': ['Hydrangea', 'Hydrangea macrophylla'],
    '八仙花': ['Hydrangea', 'Hydrangea macrophylla'],
    '三角梅': ['Bougainvillea'],
    '叶子花': ['Bougainvillea'],
    '君子兰': ['Clivia miniata', 'Kaffir Lily'],
    '文竹': ['Asparagus setaceus', 'Asparagus Fern'],
    '蕨类': ['Pteridophyta', 'Fern'],
    '空气凤梨': ['Tillandsia', 'Air Plant'],
    '蝴蝶兰': ['Phalaenopsis', 'Moth Orchid'],
    '薰衣草': ['Lavandula', 'Lavender'],
    '迷迭香': ['Rosmarinus officinalis', 'Rosemary'],
    '芦荟': ['Aloe vera', 'Aloe'],
    '虎皮兰': ['Sansevieria', 'Dracaena trifasciata', 'Snake Plant'],
    '常春藤': ['Hedera helix', 'English Ivy'],
    '白掌': ['Spathiphyllum', 'Peace Lily'],
    '一帆风顺': ['Spathiphyllum', 'Peace Lily'],
    '红掌': ['Anthurium', 'Flamingo Flower'],
    '铜钱草': ['Hydrocotyle vulgaris', 'Chinese Money Plant'],
    '睡莲': ['Nymphaea', 'Water Lily'],
    '荷花': ['Nelumbo nucifera', 'Lotus'],
    '莲花': ['Nelumbo nucifera', 'Lotus'],
    '百合': ['Lilium', 'Lily'],
    '向日葵': ['Helianthus annuus', 'Sunflower'],
    '太阳花': ['Helianthus annuus', 'Sunflower'],
    '竹芋': ['Calathea', 'Maranta'],
    '春羽': ['Philodendron selloum', 'Philodendron'],
    '鸭脚木': ['Schefflera', 'Umbrella Tree'],
    '鹅掌柴': ['Schefflera', 'Umbrella Tree']
  }

  function isChinese(s) { return /[\u4e00-\u9fa5]/.test(s || '') }

  function toSearchTerms(keyword) {
    var k = String(keyword || '').trim()
    if (!k) return []
    var terms = []
    function add(t) { if (t && terms.indexOf(t) < 0) terms.push(t) }
    if (ALIASES[k]) ALIASES[k].forEach(add)
    Object.keys(ALIASES).forEach(function (alias) {
      if (k.indexOf(alias) >= 0 || alias.indexOf(k) >= 0) ALIASES[alias].forEach(add)
    })
    BUILTIN.forEach(function (p) {
      if (p.name.indexOf(k) >= 0 || k.indexOf(p.name) >= 0) add(p.scientific)
    })
    if (!isChinese(k)) add(k)
    if (isChinese(k) && terms.length === 0) add(k)
    return terms
  }

  function search(keyword) {
    if (!keyword) return BUILTIN.slice(0, 20)
    var k = keyword.trim().toLowerCase()
    return BUILTIN.filter(function (p) {
      return p.name.toLowerCase().indexOf(k) >= 0 || p.scientific.toLowerCase().indexOf(k) >= 0
    })
  }
  function getByName(name) {
    return BUILTIN.filter(function (p) { return p.name === name || name.indexOf(p.name) >= 0 })[0] || null
  }

  global.WateringPlants = {
    BUILTIN: BUILTIN, ALIASES: ALIASES,
    search: search, getByName: getByName, toSearchTerms: toSearchTerms, isChinese: isChinese
  }
})(window)
