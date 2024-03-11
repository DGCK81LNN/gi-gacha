type GachaType = "100" | "200" | "301" | "302" | "400" | "500"
type UIGFGachaType = "100" | "200" | "301" | "302" | "500"
type GachaTypeName = "char" | "weapon" | "chronicled" | "std" | "novice"
type PityType = "char" | "charLost5050" | "weapon" | "chronicled" | "std"
type Rarity = "3" | "4" | "5"
type Language =
  | "chs"
  | "cht"
  | "de"
  | "en"
  | "es"
  | "fr"
  | "id"
  | "jp"
  | "kr"
  | "pt"
  | "ru"
  | "th"
  | "vi"
interface GachaEntry {
  count: number
  id: string
  item_type: string
  gacha_type: GachaType
  item_id: number
  name: string
  rank_type: Rarity
  time: string
  uigf_gacha_type: UIGFGachaType
}
interface VersionHalf {
  label: string
  start: string
  end: string
}
interface Banner {
  label: string
  start: string
  //startAbsolute: boolean
  end: string
  //endAbsolute: boolean
  fiveStars: string[]
  fourStars: string[]
}
interface UIGFMergedHistory {
  info: {
    uid: string
    lang: string
    export_timestamp?: number
    export_app?: string
    export_app_version?: string
    uigf_version?: string
    region_time_zone?: number
  }
  list: GachaEntry[]
}
