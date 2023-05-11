const $$$ = id => document.getElementById(id)
/**
 * @template T
 * @param {T[]} array
 */
function last(array) {
  return array[array.length - 1]
}
/**
 * @param {string} time
 */
function normalizeTime(time) {
  return time.replace(/\//g, "-")
}
/**
 * @template O
 * @template {keyof O} K
 * @param {O} obj
 * @param {K[]} props
 * @returns {{ [key in K]: O[K] }}
 */
function onlyProps(obj, props) {
  for (const prop in obj) {
    if (!props.includes(prop)) delete obj[prop]
  }
  return obj
}

/** @typedef {"100" | "200" | "301" | "302" | "400"} GachaType */
/** @typedef {"100" | "200" | "301" | "302"} UIGFGachaType */
/** @typedef {"char" | "weapon" | "std" | "novice"} GachaTypeName */
/** @typedef {"char" | "charLost5050" | "weapon" | "std"} PityType */
/** @typedef {"3" | "4" | "5"} Rarity */
/**
 * @typedef {{
 *   count: number,
 *   id: string,
 *   item_type: string,
 *   gacha_type: GachaType,
 *   name: string,
 *   rank_type: Rarity,
 *   time: string,
 *   uigf_gacha_type: UIGFGachaType,
 * }} GachaEntry
 */
/**
 * @typedef {{
 *   label: string,
 *   start: string,
 *   end: string,
 * }} VersionHalf
 */
/**
 * @typedef {{
 *   label: string,
 *   start: string,
 *   end: string,
 *   fiveStars: string[],
 *   fourStars: string[],
 * }} Banner
 */
/**
 * @typedef {{
 *   info: {
 *     uid: string,
 *     lang: string,
 *     export_timestamp?: number,
 *     export_app?: string,
 *     export_app_version?: string,
 *     uigf_version?: string,
 *   },
 *   list: GachaEntry[],
 * }} UIGFMergedHistory
 */

class PityTracker {
  constructor() {
    this.charPity = 0
    /** 当前处于大保底时，上次小保底歪时的抽数。 */
    this.charLost5050Pity = 0
    this.weaponPity = 0
    this.stdPity = 0
    this.charUncertain = true
    this.charLost5050Uncertain = false
    this.weaponUncertain = true
    this.stdUncertain = true
  }

  /** @type {PityType[]} */
  static pityTypes = ["char", "charLost5050", "weapon", "std"]

  /**
   * @param {GachaType} type
   * @returns {GachaTypeName}
   */
  static getGachaTypeName(type) {
    switch (type) {
      case "301":
      case "400":
        return "char"
      case "302":
        return "weapon"
      case "200":
        return "std"
      case "100":
        return "novice"
      default:
        throw new Error("PityTracker: invalid gacha type")
    }
  }

  // TODO: 检查常驻池来判断是否是歪常驻？
  // TODO: 3.0 甘雨池和心海池反了？？
  /**
   * @param {GachaType} type
   * @param {string} name
   * @param {Rarity} rarity
   * @param {Banner} banner
   */
  next(type, name, rarity, banner) {
    if (type === "100") return null

    const is5Star = rarity === "5"

    if (type === "301" || type === "400") {
      const pity = ++this.charPity
      const lost5050Pity = this.charLost5050Pity
      const uncertain = this.charUncertain
      const lost5050Uncertain = this.charLost5050Uncertain

      if (is5Star) {
        const isUp5Star = banner.fiveStars.includes(name)
        const won5050 = !lost5050Pity && isUp5Star
        this.charPity = 0
        this.charLost5050Pity = isUp5Star ? 0 : pity
        this.charUncertain = false
        this.charLost5050Uncertain = !isUp5Star && uncertain

        return {
          pity,
          is5Star,
          isUp5Star,
          won5050,
          lost5050Pity,
          uncertain,
          lost5050Uncertain,
          message: uncertain
            ? `第 ${pity} 抽？${isUp5Star ? "" : " · 歪"}`
            : lost5050Pity
            ? `大保底第 ${lost5050Pity}${
                lost5050Uncertain ? "？" : ""
              } + ${pity} 抽`
            : `小保底第 ${pity} 抽 · ${won5050 ? "没歪" : "歪"}`,
        }
      }

      return {
        pity,
        is5Star,
        lost5050Pity,
        uncertain,
        lost5050Uncertain,
        message: uncertain
          ? `第 ${pity} 抽？`
          : lost5050Pity
          ? `大保底第 ${lost5050Pity}${
              lost5050Uncertain ? "？" : ""
            } + ${pity} 抽`
          : `小保底第 ${pity} 抽`,
      }
    }

    const typeName = PityTracker.getGachaTypeName(type)
    const pityProp = typeName + "Pity"
    const uncertainProp = typeName + "Uncertain"

    const pity = ++this[pityProp]
    const uncertain = this[uncertainProp]
    if (is5Star) {
      this[pityProp] = 0
      this[uncertainProp] = false
    }

    const o = {
      pity,
      uncertain,
      message: `第 ${pity} 抽${uncertain ? "？" : ""}`,
    }

    if (type === "302" && is5Star) {
      const isUp5Star = banner.fiveStars.includes(name)
      o.isUp5Star = isUp5Star
      if (!isUp5Star) o.message += ` · 歪常驻`
    }

    return o
  }

  /**
   * @param {GachaType} type
   */
  stat(type) {
    if (type === "100") return null

    if (type === "301" || type === "400") {
      const pity = this.charPity
      const lost5050Pity = this.charLost5050Pity
      const uncertain = this.charUncertain
      const lost5050Uncertain = this.charLost5050Uncertain
      return {
        pity,
        lost5050Pity,
        uncertain,
        message: uncertain
          ? `${pity} 抽？`
          : lost5050Pity
          ? `大保底 ${lost5050Pity}${
              lost5050Uncertain ? "？" : ""
            } + ${pity} 抽`
          : `小保底 ${pity} 抽`,
      }
    }

    const typeName = PityTracker.getGachaTypeName(type)
    const pityProp = typeName + "Pity"
    const uncertainProp = typeName + "Uncertain"
    const pity = this[pityProp]
    const uncertain = this[uncertainProp]
    return {
      pity,
      uncertain,
      message: `${pity} 抽${uncertain ? "？" : ""}`,
    }
  }
}

/**
 * @param {string} aa
 * @param {string} bb
 */
function subtractTime(aa, bb) {
  let a = aa
  let b = bb
  if (a.length <= 10) a += " 00:00"
  if (b.length <= 10) b += " 00:00"
  a = Date.parse(a)
  b = Date.parse(b)
  if (isNaN(a)) throw `subtractTime: 左操作数（${aa}）无法解析`
  if (isNaN(b)) throw `subtractTime: 右操作数（${bb}）无法解析`
  return (a - b) / 1000
}

/**
 * @param {number} d
 */
function formatDur(d) {
  const sign = d < 0 ? "-" : ""
  const ad = Math.abs(d)

  //const secs  = ~~(ad /      1 % 60)
  const mins = ~~((ad / 60) % 60)
  const hours = ~~((ad / 3_600) % 24)
  const days = ~~(ad / 86_400)

  if (days) return `${sign}${days} 天 ${hours} 时`
  return `${sign}${hours} 时 ${mins} 分`
}

const datetimeRe =
  /^(2\d{3})[-/](0[1-9]|1[0-2])[-/]([0-2]\d|3[01]) ([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/
const entryProps = Object.freeze([
  "count",
  "gacha_type",
  "id",
  "item_type",
  "name",
  "rank_type",
  "time",
])
/** @type {VersionHalf[]} */
let versionHalves
/** @type {Banner[]} */
let eventBanners
/** @type {Banner[]} */
let stdBanners

/** @type {GachaEntry[]} */
let entryList = []
/** @type {string} */
let uid = null
let unsavedChanges = false

/**
 * @param {GachaEntry} e1
 * @param {GachaEntry} e2
 */
function compareEntries(e1, e2) {
  if (e1.time === e2.time) {
    if (e1.id.length === e2.id.length) {
      if (e1.id === e2.id) return 0
      return e1.id > e2.id ? 1 : -1
    }
    return e1.id.length > e2.id.length ? 1 : -1
  }
  return e1.time > e2.time ? 1 : -1
}

/**
 * @param {GachaType} type
 * @returns {UIGFGachaType}
 */
function toUIGFGachaType(type) {
  if (type === "400") return "301"
  return type
}

/**
 * @param {GachaEntry} entry
 */
function bisectEntry(entry) {
  let start = 0
  let end = entryList.length
  let mid = 0

  while (true) {
    if (start === end) return start
    mid = ~~((start + end) / 2)
    const d = compareEntries(entry, entryList[mid])
    if (d > 0) start = mid + 1
    else if (d < 0) end = mid
    else return mid
  }
}

/**
 * @param {GachaEntry[]} entries
 */
function addEntries(entries) {
  validateEntries(entries)
  entryList = mergeEntries(entries)
  updateEntryListStatus()
}

/** @param {GachaEntry[]} entries */
function validateEntries(entries) {
  if (!Array.isArray(entries)) throw "记录列表不是数组"
  if (entries.length < 1) throw "记录为空"

  for (const [i, entry] of entries.entries()) {
    if (typeof entry !== "object") throw `记录项 [${i}] 不是对象`
    ap(entry, "time", datetimeRe, i)
    ap(entry, "rank_type", ["3", "4", "5"], i)
    ap(entry, "gacha_type", ["200", "301", "302", "400"], i)
    typeof entry.id === "string" || ap(entry, "id", undefined, i)
    typeof entry.name === "string" || ap(entry, "name", undefined, i)

    onlyProps(entry, entryProps)
    entry.uigf_gacha_type = toUIGFGachaType(entry.gacha_type)
    entry.time = normalizeTime(entry.time)
  }
  entries.reverse()
  entries.sort(compareEntries)

  function ap(entry, attr, match, i) {
    const val = entry[attr]
    if (val === undefined) throw `记录项 ${i} 缺少属性 ${attr}`
    let info
    if (match instanceof RegExp) {
      if (typeof val === "string" && match.test(val)) return
      info = JSON.stringify(val)
    } else if (Array.isArray(match)) {
      if (match.includes(val)) return
      info = `${quot(val)}，应为 ${quot(match)}`
    } else if (match !== undefined) {
      if (match === val) return
      info = `${quot(val)}，应为${quot(match)}`
    }
    info = `记录项 ${i} 的属性 ${attr} 不正确${info ? `：${info}` : ""}`
    throw info
  }
  function quot(val) {
    if (typeof val === "string") return JSON.stringify(val)
    if (Array.isArray(val)) return val.map(quot).join(", ")
    return String(val)
  }
}

/** @param {GachaEntry[]} newEntries */
function mergeEntries(newEntries) {
  if (entryList.length === 0) return newEntries

  let existingI = bisectEntry(newEntries[0])
  let mergedEntries = entryList.slice(0, existingI)
  /** @param {GachaEntry[]} */
  let tailEntries

  let newI = 0
  while (true) {
    const newEntry = newEntries[newI]
    const existingEntry = entryList[existingI]

    const d = compareEntries(newEntry, existingEntry)
    const earlierEntry = d < 0 ? newEntry : existingEntry
    mergedEntries.push(earlierEntry)

    if (d <= 0) newI++
    if (d >= 0) existingI++

    if (newI === newEntries.length) {
      tailEntries = entryList.slice(existingI)
      break
    }
    if (existingI === entryList.length) {
      tailEntries = newEntries.slice(newI)
      break
    }
  }

  mergedEntries = mergedEntries.concat(tailEntries)
  return mergedEntries
}

function updateEntryListStatus() {
  const empty = entryList.length === 0
  $$$("files-clearbtn").disabled = empty
  $$$("renderbtn").disabled = empty
  $$$("exportbtn").disabled = empty
  if (empty) {
    $$$("files-status").textContent = "未选择记录"
    return
  }

  const firstTime = entryList[0].time
  const lastTime = last(entryList).time
  const status = `已导入 UID ${uid} 从 ${firstTime} 到 ${lastTime} 的 ${entryList.length} 条记录`

  $$$("files-status").textContent = status
}

/** @param {UIGFMergedHistory} data */
function importUIGF(data) {
  const { info, list } = data

  if (info && info.lang && info.lang !== "zh-cn")
    throw "暂不支持导入简体中文以外语言的记录"
  if (uid === null) {
    uid = (info && info.uid && String(info.uid)) || null
  } else {
    if (info && info.uid && String(info.uid) !== uid)
      throw `只能导入同一账号的记录：已导入记录来自 UID ${uid}，正在导入的记录来自 UID ${info.uid}`
  }

  addEntries(list)
}

/**
 * @param {string} str
 * @param {string} key
 */
function findSearchParam(str, key) {
  const re = new RegExp(String.raw`(?:^|[?&])${key}=([^&]*)`)
  const match = str.match(re)
  return match ? decodeURIComponent(match[1]) : undefined
}

/** @param {Record<string, string>} record */
function makeQueryString(record) {
  return Object.entries(record)
    .map(e => e.map(encodeURIComponent).join("="))
    .join("&")
}

/**
 * 修复服务器有时自动追加访问量统计 HTML 代码的问题
 * @param {string} json
 */
function fixJSON(json) {
  json = json.match(/^((?:"[^"]*"|[^<])*)/)[1].trim()
  if (!json) throw "会话失效，请刷新页面。若有未保存的数据，请注意保存！"
  return json
}

/**
 * @param {string} urlStr
 */
async function fetchEntries(urlStr) {
  const perPage = 20
  const neededParams = [
    "authkey_ver",
    "sign_type",
    "auth_appid",
    "region",
    "authkey",
  ]
  /** @type {[UIGFGachaType, string][]} */
  const types = [
    ["301", "角色"],
    ["302", "武器"],
    ["100", "新手"],
    ["200", "常驻"],
  ]

  /** @type {Record<string, string>} */
  let params = {}
  for (const key of neededParams) {
    const val = findSearchParam(urlStr, key)
    if (!val) throw `输入网址中缺少参数 ${key}`
    params[key] = val
  }
  params.lang = "zh-cn"
  params.size = perPage

  const host =
    urlStr.includes("hoyoverse") || params.region.startsWith("os")
      ? "hk4e-api-os.hoyoverse.com"
      : "hk4e-api.mihoyo.com"
  const baseURL = `proxy.php?https://${host}/event/gacha_info/api/getGachaLog`

  /** @type {GachaEntry[][]} */
  const pages = []
  for (const [type, typeName] of types) {
    let next = ""
    let page = 1

    params.gacha_type = type
    while (true) {
      params.page = page
      params.end_id = next
      log(`${typeName}池 第 ${page} 页…`)

      const resp = await fetch(`${baseURL}?${makeQueryString(params)}`)
      const json = fixJSON(await resp.text())
      /**
       * @type {{
       *   retcode: number,
       *   message: string,
       *   data: { list: GachaEntry[] } | null,
       * }}
       */
      let obj
      try {
        obj = JSON.parse(json)
      } catch (e) {
        if (resp.status >= 400) throw `HTTP ${resp.status} ${resp.statusText}`
        throw e
      }
      if (!obj.data)
        throw `${obj.message || "未知错误"}（错误码 ${obj.retcode}）`
      const list = obj.data.list
      pages.push(list)

      if (list.length < perPage) break
      next = last(list).id
      page++
    }
  }

  const list = Array.prototype.concat(...pages)
  if (list.length === 0) throw "查询结果全为空"

  list.reverse()
  list.sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0))
  importUIGF({
    info: {
      uid: list[0].uid,
      lang: "zh-cn",
    },
    list,
  })

  /** @param {string} str */
  function log(str) {
    $$$("files-url-log").textContent = str
  }
}

function clearEntries() {
  entryList.length = 0
  uid = null
  updateEntryListStatus()
}

/**
 * @param {string} time
 */
function findVerHalf(time) {
  return versionHalves.findLast(vs => time >= vs.start)
}

/** @type {Banner} */
const noviceBanner = {
  label: "新手池",
  fiveStars: [],
  fourStars: [],
}
/**
 * @param {GachaType} type
 * @param {string} time
 * @returns {Banner}
 */
function findBanner(type, time) {
  if (type === "100") return noviceBanner
  const banners = type === "200" ? stdBanners : eventBanners
  const banner = banners.findLast(vs => type === vs.type && time >= vs.start)
  if (!banner) throw "找不到抽卡记录对应的卡池信息"
  return banner
}

function mobileTooltip(event) {
  if (this.title) {
    alert(this.title)
  }
}

/**
 * @template P
 * @template {HTMLElement} T
 * @param {P} parent
 * @param {string} name
 * @param {Partial<T>} o
 * @returns {P extends Node ? T : unknown}
 */
function $E(parent, name, o) {
  if (!(parent instanceof Node)) return parent
  const $e = parent.ownerDocument.createElement(name)
  Object.assign($e, o)
  parent.appendChild($e)
  return $e
}

function render({ showStd = false } = {}) {
  const $container = document.createDocumentFragment()

  let $verHalf
  /** @param {VersionHalf} verHalf */
  function newVerHalf(verHalf) {
    $verHalf = $E($container, "div", {
      className: "lvl-1",
    })
    $E($verHalf, "h3", {
      className: "sticky sticky-1",
      textContent: verHalf.label,
    })
  }

  let $day
  /** @param {string} date */
  function newDay(date) {
    $day = $E($verHalf, "div", {
      className: "lvl-2",
    })
    $E($day, "h4", {
      className: "sticky sticky-2",
      textContent: date.replace(/-/g, "/"),
    })
  }

  let $time
  /**
   * @param {string} time
   * @param {string} datetime
   * @param {GachaType} type
   * @param {Banner} banner
   */
  function newTime(time, datetime, type, banner) {
    $time = $E($day, "div", {
      className: "lvl-3",
    })
    const $header = $E($time, "h5", {
      className: "sticky sticky-3",
      textContent: time.replace(/:\d\d$/, ""),
    })

    const info = [banner.label]

    if (type >= "301")
      info.push(`剩余 ${formatDur(subtractTime(banner.end, datetime))}`)

    let tooltip = null
    if (banner.type !== "100") {
      info.push(pity.stat(type).message)

      const bannerType = {
        301: "角色池",
        400: "角色池2",
        302: "武器池",
        200: "常驻池",
      }[banner.type]
      tooltip = bannerType + "\n"
      tooltip += `${banner.start} 至 ${banner.end}\n\n`

      const maxChars = Math.max(
        ...[...banner.fiveStars, ...banner.fourStars].map(n => n.length)
      )
      tooltip += banner.fiveStars
        .map(n => `${n.padStart(maxChars, "\u3000")} ★★★★★`)
        .join("\n")
      if (banner.fourStars && banner.fourStars.length) {
        tooltip += "\n"
        tooltip += banner.fourStars
          .map(n => `${n.padStart(maxChars, "\u3000")} ★★★★`)
          .join("\n")
      }
    }

    $E($header, "div", {
      className: `bannertime ${tooltip ? "mobiletooltip" : ""}`,
      textContent: info.join(" · "),
      title: tooltip,
      onclick: tooltip && mobileTooltip,
    })
  }

  const pity = new PityTracker()

  let prevVerHalf = null
  let prevDay = ""
  let recentTime = ""
  let prevTime = ""
  let prevBanner = null
  //newVerHalf(prevVerHalf)

  let $threeStars
  let threeStars = 0

  let tenPullIndex = -1
  let $tenFives, $tenFours, $tenThrees

  for (const [ei, entry] of entryList.entries()) {
    const type = entry.gacha_type
    if (type < "301" && !showStd) continue
    const time = entry.time

    const [date, dayTime] = time.split(" ")
    const verHalf = findVerHalf(time)
    const banner = findBanner(type, time)

    switch (true) {
      case verHalf !== prevVerHalf:
        newVerHalf(verHalf)
      // fallthrough
      case date !== prevDate:
        newDay(date)
      // fallthrough
      case !(recentTime && subtractTime(time, recentTime) < 300) ||
        banner !== prevBanner: {
        newTime(dayTime, time, type, banner)
        recentTime = time
        threeStars = 0
      }
    }
    prevVerHalf = verHalf
    prevDate = date
    prevTime = time
    prevBanner = banner

    if (
      tenPullIndex === -1 &&
      entryList[ei + 9] &&
      entryList[ei + 9].gacha_type === type &&
      entryList[ei + 9].time === time
    ) {
      tenPullIndex = 0
      threeStars = 0
      const $parent = $E($time, "div", {
        className: "tenpulls",
      })
      $E($parent, "div", {
        className: "tenpulls-label",
        textContent: "十连抽",
      })
      $tenFives = $E($parent, "div", {
        className: "tenpulls-items tenpulls-items-5",
      })
      $tenFours = $E($parent, "div", {
        className: "tenpulls-items tenpulls-items-4",
      })
      $tenThrees = document.createDocumentFragment()
    }

    const name = entry.name
    const rarity = entry.rank_type
    const pityMsg = pity.next(type, name, rarity, banner).message

    const $parent =
      tenPullIndex !== -1
        ? { 3: $tenThrees, 4: $tenFours, 5: $tenFives }[rarity]
        : $time

    if (threeStars && rarity === "3") {
      $threeStars.firstElementChild.textContent = `(${++threeStars})`
    } else {
      let tooltip = ""
      if (rarity !== "3") {
        const stars = "★".repeat(+rarity)
        tooltip = `${entry.time}\n${entry.name} ${stars}\n${pityMsg}`
        if (tenPullIndex !== -1)
          tooltip += `\n十连抽中的第 ${tenPullIndex + 1} 抽`
      }

      const $item = $E($parent, "div", {
        className: `item item-${rarity} ${tooltip ? "mobiletooltip" : ""}`,
        title: tooltip,
        onclick: tooltip && mobileTooltip,
      })
      $E($item, "div", {
        className: "item-name",
        textContent: rarity === "3" ? "(1)" : name,
      })
      if (rarity === "5") {
        $E($item, "div", {
          className: "item-info",
          textContent: pityMsg,
        })
      }
      if (rarity === "3") {
        threeStars++
        $threeStars = $item
      } else if (tenPullIndex === -1) {
        threeStars = 0
      }
    }

    if (tenPullIndex !== -1 && ++tenPullIndex === 10) {
      tenPullIndex = -1
      if (!$tenFives.firstChild) $tenFives.remove()
      if (!$tenFours.firstChild) $tenFours.remove()
      if ($threeStars) $tenFours.appendChild($threeStars)
      threeStars = 0
    }
  }

  const $footinfo = $E($container, "div", {
    className: "footinfo",
    textContent: "已垫抽数",
  })
  $E($footinfo, "div", {
    textContent: `角色：${pity.stat("301").message}`,
  })
  $E($footinfo, "div", {
    textContent: `武器：${pity.stat("302").message}`,
  })
  if (showStd) {
    $E($footinfo, "div", {
      textContent: `常驻：${pity.stat("200").message}`,
    })
  }

  const $wrap = $$$("section-render")
  $wrap.textContent = ""
  $wrap.appendChild($container)
}

/** @param {BeforeUnloadEvent} ev */
function beforeUnloadHandler(ev) {
  ev.preventDefault()
}

function changesSaved() {
  unsavedChanges = false
  window.onbeforeunload = null
  $$$("exportbtn").classList.remove("hint")
}

function initialize() {
  $$$("files-input").onchange = async function () {
    const file = this.files[0]
    if (!file) return
    const oldEntryCount = entryList.length
    try {
      const json = await file.text()
      const data = JSON.parse(json)
      importUIGF(data)
    } catch (err) {
      alert(`读取记录出错😭\n${err}`)
      throw err
    }
    alert(`导入成功😋\n新增 ${entryList.length - oldEntryCount} 条记录`)
  }
  $$$("files-url-okbtn").onclick = async function () {
    this.disabled = true
    const oldEntryCount = entryList.length
    try {
      await fetchEntries($$$("files-url").value)
    } catch (err) {
      alert(`获取失败😭\n${err}`)
      throw err
    } finally {
      $$$("files-url-log").textContent = ""
      this.disabled = false
    }
    alert(
      `获取成功😋\n新增 ${entryList.length - oldEntryCount} 条记录\n` +
        "本程序暂不能记忆历史抽卡记录，请记得导出并保存你的抽卡记录到本地！"
    )
    unsavedChanges = true
    window.onbeforeunload = beforeUnloadHandler
    $$$("exportbtn").classList.add("hint")
  }
  $$$("files-clearbtn").onclick = () => {
    if (unsavedChanges && !confirm("即将丢弃未保存的记录，确定继续？")) return
    clearEntries()
    changesSaved()
  }
  $$$("renderbtn").onclick = () => {
    try {
      render({
        showStd: $$$("option-showstd").checked,
      })
    } catch (err) {
      alert(`加载出错😭\n${err}`)
      throw err
    }
  }
  $$$("exportbtn").onclick = () => {
    /** @type {UIGFMergedHistory} */
    const obj = {
      info: {
        uid,
        lang: "zh-cn",
        export_timestamp: Math.floor(Date.now() / 1000),
        export_app: "dgck81lnn gi gacha visualize",
        export_app_version: "v0.1",
        uigf_version: "v2.3",
      },
      list: entryList.slice(0).reverse(),
    }
    const blob = new Blob([JSON.stringify(obj)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const time = last(entryList).time
    const $link = document.createElement("a")
    $link.href = url
    $link.download = `抽卡记录 ${uid} ${time}.json`
    $link.click()

    changesSaved()

    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 60000)
  }

  updateEntryListStatus()
}

fetch("banners.json")
  .then(resp => resp.text())
  .then(fixJSON)
  .then(JSON.parse)
  .then(data => {
    ;({ versionHalves, eventBanners, stdBanners } = data)
    initialize()
  })
  .catch(err => {
    $$$("files-status").textContent = "加载失败，刷新页面？"
    alert(`加载卡池数据失败😭\n${err}`)
    throw err
  })
