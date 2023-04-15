function last(arr) {
  return arr[arr.length - 1]
}

const perPage = 20
const typeNames = {
  "301": "角色",
  "400": "角色2",
  "302": "武器",
  "200": "常驻",
}
const types = ["301", "302", "200"]

function findParam(str, key) {
  const re = new RegExp(String.raw`(?:^|[?&])${key}=([^&]*)`)
  const match = str.match(re)
  return match ? decodeURIComponent(match[1]) : undefined
}

function makeQueryString(record) {
  return Object.entries(record)
    .map(e => e.map(encodeURIComponent).join("="))
    .join("&")
}

async function getHistory(urlStr) {
  let params = {}
  for (const key of ["authkey_ver", "sign_type", "auth_appid", "region", "authkey"]) {
    const val = findParam(urlStr, key)
    if (!val) throw `输入网址中缺失参数 ${key}`
    params[key] = val
  }
  params.lang = "zh-cn"
  params.size = perPage

  const host = urlStr.includes("hoyoverse")
    || params.region.startsWith("os")
    ? "hk4e-api-os.hoyoverse.com"
    : "hk4e-api.mihoyo.com"
  const baseURL = `proxy.php?https://${host}/event/gacha_info/api/getGachaLog`

  const pages = []
  for (const type of types) {
    let next = ""
    let page = 1
    const typeName = typeNames[type]

    params.gacha_type = type
    while (true) {
      params.page = page
      params.end_id = next
      log(`${typeName}池 第 ${page} 页…`)

      const resp = await fetch(`${baseURL}?${makeQueryString(params)}`)
      const json = await resp.text()
      const obj = JSON.parse(json)
      const list = obj.data.list
      pages.push(list)

      if (list.length < perPage) break
      next = last(list).id
      page++
    }
  }

  const data = Array.prototype.concat(...pages)
  data.reverse()
  data.sort((a, b) => a.time > b.time ? 1 : a.time < b.time ? -1 : 0)
  return data
}
//*
let fetch = function (url) {
  log(url)
  return new Promise(res => {
    setTimeout(() => {
      res({
        async text() {
          return JSON.stringify({
            data: {
              list: Array.from({length:Math.random() < 0.5 ? 20:1},()=>({time:Math.random(),id:Array.from({length:20},()=>~~(Math.random()*10)).join("")}))
            }
          })
        }
      })
    }, 1000)
  })
}
/**/
SoulLS.out = ""
function log(msg) {
  SoulLS.out += msg + "\n"
  SoulLS.$out.scrollBy(0, 999)
}

SoulLS.text = JSON.stringify(await getHistory("https://hk4e-api.os.hoyoverse.com/event/gacha_info/api/getGachaLog?win_mode=fullscreen&authkey_ver=1&sign_type=2&auth_appid=webview_gacha&init_type=301&gacha_id=6bb70a968c3ff75e0ead26ae707aa3c726053aa2&timestamp=1673997800&lang=zh-cn&device_type=mobile&game_version=OSRELiOS3.4.0_R12707997_S12671397_D12787608&plat_type=ios&region=os_asia&authkey=*****%2F*****&game_biz=hk4e_global"))
