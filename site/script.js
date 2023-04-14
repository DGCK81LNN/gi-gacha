const $$$ = document.getElementById.bind(document)
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

/** @typedef {"200" | "301" | "302" | "400"} GachaType */
/** @typedef {"200" | "301" | "302"} UIGFGachaType */
/** @typedef {"char" | "weapon" | "std"} GachaTypeName */
/** @typedef {"char" | "charLost5050" | "weapon" | "std"} PityType */
/** @typedef {"3" | "4" | "5"} Rarity */
/**
 * @typedef {{
 *   time: string,
 *   rank_type: Rarity,
 *   id: string,
 *   gacha_type: GachaType,
 *   name: string,
 *   uigf_gacha_type: UIGFGachaType,
 * }} GachaEntry
 */
/** @typedef {GachaEntry[] & { $pi?: Node }} Segment */
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
 *   soulGIGacha: "v1",
 *   uid: string,
 *   segments: GachaEntry[][],
 *   pityInit: PityInit,
 * }} MergedHistoryV1
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
/** @interface */
class PityInit {
  /** @type {number} */ charPity
  /** @type {number} */ charLost5050Pity
  /** @type {number} */ weaponPity
  /** @type {number} */ stdPity
  /** @type {boolean} */ charUncertain
  /** @type {boolean} */ charLost5050Uncertain
  /** @type {boolean} */ weaponUncertain
  /** @type {boolean} */ stdUncertain
}

/** @implements {PityInit} */
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
      default:
        throw new Error("PityTracker: invalid gacha type")
    }
  }

  /**
   * @param {GachaType} type
   * @param {string} name
   * @param {Rarity} rarity
   * @param {Banner} banner
   */
  next(type, name, rarity, banner) {
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

    return {
      pity,
      uncertain,
      message: `第 ${pity} 抽${uncertain ? "？" : ""}`,
    }
  }

  /**
   * @param {GachaType} type
   */
  stat(type) {
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
 * @param {string} a
 * @param {string} b
 */
function subtractTime(a, b) {
  if (typeof a === "string") a = Date.parse(a)
  if (typeof b === "string") b = Date.parse(b)
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
  "time",
  "rank_type",
  "id",
  "gacha_type",
  "name",
])
/** @type {VersionHalf[]} */
let versionHalves
/** @type {Banner[]} */
let eventBanners
/** @type {Banner[]} */
let stdBanners

/** @type {Segment[]} */
const segments = []
let entryCount = 0
let uid = null

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
 * @param {GachaEntry} entry
 * @returns {[number, number]}
 */
function bisectEntry(entry) {
  let start = 0
  let end = segments.length
  let mid = 0

  while (true) {
    if (start === end) return [start, 0]
    //_adl()
    mid = ~~((start + end) / 2)
    if (compareEntries(entry, last(segments[mid])) > 0) start = mid + 1
    else if (compareEntries(entry, segments[mid][0]) < 0) end = mid
    else break
  }

  const x = mid
  const segment = segments[x]
  start = 0
  end = segment.length
  while (true) {
    if (start === end) return [x, start]
    //_adl()
    mid = ~~((start + end) / 2)
    const d = compareEntries(entry, segment[mid])
    if (d > 0) start = mid + 1
    else if (d < 0) end = mid
    else return [x, mid]
  }
}

/**
 * @param {GachaEntry[] | MergedHistoryV1} entries
 * @param {string} [_uid=]
 */
function addEntries(entries, _uid) {
  // TODO: switch to UIGF.J format
  if (entries.soulGIGacha === "v1") {
    entries.segments.forEach((seg, i) => {
      let newSegI
      try {
        newSegI = addEntries(seg, entries.uid)
      } catch (err) {
        if (entries.segments.length > 1 && typeof err === "string")
          throw `导入合并记录的第 ${i + 1} 段时，${err}`
        throw err
      }
      if (
        entries.pityInit &&
        compareEntries(seg[0], segments[newSegI][0]) === 0
      ) {
        reversePityInit(entries.pityInit[i], segments[newSegI])
      }
    })
    return
  }

  if (_uid) entries[0].uid = _uid
  if (!validateEntries(entries)) return

  //const oldCount = entryCount
  let segmentIndex = 0

  if (segments.length === 0) {
    segments.push(entries)
  } else {
    const [x1, y1, x2, y2, mergedEntries] = findOverlap(entries)
    const pre = (segments[x1] || []).slice(0, y1)
    const post = (segments[x2] || []).slice(y2)
    const start = x1
    const end = x2 + 1
    const replacement = [].concat(pre, mergedEntries, post)
    if (!pre.length && compareEntries(mergedEntries[0], entries[0]) === 0)
      replacement.$pi = entries.$pi
    segments.splice(start, end - start, replacement)
    segmentIndex = x1
  }

  updateSegmentsStatus()
  return segmentIndex

  /**
   * @param {GachaEntry[]} entries
   * @returns {[number, number, number, number, GachaEntry[]]}
   */
  function findOverlap(entries) {
    //const start = bisectEntry(entries[0])
    //if (!start)
    //  throw `新记录与已导入记录不匹配：首条记录（${entries[0].time}）在已导入记录所覆盖的时间范围内，但在已有记录中未找到该条记录`
    const [x1, y1] = bisectEntry(entries[0])
    let x2 = x1
    let y2 = y1
    let i = 0
    const mergedEntries = []

    //_adl(1)
    outer: while (x2 < segments.length) {
      while (y2 < segments[x2].length) {
        //_adl()
        const entry = entries[i]
        const d = compareEntries(entry, segments[x2][y2])
        if (d >= 0) {
          mergedEntries.push(segments[x2][y2++])
          if (d > 0) continue
        } else {
          mergedEntries.push(entry)
        }
        if (++i === entries.length) break outer
      }
      x2++
      y2 = 0
    }
    if (y2 === 0 && x2 > x1) {
      x2--
      y2 = segments[x2].length
    }

    return [x1, y1, x2, y2, mergedEntries]
  }
}

/**
 * @param {unknown} entries
 * @returns {entries is GachaEntry[]}
 */
function validateEntries(entries) {
  if (!Array.isArray(entries)) throw "数据对象不是数组"
  if (entries.length < 1) throw "数据数组为空"

  if (!segments.length) {
    if (entries[0].uid === undefined) throw "数据项缺少 UID"
    if (typeof entries[0].uid !== "string")
      ap(entry, "uid", undefined, 0, "UID 不是字符串")
    uid = entries[0].uid
  }

  for (let i = 0, len = entries.length; i < len; i++) {
    const entry = entries[i]
    if (typeof entry !== "object") throw `记录条目 ${i} 不是对象`
    ap(entry, "time", datetimeRe, i)
    "lang" in entry && ap(entry, "lang", "zh-cn", i)
    ap(entry, "rank_type", ["3", "4", "5"], i)
    ap(entry, "gacha_type", ["200", "301", "302", "400"], i)
    typeof entry.id === "string" || ap(entry, "id", undefined, i)
    typeof entry.name === "string" || ap(entry, "name", undefined, i)

    onlyProps(entry, entryProps)
    entry.time = normalizeTime(entry.time)
  }
  entries.sort(compareEntries)
  return true

  function ap(entry, attr, match, i, msg) {
    const val = entry[attr]
    if (val === undefined) throw `记录条目 ${i} 缺少属性 ${attr}`
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
    info = `记录条目 ${i} 的属性 ${attr} 不正确${info ? `：${info}` : ""}`
    if (msg) throw `${mag}（${info}）`
    throw info
  }
  function quot(val) {
    if (typeof val === "string") return JSON.stringify(val)
    if (Array.isArray(val)) return val.map(quot).join(", ")
    return String(val)
  }
}

function updateSegmentsStatus() {
  const empty = segments.length === 0
  $$$("files-clearbtn").disabled = empty
  $$$("renderbtn").disabled = empty
  $$$("exportbtn").disabled = empty
  if (empty) {
    entryCount = 0
    $$$("files-status").textContent = "未选择记录"
    $$$("option-pityinit").textContent = "等待选择记录…"
    return
  }

  entryCount = segments.reduce((sum, seg) => sum + seg.length, 0)
  const segTimes = segments
    .map(segment => `从 ${segment[0].time} 到 ${last(segment).time}`)
    .join("、")

  $$$(
    "files-status"
  ).textContent = `已导入 UID: ${uid} ${segTimes} 的共 ${entryCount} 条记录`
  $$$("option-pityinit").textContent = ""

  const $pilist = document.createDocumentFragment()
  const $template = $$$("template-pityinit-table").content
  for (const segment of segments) {
    if (segment.$pi) {
      $pilist.appendChild(segment.$pi)
      continue
    }
    const $pi = $E($pilist, "li")
    segment.$pi = $pi
    $E($pi, "div", {
      textContent: segment[0].time,
    })
    $pi.appendChild($template.cloneNode(true))
  }
  $$$("option-pityinit").appendChild($pilist)
}

function clearEntries() {
  segments.length = 0
  updateSegmentsStatus()
}

/**
 * @param {string} time
 */
function findVerHalf(time) {
  return versionHalves.findLast(vs => subtractTime(time, vs.start) >= 0)
}

/**
 * @param {GachaType} type
 * @param {string} time
 * @returns {Banner}
 */
function findBanner(type, time) {
  const banners = type === "200" ? stdBanners : eventBanners
  time = time.replace(/-/g, "/")
  const banner = banners.findLast(
    vs => type === vs.type && subtractTime(time, vs.start) >= 0
  )
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

/**
 * @param {PityInit} pity
 * @param {{ $pi: Node }} seg
 */
function pityInit(pity, seg) {
  const $pi = seg.$pi
  const inputs = [...$pi.querySelectorAll("input")]
  for (const type of PityTracker.pityTypes) {
    const $i = inputs.find($i => $i.name === type)
    const val = $i.value
    const numVal = parseInt(val) | 0
    if (val) pity[`${type}Pity`] = numVal
    pity[`${type}Uncertain`] = !val

    $i.value = val && numVal
  }
}
/**
 * 用于从保存的合并记录中恢复保底计数器初始化数值。
 * @param {PityInit} pity
 * @param {{ $pi: Node }} seg
 */
function reversePityInit(pity, seg) {
  const $pi = seg.$pi
  const inputs = [...$pi.querySelectorAll("input")]
  for (const type of PityTracker.pityTypes) {
    const $i = inputs.find($i => $i.name === type)
    if (!pity[`${type}Uncertain`]) $i.value = pity[`${type}Pity`]
  }
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
   * @param {string} info
   * @param {Banner} banner
   */
  function newTime(time, info, banner) {
    $time = $E($day, "div", {
      className: "lvl-3",
    })
    const $header = $E($time, "h5", {
      className: "sticky sticky-3",
      textContent: time,
    })

    let tooltip = null
    if (banner.type >= "301") {
      const bannerType = {
        301: "角色池",
        400: "角色池2",
        302: "武器池",
      }[banner.type]
      tooltip = bannerType + "\n"
      tooltip += `${banner.start} 至 ${banner.end}\n\n`

      const maxChars = Math.max(
        ...[...banner.fiveStars, ...banner.fourStars].map(n => n.length)
      )
      tooltip += banner.fiveStars
        .map(n => `${n.padStart(maxChars, "\u3000")} ★★★★★`)
        .join("\n")
      tooltip += "\n"
      tooltip += banner.fourStars
        .map(n => `${n.padStart(maxChars, "\u3000")} ★★★★`)
        .join("\n")
    }

    $E($header, "div", {
      className: `bannertime ${tooltip ? "mobiletooltip" : ""}`,
      textContent: info,
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

  //let segmentIndex = 0
  pityInit(pity, segments[0])

  for (const seg of segments) {
    pityInit(pity, seg)

    let tenPullIndex = -1
    let $tenFives, $tenFours, $tenThrees

    for (const [ei, entry] of seg.entries()) {
      const type = entry.gacha_type
      if (type === "200" && !showStd) continue
      const time = entry.time

      const [date, dayTime] = time.split(" ")
      const displayTime = dayTime.replace(/:\d\d$/, "")
      const verHalf = findVerHalf(time)
      const banner = findBanner(type, time)

      switch (true) {
        case verHalf !== prevVerHalf:
          newVerHalf(verHalf)
        // fallthrough
        case date !== prevDate:
          newDay(displayDate)
        // fallthrough
        case !(recentTime && subtractTime(time, recentTime) < 300) ||
          banner !== prevBanner: {
          const info = [banner.label, pity.stat(type).message]
          if (type !== "200")
            info.push(`剩余 ${formatDur(subtractTime(banner.end, time))}`)
          newTime(displayTime, info.join(" · "), banner)
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
        seg[ei + 9] &&
        seg[ei + 9].type === type &&
        seg[ei + 9].time === time
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

      const $parent = tenPullIndex !== -1
        ? { 3: $tenThrees, 4: $tenFours, 5: $tenFives }[rarity]
        : $time

      if (threeStars && rarity === "3") {
        //if ($threeStars)
        $threeStars.firstElementChild.textContent = `(${++threeStars})`
        continue
      }

      const stars = "★".repeat(+rarity)
      let tooltip = ""
      if (rarity !== "3") {
        tooltip = `${entry.time}\n${entry.name} ${stars}\n${pityMsg}`
        if (tenPullIndex !== -1) tooltip += `\n十连抽中的第 ${tenPullIndex + 1} 抽`
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

      if (tenPullIndex !== -1) {
        tenPullIndex++
        if (tenPullIndex === 9) {
          tenPullIndex = -1
          if (!$tenFives.firstChild) $tenFives.remove()
          if (!$tenFours.firstChild) $tenFours.remove()
          if ($threeStars) $tenFours.appendChild($threeStars)
          threeStars = 0
        }
      }
    } // end for entry of seg
  } // end for seg of segments

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

function initialize() {
  $$$("files-input").onchange = async function () {
    const file = this.files[0]
    if (!file) return
    try {
      const json = await file.text()
      const entries = JSON.parse(json)
      const oldEntryCount = entryCount
      addEntries(entries)
      alert(`导入成功😋\n新增 ${entryCount - oldEntryCount} 条记录`)
    } catch (err) {
      alert(`读取记录出错😭\n${err}`)
      throw err
    }
  }
  $$$("files-clearbtn").onclick = () => {
    clearEntries()
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
    const obj = {
      soulGIGacha: "v1",
      uid,
      segments,
      pityInit: segments.map(seg => {
        const record = {}
        pityInit(record, seg)
        return record
      }),
    }
    const blob = new Blob([JSON.stringify(obj)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const time = last(last(segments)).time.replace(/\//g, "-")
    const $link = document.createElement("a")
    $link.href = url
    $link.download = `抽卡记录 ${uid} ${time}.json`
    $link.click()

    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 60000)
  }

  updateSegmentsStatus()
}

fetch("banners.json")
  .then(resp => resp.text())
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
