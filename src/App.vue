<template>
  <div id="app">
    <art-player class="player" :options="options"/>
  </div>
</template>

<script>
import ArtPlayer from './components/art-player.vue'

export default {
  name: 'App',
  components: {
    ArtPlayer
  },
  data() {
    return {
      options: {
        url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
      }
    }
  }
}
</script>

<style lang="scss">
.player{
  background-color: #333;
  max-height: 100vh;
}

</style>
