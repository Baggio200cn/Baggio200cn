// 只展示关键改动：若你已使用我提供的最新 embed/app.js，将下面新增的 gParams.autoplay 解析与 onReady 里的 mute+play 放进去即可
// ...
function getParams() {
  const u = new URL(location.href);
  const p = {
    videoId: u.searchParams.get('videoId') || 'iG9CE55wbtY',
    en: u.searchParams.get('en') || '../ted/sample/en.srt',
    zh: u.searchParams.get('zh') || '../ted/sample/zh.srt',
    title: u.searchParams.get('title') || '示例演讲',
    zhGloss: u.searchParams.get('zhGloss') || '',
    compact: (u.searchParams.get('compact') || '') === '1',
    autoplay: (u.searchParams.get('autoplay') || '') === '1'   // 新增
  };
  // ... 略
  return p;
}
// 创建播放器时：
YTPlayer = new YT.Player('player', {
  videoId: gParams.videoId,
  playerVars: { rel:0, modestbranding:1, playsinline:1, controls:1, autoplay: gParams.autoplay ? 1 : 0 },
  events: {
    onReady: () => {
      tick();
      // 重要：静音+播放，才能通过浏览器的自动播放策略
      if (gParams.autoplay) {
        try { YTPlayer.mute(); YTPlayer.playVideo(); } catch(_) {}
      }
    },
    onStateChange: (e) => { if (e.data === YT.PlayerState.PAUSED) onPaused(); }
  }
});
