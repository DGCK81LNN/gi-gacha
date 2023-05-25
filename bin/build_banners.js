#!/usr/bin/env node
const path = require("node:path")
const fsp = require("node:fs/promises")
const axios = require("axios").default

function normalizeTime(time) {
  return time.replace(/\//g, "-")
}

function tomorrow(ymd) {
  const date = new Date(`${ymd}+0000`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().split("T")[0]
}

function makeBannerData(input) {
  const minorVerCounts = [6, 8]
  const banners = []

  for (let [, s] of input.matchAll(
    /\{\{\s*祈愿\/(?:角色|武器)活动祈愿\s*\|([\s\S]+?)\}\}/g
  )) {
    let ver = s.match(/开始时间描述=(\d+\.\d+)/)?.[1]
    if (ver) {
      let [vmaj, vmin] = ver.split(".")
      if (!minorVerCounts[vmaj - 1]) minorVerCounts[vmaj - 1] = ~~vmin
    }
    banners.push({
      version: ver ? `${ver} 上半` : "",
      type: s.includes("武器")
        ? "302"
        : s.match(/期数=(.+)/)[1].includes("-2")
        ? "400"
        : "301",
      start: normalizeTime(
        s
          .match(/开始时间=(.+)/)[1]
          .replace(/(:\d\d):00/, "$1")
          .replace(/\/\d(?=\/|\s)/g, s => `/0${s[1]}`)
          .replace(/ 1[0-2]:\d\d/, "")
      ),
      end: normalizeTime(
        s
          .match(/结束时间=(.+)/)[1]
          .replace(
            /(\d\d):59:59?/,
            hour => `${(parseInt(hour) + 1).toString().padStart(2, "0")}:00`
          )
          .replace(/\/\d(?=\/)/g, s => "/0" + s[1])
      ),
      fiveStars: s.match(/5星.+?=(.+)/)[1].split("、"),
      fourStars: s.match(/4星.+?=(.+)/)[1].split("、"),
    })
  }
  banners.sort((a, b) => (a.start > b.start ? 1 : a.start < b.start ? -1 : 0))

  const verNums = []
  const verHalves = []
  for (const [x, n] of minorVerCounts.entries()) {
    for (let y = 0; y <= n; y++) {
      const ver = `${x + 1}.${y}`
      verNums.push(ver)
    }
  }

  {
    let ver = "1.0 上半"
    let start = banners[0].start
    for (let banner of banners) {
      if (banner.version) {
        ver = banner.version
      } else {
        if (banner.start !== start) {
          // next version-half
          if (banner.start.includes("18:00")) ver = ver.replace("上", "下")
          else ver = verNums[verNums.indexOf(ver.split(" ")[0]) + 1] + " 上半"
        }
        banner.version = ver
      }
      start = banner.start
    }
  }
  // 对 1.3 版本特殊处理，按武器池划分上下半
  delete banners.find(banner => banner.fiveStars[0] === "魈").version
  delete banners.find(banner => banner.fiveStars[0] === "刻晴").version

  for (const [i, ver] of verNums.entries()) {
    const half1Label = `${ver} 上半`
    const half2Label = `${ver} 下半`
    const half1Banner = banners.find(banner => banner.version === half1Label)
    const half2Banner = banners.find(banner => banner.version === half2Label)
    const nextVerFirstBanner =
      i + 1 < verNums.length
        ? banners.find(banner => banner.version === `${verNums[i + 1]} 上半`)
        : null

    verHalves.push({
      label: half1Label,
      start: half1Banner.start,
      end: half2Banner
        ? half2Banner.start
        : half1Banner.end.split(" ")[0] + " 18:00",
    })
    if (!half2Banner) break
    verHalves.push({
      label: half2Label,
      start: half2Banner.start,
      end: nextVerFirstBanner
        ? nextVerFirstBanner.start
        : tomorrow(half2Banner.end),
    })
  }

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
    let fiveStars = stdFiveStars
    let start = "2020-09-28"
    for (const [label, newFiveStars] of Object.entries(stdNewFiveStars)) {
      const end = verHalves.find(verHalf => verHalf.label === label).start
      addStdBanner(start, end, fiveStars)
      fiveStars = fiveStars.concat(newFiveStars)
      start = end
    }
    addStdBanner(start, "9999-12-31", fiveStars)
  }
  function addStdBanner(start, end, fiveStars) {
    stdBanners.push({
      label: "常驻池",
      type: "200",
      start: normalizeTime(start),
      end: normalizeTime(end),
      fiveStars,
      fourStars: null,
    })
  }

  return JSON.stringify(
    {
      versionHalves: verHalves,
      eventBanners: banners.map(banner => ({
        label: `${
          banner.type === "302"
            ? "武器"
            : {
                达达利亚: "公子",
                雷电将军: "雷神",
                纳西妲: "草神",
                流浪者: "散兵",
              }[banner.fiveStars[0]] ||
              banner.fiveStars[0].slice(banner.fiveStars[0].length > 3 ? -2 : 0)
        }池`,
        type: banner.type,
        start: banner.start,
        end: banner.end,
        fiveStars: banner.fiveStars,
        fourStars: banner.fourStars,
      })),
      stdBanners,
    },
    null,
    2
  )
}

async function main(outFile) {
  const resp = await axios({
    url: "https://wiki.biligame.com/ys/祈愿?action=raw",
    responseType: "text",
  })
  const text = resp.data
  const json = makeBannerData(text)
  await fsp.writeFile(outFile, json)
}

process.chdir(path.dirname(process.argv[1]))

main("../site/banners.json")
  .then(() => {
    console.warn("Result saved")
  })
  .catch(err => {
    console.error(err)
    if (err instanceof Error) console.error(err.stack)
    console.error("\nBanners update failed")
  })
