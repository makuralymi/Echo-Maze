# Toy JS SDK 能力清单

> 版本：1.4.0 ｜ 更新时间：2026-07-29

Toy JS SDK 为你的 Toy 页面提供与 B站 App / Web 环境交互的能力。

> ⚠️ **数据使用限制**：SDK 仅根据您实际需求，向您的Toy页面传输判定信息并展示对应差异化功能。所有用户相关数据将不会向您传输。

## 接入方式

在 HTML 的 `<head>` 中添加：

```html
<script src="//s1.hdslb.com/bfs/seed/toy/app/sdk/toy-sdk.js"></script>
```

加载后全局可用 `window.toy` 对象，所有方法返回 Promise。用户与作者数据、云存储和排行榜在 B站 App/Web 统一走 HTTP API；导航、保存图片、关闭页面等端能力在 App 内走 JSB。

## 能力列表

### toy.isSupport(ability)

判断当前环境是否支持指定能力。

参数：
- `ability`: string（必填）- 能力名称：navigate | saveImageToAlbum | closeBrowser | getUserProfile | reportAction | getCloudStorage | setCloudStorage | removeCloudStorage | getAuthorProfile | getAuthorVideos | getAuthorRelation | getVideoUserActions | submitScore | getRankList | getMyRank | requestCamera | requestMicrophone | stopMedia

返回值：`Promise<boolean>`

```js
const ok = await toy.isSupport('saveImageToAlbum')
if (ok) {
  toy.saveImageToAlbum({ url: '...' })
}
```

### toy.navigate(req)

跳转到指定页面（需用户手势触发）。

参数：
- `type`: string（必填）- 页面类型：video | space | search | opus | tribee | toy
- `id`: string（必填）- 资源 ID，如视频 BV 号、用户 mid、动态 id
- `extra`: Record<string, string>（可选）- 额外参数，透传给目标页面

返回值：`Promise<void>`

```js
await toy.navigate({
  type: 'video',
  id: 'BV1Hh411S7Ys',
  extra: { from: 'toy' }
})
```

### toy.saveImageToAlbum(req)

保存图片到相册（仅 B站 App 内）。

参数：
- `url`: string（可选）- 网络图片地址，与 base64Data 二选一
- `base64Data`: string（可选）- base64 图片数据，最大 2M，与 url 二选一
- `hintMsg`: string（可选）- 申请相册权限时的提示文案

返回值：`Promise<{ localPath: string }>`

```js
await toy.saveImageToAlbum({
  url: 'https://i0.hdslb.com/bfs/archive/example.jpg',
  hintMsg: '需要相册权限来保存图片'
})
```

### toy.closeBrowser()

关闭当前 WebView 容器（仅 B站 App 内）。

返回值：`Promise<void>`

```js
await toy.closeBrowser()
```

### toy.getUserProfile()

获取当前用户头像和昵称。首次调用需由用户操作触发，并由平台完成用户数据确认。

返回值：`Promise<{ avatar: string, nickname: string }>`

```js
const { avatar, nickname } = await toy.getUserProfile()
```

### toy.getAuthorProfile()

获取当前 Toy 作者的公开资料、账号统计、稿件数、充电聚合和粉丝勋章配置，不允许指定作者 ID。

返回值：`Promise<AuthorProfileResp>`

```js
const result = await toy.getAuthorProfile()
if (result.status === 'ok') {
  console.log(result.data.nickname, result.data.follower)
}
```

### toy.getAuthorVideos(req)

批量获取当前 Toy 作者的视频公开信息；非当前作者或不可见视频不会返回标题、封面和统计。

参数：
- `videos`: Array<{ aid: number } | { bvid: string }>（必填）- 1–50 项，每项只能传 aid 或 bvid；SDK 去重并保留首次出现顺序

返回值：`Promise<AuthorVideosResp>`

```js
const result = await toy.getAuthorVideos({
  videos: [{ aid: 170001 }, { bvid: 'BV17x411w7KC' }]
})
```

### toy.getAuthorRelation()

获取当前访问用户与当前 Toy 作者的关注、老粉、粉丝勋章状态，以及当前是否正在对该作者进行包月充电。

返回值：`Promise<AuthorRelationResp>`

```js
const result = await toy.getAuthorRelation()
if (result.status === 'ok') {
  console.log(result.data.isFollowing, result.data.hasFanMedal)
}
```

### toy.getVideoUserActions(req)

获取当前访问用户对当前作者视频的点赞、投币和收藏状态；只校验登录态，不触发用户数据确认弹窗。

参数：
- `aids`: number[]（必填）- 1–50 个正整数 aid；SDK 去重并保留首次出现顺序

返回值：`Promise<VideoUserActionsResp>`

```js
const result = await toy.getVideoUserActions({ aids: [170001, 455017605] })
result.items.forEach(item => {
  if (item.status === 'ok') console.log(item.liked, item.coinCount, item.favorited)
})
```

### toy.setCloudStorage(items)

批量写入云存储（upsert），同 key 覆盖旧值。按「登录用户 + Toy」隔离，需用户已登录，但不触发用户数据确认。单个 Toy 最多存储 128 个 key-value。

参数：
- `items`: Record<string, string>（必填）- key/value 键值对。key 只能含字母、数字、下划线和短横线，≤128 字节，且不能以 __ 开头；value 为字符串，≤1024 字节，存对象请自行 JSON.stringify

返回值：`Promise<void>`

```js
await toy.setCloudStorage({ coins: '100', level: '5' })
```

### toy.getCloudStorage(keys?)

读取云存储。不传 keys 读取当前用户在该 toy 下的全部数据；未命中的 key 不出现在结果中。

参数：
- `keys`: string[]（可选）- 要读取的 key 列表，不能以 __ 开头；不传或空数组表示读取全部（平台保留 key 不会返回）

返回值：`Promise<Record<string, string>>`

```js
// 读取指定 key
const { coins } = await toy.getCloudStorage(['coins'])
// 读取全部
const all = await toy.getCloudStorage()
```

### toy.removeCloudStorage(keys)

批量删除云存储中指定的 key。

参数：
- `keys`: string[]（必填）- 要删除的 key 列表，不能以 __ 开头

返回值：`Promise<void>`

```js
await toy.removeCloudStorage(['level'])
```

### toy.submitScore(req)

上报分数到排行榜（需用户已登录，首次提交前由平台完成用户数据确认）。按「toy + 榜位 + 周期」隔离。返回我的总榜分数。

参数：
- `board`: number（可选）- 榜位，固定 1 / 2 / 3，含义由 toy 自定义（如金币榜 / 关卡榜），不传默认 1
- `score`: number（必填）- 本次成绩的绝对分数，不是相对已有成绩的增量。服务端只保留该用户在该榜位的历史最高分：本次 score 高于历史最高才更新，否则保持不变（不会覆盖成更低分）。整数，取值范围 -16777216 ~ 16777215（约 ±1677 万），允许 0 和负数（支撑差值 / 亏损类榜）

返回值：`Promise<{ score: number }>`

```js
// board 不传默认 1；只用单一榜位时可省略
const { score } = await toy.submitScore({ board: 1, score: 100 })
```

### toy.getRankList(req?)

读取榜单（游客可读）。返回前 limit 名，固定从高到低；同分时先达成者靠前（先到先赢），名次唯一、不并列。

参数：
- `board`: number（可选）- 榜位，固定 1 / 2 / 3，不传默认 1
- `period`: 'all' | 'month' | 'week' | 'day'（可选）- 周期：all（总榜，永久）/ month / week / day，不传按 all
- `limit`: number（可选）- 返回名次数量，不传或超上限按后端默认（≤100）

返回值：`Promise<RankItem[]>（RankItem: { rank, score, nickname, avatar }）`

```js
// board 不传默认 1，只用单一榜位时可省略
const list = await toy.getRankList({ board: 1, period: 'week', limit: 50 })
// list: [{ rank: 1, score: 999, nickname: '张三', avatar: '//p0.hdslb.com/...' }, ...]
```

### toy.getMyRank(req?)

查询我在指定榜单的排名（需用户已登录）。是否上榜必须用 ranked 字段判断，不能用 score（分数允许为 0 / 负）。

参数：
- `board`: number（可选）- 榜位，固定 1 / 2 / 3，不传默认 1
- `period`: 'all' | 'month' | 'week' | 'day'（可选）- 周期：all / month / week / day，不传按 all

返回值：`Promise<{ ranked: boolean, rank: number, score: number }>（未上榜 ranked=false，rank/score 为 0）`

```js
// board 不传默认 1，period 不传按总榜
const mine = await toy.getMyRank({ board: 1, period: 'week' })
// mine: { ranked: true, rank: 12, score: 88 }
```

### toy.requestCamera(options?)

申请摄像头业务授权和系统权限，并返回中继的浏览器原生 MediaStream；必须由用户手势触发。

参数：
- `options.facingMode`: 'user' | 'environment'（可选）- 前置或后置摄像头，默认 user

返回值：`Promise<MediaStream>`

```js
const stream = await toy.requestCamera({ facingMode: 'environment' })
videoEl.srcObject = stream
```

### toy.requestMicrophone()

申请麦克风业务授权和系统权限，并返回中继的浏览器原生 MediaStream；必须由用户手势触发。

返回值：`Promise<MediaStream>`

```js
const stream = await toy.requestMicrophone()
audioEl.srcObject = stream
```

### toy.stopMedia(stream)

停止指定媒体中继并关闭父页采集设备；使用完摄像头或麦克风后必须调用。

参数：
- `stream`: MediaStream（必填）- requestCamera 或 requestMicrophone 返回的媒体流

返回值：`Promise<void>`

```js
await toy.stopMedia(stream)
```

## 环境支持

| 方法 | B站 App | Web 端 |
|------|---------|--------|
| isSupport | ✅ | ✅ |
| navigate | ✅ | ✅ |
| saveImageToAlbum | ✅ | ❌ |
| closeBrowser | ✅ | ❌ |
| getUserProfile | ✅ | ✅ |
| getAuthorProfile | ✅ | ✅ |
| getAuthorVideos | ✅ | ✅ |
| getAuthorRelation | ✅ | ✅ |
| getVideoUserActions | ✅ | ✅ |
| setCloudStorage | ✅ | ✅ |
| getCloudStorage | ✅ | ✅ |
| removeCloudStorage | ✅ | ✅ |
| submitScore | ✅ | ✅ |
| getRankList | ✅ | ✅ |
| getMyRank | ✅ | ✅ |
| requestCamera | ✅ | ✅ |
| requestMicrophone | ✅ | ✅ |
| stopMedia | ✅ | ✅ |

## 注意事项

- Web 端不支持的方法调用后会抛出错误，建议先用 `isSupport` 判断当前环境是否支持再调用。
- 所有错误都带 `[ToySDK]` 前缀，便于排查。
- `navigate` 必须在用户手势事件（如 click）中调用，否则会被拦截。
- `getUserProfile` 首次调用由平台展示固定用户数据确认弹窗，Toy 不能自定义弹窗内容。
- 作者互动关系和视频互动数据只校验登录态，不触发用户数据确认弹窗；只返回业务字段与稳定状态，不返回 UID、MID、登录令牌或用户数据确认挑战值。外部手机浏览器返回 `unsupported` 并引导打开 B站 App。
- 生图类 Toy 保存图片：B站 App 内用 `saveImageToAlbum` 保存到系统相册；Web 端（桌面 / 手机浏览器）该方法不支持，请用标准浏览器下载能力（`<a download>` 或 canvas blob URL，需用户点击触发）。Web 端支持由用户主动点击触发的图片下载，无需额外配置。
- 云存储（`getCloudStorage` / `setCloudStorage` / `removeCloudStorage`）：需用户已登录，按「登录用户 + Toy」双维度隔离，跟随登录态跨设备持久化，但不触发用户数据确认。value 为字符串，存对象请自行 `JSON.stringify` / `JSON.parse`。写入 / 删除失败时 Promise 会 reject，请用 `try/catch` 处理。
- 云存储容量限制：单个 Toy 最多存储 128 个 key-value；key 只能含字母、数字、下划线和短横线，≤128 字节；value ≤1024 字节。超出均由服务端拦截返回错误。
- 云存储中以 `__` 开头的 key 为平台保留 key，Toy 不能读取、写入或删除。
- 排行榜（`submitScore` / `getRankList` / `getMyRank`）：按「toy + 榜位 board + 周期 period」隔离，跟随登录态跨设备持久化，端内端外均走 HTTP、行为一致。board 固定 1 / 2 / 3（含义由 toy 自定义），不传默认 1；period 为 all / month / week / day，不传按 all（总榜，永久）。
- 排行榜分数：整数，取值范围 -16777216 ~ 16777215，允许 0 / 负数；排序固定从高到低，同分时先达成者靠前（先到先赢），名次唯一、不并列。
- `submitScore` / `getMyRank` 需用户已登录，`submitScore` 首次提交前由平台完成用户数据确认，`getRankList` 游客可读；`getMyRank` 判断是否上榜必须用 `ranked` 字段，不能用 `score`。失败（未登录、参数非法等）时 Promise 会 reject，请用 `try/catch` 处理。
- 媒体能力已在 B站 App 和 Web 端公开。摄像头与麦克风分别通过 `requestCamera`、`requestMicrophone` 独立申请业务授权和系统权限；前者仅接受 facingMode，后者不接受参数；两者必须由用户手势触发，实际结果仍受系统权限和设备状态影响。
- 使用摄像头或麦克风结束后必须调用 `stopMedia`，确认媒体轨道停止并释放设备。
