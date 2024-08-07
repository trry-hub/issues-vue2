<template>
  <keep-alive :include="include">
    <router-view />
  </keep-alive>
</template>

<script>
export default {
  name: 'EmptyLayout',
  computed: {
    include() {
      const keepAliveList = [
        'Layout'
      ]
      return keepAliveList
    }
  },
}
</script>
