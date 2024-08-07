<template>
  <div>
    <div class="page1">
      page1
      <input v-model="value" type="text">
    </div>

    <router-link to="/page1/child-page">child-page</router-link>
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  name: 'page1',
  components: {

  },
  props: {

  },
  data() {
    return {
      value: 'page1'
    }
  },
  computed: {

  },
  watch: {

  },
  created() {

  },
  mounted() {

  },
  methods: {

  }
}
</script>

<style scoped lang="scss">
// scss
.page1 {}
</style>
