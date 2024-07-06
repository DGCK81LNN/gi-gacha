#!/usr/bin/env node

/// <reference path="../types.d.ts" />
import path from "node:path"
import fsp from "node:fs/promises"
import axios from "axios"
import jsonDiff from "json-diff"

/** @param {string} ymd */
function roundToDay(ymd) {
  let date = new Date(`${ymd}+0000`)
  date = new Date(Math.round(+date / 86_400_000) * 86_400_000)
  return date.toISOString().split("T")[0]
}

/**
 * @template {string | number} K
 * @template {string | number} V
 * @param {Record<K, V>} dict
 * @returns {Record<V, string>}
 */
function invertDict(dict) {
  return Object.fromEntries(
    Object.entries(dict)
      .map(ent => ent.reverse())
      .reverse()
  )
}

/** @type {Record<string, string>} */
const charaShortNames = {
  达达利亚: "公子",
  枫原万叶: "万叶",
  神里绫华: "绫华",
  雷电将军: "雷神",
  珊瑚宫心海: "心海",
  荒泷一斗: "一斗",
  八重神子: "神子",
  神里绫人: "绫人",
  纳西妲: "草神",
  流浪者: "散兵",
  艾尔海森: "海森",
  那维莱特: "那维",
  莱欧斯利: "莱欧",
  芙宁娜: "水神",
  阿蕾奇诺: "仆人",
}
/**
 * @param {string} type
 * @param {string} fiveStars
 */
function getEventBannerLabel(type, fiveStars) {
  if (type === "500") return "集录"
  if (type === "302") return "武器"
  const charaName = fiveStars[0]
  if (charaShortNames.hasOwnProperty(charaName))
    return charaShortNames[charaName]
  return charaName
}

async function makeBannerData() {
  // 从 UIGF.org 获取物品名称、ID 对照表
  /**
   * @param {string} lang
   */
  async function getDict(lang) {
    /** @type {{ data: Record<string, number> }} */
    const { data } = await axios({
      url: `https://api.uigf.org/dict/genshin/${lang}.json`,
      responseType: "json",
    })
    for (const name in data) {
      const id = data[name]
      if (!((id >= 11000 && id < 20000) || (id >= 1e7 && id < 1.1e7)))
        delete data[name]
    }

    return data
  }

  const dictPromises = {
    chs: getDict("chs"),
    en: getDict("en"),
  }

  // 通过 <https://genshin-impact.fandom.com/wiki/User:Lnn031537128/Wish_List> 获取卡池数据（英文）
  const rawBannersData = await axios({
    url:
      "https://genshin-impact.fandom.com/api.php?action=expandtemplates" +
      "&prop=wikitext&format=json&formatversion=2" +
      `&text=${encodeURIComponent("{{User:Lnn031537128/Wish List}}")}`,
    responseType: "json",
  }).then(response => response.data.expandtemplates.wikitext)

  const enDict = await dictPromises.en
  const chsInvertedDict = invertDict(await dictPromises.chs)
  /** @param {string} name */
  function enToChs(name) {
    if (!enDict.hasOwnProperty(name))
      throw new Error(`Item name not found: '${name}'`)
    const id = enDict[name]
    if (!chsInvertedDict.hasOwnProperty(id))
      throw new Error(`Chinese name not found for item '${name}' (${id})`)
    return chsInvertedDict[id]
  }

  /**
   * @param {string} offset
   * @param {number} lineIndex
   * @param {string} prop
   */
  function assertTimeZoneAsia(offset, lineIndex, prop) {
    if (offset && offset !== "UTC+8" && offset !== "GMT+8")
      throw new Error(`Unexpected ${prop} of '${offset}' on line ${lineIndex}`)
  }

  /** @type {Banner[]} */
  const eventBanners = []
  /** @type {VersionHalf[]} */
  const versionHalves = []
  let currentVersion = ""
  let inSecondHalf = false
  for (const [i, line] of rawBannersData.split("\n").entries()) {
    if (!line) continue

    /** @type {Record<string, string>} */
    const info = Object.fromEntries(
      line
        .split(";")
        .filter(kvpair => kvpair)
        .map(kvpair => kvpair.split("=", 2))
    )
    if (!info.time_start) {
      console.warn(`Skipping line ${i} because pool start time is unknown`)
      continue
    }
    if (
      !info.featuring5 ||
      !info.featuring4 ||
      info.featuring5.includes("Unknown Character") ||
      info.featuring4.includes("Unknown Character")
    ) {
      console.warn(`Skipping line ${i} because pool contents not fully known`)
      continue
    }
    assertTimeZoneAsia(info.time_start_offset, i, "time_start_offset")
    assertTimeZoneAsia(info.time_end_offset, i, "time_end_offset")

    const type = info.gacha_type
    const start = info.time_start.replace(/ (09|10|11):.*/, "")
    const end = info.time_end
    const fiveStars = info.featuring5.split(",").map(enToChs)
    const fourStars = info.featuring4.split(",").map(enToChs)

    eventBanners.push({
      label: `${getEventBannerLabel(type, fiveStars)}池`,
      type,
      start,
      //startAbsolute: !!info.time_start_offset,
      end,
      //endAbsolute: !!info.time_end_offset,
      fiveStars,
      fourStars,
    })

    if (type === "302") {
      inSecondHalf = info.version === currentVersion
      currentVersion = info.version
      versionHalves.push({
        label: `${currentVersion} ${inSecondHalf ? "下半" : "上半"}`,
        start: start,
        end: inSecondHalf ? roundToDay(end) : `${end.split(" ")[0]} 18:00:00`,
      })
    }
  }
  eventBanners.sort((a, b) => {
    if (a.start < b.start) return -1
    if (a.start > b.start) return 1
    const aType = a.type === "400" ? "301-2" : a.type
    const bType = b.type === "400" ? "301-2" : b.type
    if (aType < bType) return -1
    if (aType > bType) return 1
    return 0
  })

  const stdBanners = []
  const stdFiveStars =
    /* prettier-ignore */ [
      "琴", "莫娜", "刻晴", "七七", "迪卢克",
      "天空之翼", "天空之卷", "天空之脊", "天空之傲", "天空之刃",
      "阿莫斯之弓", "四风原典", "和璞鸢", "狼的末路", "风鹰剑",
    ]
  const stdNewFiveStars = {
    "3.1 上半": ["提纳里"],
    "3.6 上半": ["迪希雅"],
  }

  {
    const addStdBanner = (start, end, fiveStars) => {
      stdBanners.push({
        label: "常驻池",
        type: "200",
        start,
        end,
        fiveStars,
        fourStars: null,
      })
    }
    let fiveStars = stdFiveStars
    let start = "2020-09-28"
    for (const [label, newFiveStars] of Object.entries(stdNewFiveStars)) {
      const end = versionHalves.find(vh => vh.label === label).start
      addStdBanner(start, end, fiveStars)
      fiveStars = fiveStars.concat(newFiveStars)
      start = end
    }
    addStdBanner(start, "9999-12-31", fiveStars)
  }

  const itemNames = {
    chs: chsInvertedDict,
  }

  return {
    versionHalves,
    eventBanners,
    stdBanners,
    itemNames,
  }
}

const outFile = path.normalize(
  `${path.dirname(process.argv[1])}/../site/banners.json`
)

const readOldPromise = fsp.readFile(outFile)
const makeDataPromise = makeBannerData()

let old
try {
  old = JSON.parse((await readOldPromise).toString())
} catch {}

const data = await makeDataPromise
await fsp.writeFile(outFile, JSON.stringify(data))

if (old) {
  const diff = jsonDiff.diffString(old, data, { maxElisions: 1 })
  if (diff) console.log(diff)
  else console.warn("no change to banners.json")
} else {
  console.warn("banners.json created")
}
