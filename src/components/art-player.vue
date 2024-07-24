<template>
  <div ref="artRef" class="artplayer-app" />
</template>

<script>
import Artplayer from 'artplayer/dist/artplayer.legacy'
import { merge } from 'lodash-es'
import phSubtitlesBoldShowSvg from '@/assets/icons/ph--subtitles-bold-show.svg'
import phSubtitlesBoldHideSvg from '@/assets/icons/ph--subtitles-bold-hide.svg'

export default {
  name: 'art-player',
  props: {
    options: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      theme: '#3d61e3',
      artRef: null,
      art: null
    }
  },
  computed: {
    defaultOpt() {
      return {
        theme: this.theme,
        hotkey: true,
        mutex: true,
        fullscreen: true,
        miniProgressBar: true,
        autoSize: true,
        playsInline: true,
        playbackRate: true,
        setting: true,
        subtitle: {
          type: 'vtt',
          encoding: 'utf-8',
          escape: true,
          style: {
            fontSize: '1em'
          }
        },
        lock: true,
        autoOrientation: true,
        autoPlayback: true
      }
    }
  },
  mounted() {
    console.log('this.options.url: ', this.options.url)
    if(this.options.url){
      this.loadPlayer()
    }
  },
  beforeDestroy() {
    if (this.art && this.art.destroy) {
      this.art.destroy(false)
    }
  },
  methods: {
    updateIcon(isShowing) {
      const iconElement = document.getElementById('subtitle-icon')
      if (iconElement) {
        iconElement.innerHTML = isShowing ? phSubtitlesBoldShowSvg : phSubtitlesBoldHideSvg
      }
    },
    updateTooltip(isShowing) {
      const iconElement = document.getElementById('subtitle-icon')
      if (iconElement && iconElement.parentElement) {
        iconElement.parentElement.setAttribute('aria-label', isShowing ? '关闭字幕' : '打开字幕')
      }
    },
    loadPlayer() {
      Artplayer.CONTROL_HIDE_TIME = 1500
      Artplayer.CONTEXTMENU = false
      const mergedOptions = merge(this.defaultOpt, this.options, { container: this.$el })

      if (mergedOptions.subtitle && mergedOptions.subtitle.url) {
        mergedOptions.controls = [
          {
            position: 'right',
            html: `<i class="art-icon" id="subtitle-icon">${phSubtitlesBoldShowSvg}</i>`,
            tooltip: '显示字幕',
            click(M) {
              M.art.subtitle.show = !M.art.subtitle.show
              this.updateIcon(M.art.subtitle.show)
              this.updateTooltip(M.art.subtitle.show)
            }
          }
        ]
      }

      this.art = new Artplayer(mergedOptions)
    }
  }
}
</script>

<style scoped lang="scss">
.artplayer-app {
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: 16/9;
  height: 230px;
  margin: 0 auto;
  border-radius: 5px;
}
</style>
