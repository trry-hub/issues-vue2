<template>
  <keep-alive :include="include">
    <router-view v-wechat-title="title" />
  </keep-alive>
</template>

<script>
export default {
  name: 'EmptyLayout',
  computed: {
    title() {
      return this.$store.state.user.pageTitle || this.$route.meta.title
    },
    include() {
      const keepAliveList = [
        'Academic',
      ]
      return keepAliveList
    }
  },
  watch: {
    '$route.matched': function(val) {
      console.log(val.map(item => item.components.default.name))
    }
  }
}
</script>
